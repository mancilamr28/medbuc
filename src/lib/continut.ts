import { OPTION_KEYS, type OptionKey, type Question, type QuestionSursa, type QuestionType } from '../data/questions';
import type { ChapterId, MaterieId } from '../data/chapters';
import {
  TAXONOMIE_GOALA,
  construiesteTaxonomie,
  type RandCapitol,
  type RandMaterie,
  type Taxonomie,
} from './taxonomie';
import { construiesteTipuri, type RandTip, type TipuriGrile } from './tipuriGrile';
import { construiesteColectii, type Colectii, type RandColectie } from './colectii';
import { citesteTot } from './paginare';

/**
 * Biblioteca de grile, citită din Supabase.
 *
 * Până acum `QUESTIONS` din `src/data/questions.ts` era adevărul la runtime — un
 * array compilat în bundle, deci orice grilă nouă cerea un deploy. De aici încolo
 * baza e adevărul, iar fișierul acela rămâne doar sursă pentru `npm run seed` și
 * fixtură de test. Vezi `CLAUDE.md`.
 *
 * **Capitolele nu se mută.** Rămân în `src/data/chapters.ts`, fiindcă pagina
 * publică le numără (`Cifre`, `Capabilitati`, `PreviewCapitole`) și se randează
 * fără sesiune, iar politica de citire pe `chapters` e dată lui `authenticated`.
 * Sunt vreo treizeci și nu se schimbă; se adaugă prin migrare, ca până acum. Un
 * `capId` ajuns în bază fără pereche în fișier își arată id-ul brut în interfață
 * (`chapterLabelById` cade pe id), ceea ce e vizibil și reparabil — nu tăcut.
 */

export type QuestionStatus = 'ciorna' | 'publicata' | 'retrasa';

/** O grilă așa cum o vede administratorul: cu starea ei. */
export interface GrilaCuStare extends Question {
  status: QuestionStatus;
}

/** Rândul brut, așa cum vine de la PostgREST cu variantele încorporate. */
export interface RandGrila {
  id: string;
  chapter_id: string;
  tip: string | null;
  tip_id: string;
  status: string;
  text: string;
  enunturi: string[] | null;
  correct: string;
  expl: string;
  src: string;
  sursa: string;
  an: number | null;
  colectie_id: string | null;
  question_options: { key: string; text: string; why: string | null }[] | null;
}

/**
 * Între `questions` și `question_options` sunt **două** chei externe: cea
 * obișnuită, de mai jos, și `questions_correct_exists`, care merge invers —
 * `questions (id, correct)` → `question_options (question_id, key)`, constrângerea
 * amânată care apără răspunsul corect. PostgREST nu poate alege singur și refuză
 * cererea cu „more than one relationship was found", deci relația se numește.
 *
 * Nu se putea prinde în teste: PGlite rulează SQL direct, fără PostgREST, deci
 * ambiguitatea nu există acolo. A ieșit la iveală abia pe site-ul publicat.
 * `schema.test.ts` verifică acum că numele de mai jos chiar există în schemă.
 */
export const FK_VARIANTE = 'question_options_question_id_fkey';

const CAMPURI = `id, chapter_id, tip, status, text, enunturi, correct, expl, src, sursa, an, colectie_id, tip_id, question_options!${FK_VARIANTE}(key, text, why)`;

/**
 * Pură peste rândul primit, ca să poată fi testată fără rețea.
 *
 * Variantele vin în orice ordine de la Postgres — nu există `order by` pe o
 * resursă încorporată fără să-l ceri — deci se sortează aici, după alfabetul
 * literelor, nu după cum s-a nimerit în tabel.
 */
