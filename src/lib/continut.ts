import { OPTION_KEYS, type OptionKey, type Question, type QuestionSursa, type QuestionType } from '../data/questions';
import { chapterById, type ChapterId, type MaterieId } from '../data/chapters';

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
  tip: string;
  status: string;
  text: string;
  enunturi: string[] | null;
  correct: string;
  expl: string;
  src: string;
  sursa: string;
  an: number | null;
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

const CAMPURI = `id, chapter_id, tip, status, text, enunturi, correct, expl, src, sursa, an, question_options!${FK_VARIANTE}(key, text, why)`;

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
    tip: rand.tip as QuestionType,
    capId: rand.chapter_id as ChapterId,
    text: rand.text,
    ...(rand.enunturi ? { enunturi: rand.enunturi } : {}),
    opts: variante.map((o) => [o.key, o.text] as [OptionKey, string]),
    correct: rand.correct as OptionKey,
    expl: rand.expl,
    why,
    src: rand.src,
    sursa: rand.sursa as QuestionSursa,
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
  const { data, error } = await supabase.from('questions').select(CAMPURI).order('id');
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RandGrila[]).map(mapeazaGrila);
}

/**
 * Câte grile are fiecare capitol, respectiv fiecare materie.
 *
 * Pure peste banca primită, nu hărți la nivel de modul cum erau în
 * `data/questions.ts`: banca se schimbă acum la runtime, deci numărătoarea nu
 * mai poate fi construită o dată, la import. Materia se citește din capitol —
 * `Chapter` o poartă explicit — nu din prefixul id-ului.
 */
export function numaraGrile(questions: Question[]): {
  peCapitol: ReadonlyMap<ChapterId, number>;
  peMaterie: ReadonlyMap<MaterieId, number>;
} {
  const peCapitol = new Map<ChapterId, number>();
  const peMaterie = new Map<MaterieId, number>();

  for (const q of questions) {
    peCapitol.set(q.capId, (peCapitol.get(q.capId) ?? 0) + 1);
    const materie = chapterById(q.capId)?.materie;
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