export function mapeazaGrila(rand: RandGrila): GrilaCuStare {
  const variante = (rand.question_options ?? [])
    .filter((o): o is { key: OptionKey; text: string; why: string | null } =>
      (OPTION_KEYS as string[]).includes(o.key),
    )
    .sort((a, b) => OPTION_KEYS.indexOf(a.key) - OPTION_KEYS.indexOf(b.key));

  const why: Partial<Record<OptionKey, string>> = {};
  for (const o of variante) if (o.why) why[o.key] = o.why;

  return {
    id: rand.id,
    tip: rand.tip_id,
    capId: rand.chapter_id as ChapterId,
    text: rand.text,
    ...(rand.enunturi ? { enunturi: rand.enunturi } : {}),
    opts: variante.map((o) => [o.key, o.text] as [OptionKey, string]),
    correct: rand.correct as OptionKey,
    expl: rand.expl,
    why,
    src: rand.src,
    sursa: rand.sursa as QuestionSursa,
    colectieId: rand.colectie_id ?? '',
    ...(rand.an !== null ? { an: rand.an } : {}),
    status: rand.status as QuestionStatus,
  };
}

/**
 * Tot ce are voie contul să vadă. Filtrarea nu se face aici: politica
 * `questions_citire` întoarce doar grilele publicate elevilor și tot ce există
 * administratorilor, deci aceeași interogare dă mulțimea corectă fiecăruia.
 */
export async function incarcaGrile(): Promise<GrilaCuStare[]> {
  const { supabase } = await import('./supabase');
  const randuri = await citesteTot<RandGrila>(async (de, la) => {
    const r = await supabase
      .from('questions')
      .select(CAMPURI, { count: 'exact' })
      .order('id')
      .range(de, la);
    return { data: r.data as unknown as RandGrila[] | null, error: r.error, count: r.count };
  });
  return randuri.map(mapeazaGrila);
}

/**
 * Câte grile are fiecare capitol, respectiv fiecare materie.
 *
 * Pure peste banca primită, nu hărți la nivel de modul cum erau în
 * `data/questions.ts`: banca se schimbă acum la runtime, deci numărătoarea nu
 * mai poate fi construită o dată, la import. Materia se citește din capitol —
 * `Chapter` o poartă explicit — nu din prefixul id-ului.
 */
export function numaraGrile(
  questions: Question[],
  taxonomie: Taxonomie = TAXONOMIE_GOALA,
): {
  peCapitol: ReadonlyMap<ChapterId, number>;
  peMaterie: ReadonlyMap<MaterieId, number>;
} {
  const peCapitol = new Map<ChapterId, number>();
  const peMaterie = new Map<MaterieId, number>();

  for (const q of questions) {
    peCapitol.set(q.capId, (peCapitol.get(q.capId) ?? 0) + 1);
    const materie = taxonomie.capitol(q.capId)?.materie;
    if (materie) peMaterie.set(materie, (peMaterie.get(materie) ?? 0) + 1);
  }

  return { peCapitol, peMaterie };
}

/** Ce trimite formularul din Admin către `salveaza_grila`. */
export interface GrilaDeSalvat {
  id: string;
  capId: ChapterId;
  tip: QuestionType;
  status: QuestionStatus;
  text: string;
  enunturi?: string[];
  correct: OptionKey;
  expl: string;
  src: string;
  sursa: QuestionSursa;
  an?: number;
  /** Id-ul colecției, sau gol. Cheia se numește `colectie` și în payload-ul RPC. */
  colectie: string;
  opts: { key: OptionKey; text: string; why?: string }[];
}

/**
 * Salvarea trece printr-un RPC, nu prin două cereri.
 *
 * `questions_correct_exists` e amânată la COMMIT, iar `questions` și
 * `question_options` se referă circular: prin PostgREST, unde fiecare cerere e
 * propria tranzacție, nicio ordine de două cereri nu trece. Vezi migrarea 0006.
 */
export async function salveazaGrila(grila: GrilaDeSalvat): Promise<void> {
  const { supabase } = await import('./supabase');
  const { error } = await supabase.rpc('salveaza_grila', { payload: grila });
  if (error) throw new Error(error.message);
}

export async function stergeGrila(id: string): Promise<void> {
  const { supabase } = await import('./supabase');
  const { error } = await supabase.rpc('sterge_grila', { grila_id: id });
  if (error) throw new Error(error.message);
}

/**
 * Materiile și capitolele, din bază.
 *
 * Stă aici, lângă `incarcaGrile`, nu în `lib/taxonomie.ts`: modulul acela e pur
 * și e importat de generatorul de seed prin esbuild cu `platform: 'neutral'`,
 * unde un `import('./supabase')` — chiar dinamic — trage tot clientul în bundle
 * și oprește `npm run seed`.
 *
 * Merge și fără sesiune: politicile `materii_publice` și `chapters_publice`
 * (migrarea 0009) dau vizitatorului taxonomia publicată, ca pagina de prezentare
 * să poată număra capitole fără să mintă.
 */
export async function incarcaTaxonomie(): Promise<Taxonomie> {
  const { supabase } = await import('./supabase');

  const [materii, capitole] = await Promise.all([
    citesteTot<RandMaterie>(async (de, la) => {
      const r = await supabase
        .from('materii')
        .select('id,name,position', { count: 'exact' })
        .order('position')
        .range(de, la);
      return { data: r.data as RandMaterie[] | null, error: r.error, count: r.count };
    }),
    citesteTot<RandCapitol>(async (de, la) => {
      const r = await supabase
        .from('chapters')
        .select('id,materie_id,nr,name,position', { count: 'exact' })
        .order('position')
        .range(de, la);
      return { data: r.data as RandCapitol[] | null, error: r.error, count: r.count };
    }),
  ]);

  return construiesteTaxonomie(materii, capitole);
}

/** Tipurile de grilă, din bază. Aici, nu în `tipuriGrile.ts`, din același motiv ca taxonomia. */
export async function incarcaTipuri(): Promise<TipuriGrile> {
  const { supabase } = await import('./supabase');

  const randuri = await citesteTot<RandTip>(async (de, la) => {
    const r = await supabase
      .from('question_types')
      .select(
        'id,nume,descriere,sablon_optiuni,nr_optiuni_min,nr_optiuni_max,permite_amestecare,cere_enunturi,nr_enunturi,hint_randare,position',
        { count: 'exact' },
      )
      .order('position')
      .range(de, la);
    return { data: r.data as RandTip[] | null, error: r.error, count: r.count };
  });

  return construiesteTipuri(randuri);
}

/** Colecțiile, din bază. Aici, nu în `colectii.ts`, din același motiv ca taxonomia. */
export async function incarcaColectii(): Promise<Colectii> {
  const { supabase } = await import('./supabase');

  const randuri = await citesteTot<RandColectie>(async (de, la) => {
    const r = await supabase
      .from('colectii')
      .select('id,centru_id,nume,tip,an,sursa_bibliografica,position', { count: 'exact' })
      .order('position')
      .range(de, la);
    return { data: r.data as RandColectie[] | null, error: r.error, count: r.count };
  });

  return construiesteColectii(randuri);
}

// ---------------------------------------------------------------------------
// Căutarea din Administrare.
//
// Lista din Administrare citea `useContent().grile` — adică biblioteca întreagă,
// deja adusă în memorie — și filtra cu `Array.filter`. Merge la 181 de grile și
// nu mai merge deloc la douăzeci de mii: nu doar din cauza randării, ci fiindcă
// fiecare deschidere a ecranului ar transfera zeci de megaocteți, cu toate
// variantele și explicațiile lor.
//
// Filtrarea se mută pe server. Nu e nevoie de un RPC nou: PostgREST știe să
// filtreze, să numere și să pagineze, iar `questions_citire` face deja diferența
// dintre elev și administrator — o funcție `security definer` ar fi trebuit să
// reimplementeze regula aia pe cont propriu.
//
// Materia nu e o coloană pe `questions`, ci pe capitol. Nu se rezolvă cu un join
// aici: clientul are deja taxonomia și transformă „materia bio" în lista de
// capitole ale ei, deci filtrul rămâne o singură condiție `in`.
// ---------------------------------------------------------------------------

export interface FiltreGrile {
  /** Caută în id și în enunț. Gol înseamnă fără restricție. */
  cautare: string;
  status: QuestionStatus | 'toate';
  /** Capitolele cerute; gol înseamnă toate — aceeași convenție ca peste tot. */
  capitole: ChapterId[];
  colectieId: string;
  tipId: string;
  sursa: QuestionSursa | '';
}

export const FILTRE_GOALE: FiltreGrile = {
  cautare: '',
  status: 'toate',
  capitole: [],
  colectieId: '',
  tipId: '',
  sursa: '',
};

export interface PaginaGrile {
  randuri: GrilaCuStare[];
  /** Câte grile trec de filtru, nu câte s-au adus în pagina asta. */
  total: number;
}

/** `%` și `_` sunt metacaractere în `ilike`; fără scăpare, o căutare cu `%` ar da tot. */
/**
 * Tiparul de căutare, gata de pus într-un `or=(...)` PostgREST.
 *
 * Două scăpări suprapuse, în ordinea asta:
 *
 * 1. `%` și `_` sunt metacaractere `ilike` — fără scăpare, o căutare cu `%` ar
 *    întoarce toată biblioteca: un rezultat greșit care arată ca unul corect.
 * 2. Virgula și parantezele despart termenii într-un `or=(...)`, deci valoarea
 *    se pune între ghilimele. Fara ele, o căutare după textul variantelor unui
 *    complement grupat — care chiar conține virgule — primește 400.
 *
 * Verificat pe serverul real: nescăpată dă `PGRST100 failed to parse logic
 * tree`, scăpată dă 200.
 */
export const pentruIlike = (q: string): string => {
  const ilike = q.replace(/[\\%_]/g, (m) => `\\${m}`);
  const citat = ilike.replace(/[\\"]/g, (m) => `\\${m}`);
  return `"%${citat}%"`;
};

export async function cautaGrile(
  filtre: FiltreGrile,
  decalaj: number,
  limita: number,
): Promise<PaginaGrile> {
  const { supabase } = await import('./supabase');

  let q = supabase.from('questions').select(CAMPURI, { count: 'exact' });

  const cautare = filtre.cautare.trim();
  if (cautare !== '') {
    const tipar = pentruIlike(cautare);
    q = q.or(`id.ilike.${tipar},text.ilike.${tipar}`);
  }
  if (filtre.status !== 'toate') q = q.eq('status', filtre.status);
  if (filtre.capitole.length > 0) q = q.in('chapter_id', filtre.capitole);
  if (filtre.colectieId !== '') q = q.eq('colectie_id', filtre.colectieId);
  if (filtre.tipId !== '') q = q.eq('tip_id', filtre.tipId);
  if (filtre.sursa !== '') q = q.eq('sursa', filtre.sursa);

  const r = await q.order('id').range(decalaj, decalaj + limita - 1);
  if (r.error) throw new Error(r.error.message);

  return {
    randuri: ((r.data ?? []) as unknown as RandGrila[]).map(mapeazaGrila),
    total: r.count ?? 0,
  };
}

/**
 * Câte grile are fiecare stare, pentru filtrul curent.
 *
 * Trei numărători, nu o listă adusă și grupată în client: `head: true` cere
 * numai antetul cu totalul, deci nu se transferă niciun rând.
 */
export async function numaraPeStare(
  filtre: FiltreGrile,
): Promise<Record<QuestionStatus, number>> {
  const { supabase } = await import('./supabase');
  const stari: QuestionStatus[] = ['ciorna', 'publicata', 'retrasa'];

  const perechi = await Promise.all(
    stari.map(async (stare) => {
      let q = supabase.from('questions').select('id', { count: 'exact', head: true }).eq('status', stare);

      const cautare = filtre.cautare.trim();
      if (cautare !== '') {
        const tipar = pentruIlike(cautare);
        q = q.or(`id.ilike.${tipar},text.ilike.${tipar}`);
      }
      if (filtre.capitole.length > 0) q = q.in('chapter_id', filtre.capitole);
      if (filtre.colectieId !== '') q = q.eq('colectie_id', filtre.colectieId);
      if (filtre.tipId !== '') q = q.eq('tip_id', filtre.tipId);
      if (filtre.sursa !== '') q = q.eq('sursa', filtre.sursa);

      const r = await q;
      if (r.error) throw new Error(r.error.message);
      return [stare, r.count ?? 0] as const;
    }),
  );

  return Object.fromEntries(perechi) as Record<QuestionStatus, number>;
}

/**
 * Id-urile deja existente dintre cele date. Pentru importul în masă, care
 * trebuie să spună câte rânduri rescriu o grilă — fără să aducă biblioteca.
 */
export async function idExistente(ids: readonly string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { supabase } = await import('./supabase');

  const gasite = new Set<string>();
  // PostgREST pune lista în URL, deci un lot de două mii de id-uri ar depăși
  // lungimea maximă a cererii. Se întreabă în tranșe.
  for (let i = 0; i < ids.length; i += 200) {
    const r = await supabase.from('questions').select('id').in('id', ids.slice(i, i + 200));
    if (r.error) throw new Error(r.error.message);
    for (const rand of (r.data ?? []) as { id: string }[]) gasite.add(rand.id);
  }
  return gasite;
}

/** O linie de acoperire: câte grile are un capitol, pe stări. */
export interface AcoperireCapitol {
  capId: ChapterId;
  ciorna: number;
  publicata: number;
  retrasa: number;
}

/**
 * Câte grile are fiecare capitol, pe stări.
 *
 * Agregare în SQL, nu în client: adusă și grupată cu `Array.reduce`, ar fi exact
 * interogarea nemărginită pe care lista tocmai a scăpat de ea. RPC-ul e
 * `security invoker`, deci RLS decide ce se numără — un elev n-ar vedea ciornele
 * nici ca cifră.
 */
export async function citesteAcoperirea(): Promise<AcoperireCapitol[]> {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase.rpc('acoperire_capitole');
  if (error) throw new Error(error.message);

  return ((data ?? []) as { chapter_id: string; ciorna: number; publicata: number; retrasa: number }[]).map(
    (r) => ({ capId: r.chapter_id, ciorna: r.ciorna, publicata: r.publicata, retrasa: r.retrasa }),
  );
}

/** Schimbă starea mai multor grile deodată. Întoarce câte au fost atinse. */
export async function schimbaStareaGrilelor(
  ids: readonly string[],
  stare: QuestionStatus,
): Promise<number> {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase.rpc('schimba_starea_grilelor', { ids, stare });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? 0;
}

/** Atribuie o colecție unui lot. `null` o scoate. Întoarce câte au fost atinse. */
export async function atribuieColectia(
  ids: readonly string[],
  colectieId: string | null,
): Promise<number> {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase.rpc('atribuie_colectia', {
    ids,
    colectie_noua: colectieId,
  });
  if (error) throw new Error(error.message);
  return (data as number | null) ?? 0;
}

// ---------------------------------------------------------------------------
// Scrierea taxonomiei și a colecțiilor.
//
// Prin RPC, ca `salveaza_grila`, deși politicile ar permite scrierea directă:
// regulile care nu au voie să depindă de client stau lângă date. Cea mai
// importantă e că **id-ul e identitate** — `chapter_id` e scris în `questions`,
// în `sessions.chapter_ids` și în cheia notițelor.
//
// Nu există ștergere, deliberat: un capitol depublicat iese din fața elevului
// fără să atingă nimic din ce s-a scris deja, exact ca retragerea unei grile.
// ---------------------------------------------------------------------------

export interface MaterieDeSalvat {
  id: string;
  nume: string;
  centruId?: string;
  position: number;
  publicat: boolean;
}

export interface CapitolDeSalvat {
  id: string;
  materieId: string;
  nr: string;
  nume: string;
  position: number;
  publicat: boolean;
}

export interface ColectieDeSalvat {
  id: string;
  nume: string;
  tip: string;
  centruId: string | null;
  an: number | null;
  sursaBibliografica: string;
  position: number;
  publicat: boolean;
}

const cheamaRpc = async (nume: string, payload: unknown): Promise<void> => {
  const { supabase } = await import('./supabase');
  const { error } = await supabase.rpc(nume, { payload });
  if (error) throw new Error(error.message);
};

export const salveazaMaterie = (m: MaterieDeSalvat) => cheamaRpc('salveaza_materie', m);
export const salveazaCapitol = (c: CapitolDeSalvat) => cheamaRpc('salveaza_capitol', c);
export const salveazaColectie = (c: ColectieDeSalvat) => cheamaRpc('salveaza_colectie', c);
