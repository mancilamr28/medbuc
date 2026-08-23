import { OPTION_KEYS, esteSursa, type OptionKey, type QuestionSursa } from '../data/questions';
import type { GrilaCuStare, GrilaDeSalvat, QuestionStatus } from '../lib/continut';
import { catreSalvare, ciornaGoala, opturiGoale, valideaza, type Ciorna } from './adminCiorna';
import { TAXONOMIE_GOALA, type Taxonomie } from '../lib/taxonomie';
import { TIPURI_GOALE, type TipuriGrile } from '../lib/tipuriGrile';
import type { ChapterId } from '../data/chapters';

/**
 * Importul în masă al grilelor.
 *
 * Faza 4 a lăsat bucata asta deoparte („se taie prima dacă faza se lungește"),
 * iar acum e drumul critic: cu șase grile în bancă, orice progres sau statistică
 * de la Faza 5 încolo n-are ce să arate. Formularul e bun pentru o grilă și
 * nepractic pentru două sute.
 *
 * **Validarea trece prin `valideaza()`**, exact aceeași funcție ca formularul, în
 * loc de un set paralel de reguli. Altfel cele două ar diverge la prima regulă
 * adăugată într-un singur loc, iar importul ar accepta ce formularul refuză.
 * Regulile care nu pot exista în formular — JSON stricat, o literă în afara lui
 * A–E, un id repetat în același lot — se adaugă peste, aici.
 *
 * **Fără migrare nouă:** se cheamă `salveaza_grila` o dată per grilă. RPC-ul face
 * upsert pe `id`, deci reimportarea aceluiași lot nu dublează nimic, iar un lot
 * cu trei rânduri stricate din cincizeci le salvează pe celelalte patruzeci și
 * șapte și spune exact ce a picat — mai util, la scris de conținut, decât o
 * tranzacție unică ce cade întreagă din cauza unei virgule.
 */

/** Un rând din lotul lipit, cu verdictul lui. */
export interface RandImport {
  /** Poziția în listă, de la 1: singurul reper când id-ul lipsește. */
  pozitie: number;
  id: string;
  /** Ce pleacă spre bază. Gol când rândul are probleme. */
  grila: GrilaDeSalvat | null;
  probleme: string[];
  /** Id-ul există deja în bibliotecă — importul îl va rescrie. */
  suprascrie: boolean;
}

/**
 * Ce se alege o dată, pentru tot lotul lipit.
 *
 * Un import e aproape întotdeauna *o* colecție — o lucrare, un capitol dintr-o
 * culegere — deci repetarea aceluiași `"colectie"` pe cincizeci de rânduri e
 * muncă de copiat, nu informație. Se aleg deasupra casetei și cad peste rândurile
 * care nu spun altceva; un rând care își scrie propria valoare o păstrează, ca
 * exportul bibliotecii (`catreJson`) să se poată relipi întreg fără să fie
 * uniformizat de câmpurile din ecran.
 */
export interface LotImplicit {
  /** Starea grilelor fără `status` propriu. */
  status: QuestionStatus;
  /** Felul materialului, când rândul nu îl spune. */
  sursa?: QuestionSursa;
  /** Eticheta lotului, când rândul nu o spune. */
  colectie?: string;
}

export interface RezultatCitire {
  /** Ce a împiedicat citirea întregului lot; atunci `randuri` e gol. */
  eroare: string | null;
  randuri: RandImport[];
}

const sir = (v: unknown): string => (typeof v === 'string' ? v : '');

const esteObiect = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const STARI: QuestionStatus[] = ['ciorna', 'publicata', 'retrasa'];

/**
 * Variantele, din oricare dintre cele trei forme în care ajung să fie scrise.
 *
 * Perechile sunt forma canonică — e cea din `src/data/questions.ts` și cea pe
 * care o scoate exportul, deci lotul se poate lua de acolo și pus înapoi fără
 * conversie. Celelalte două există fiindcă sunt greșeli previzibile, nu din
 * generozitate: un obiect `{ "A": "text" }` e ce scrie un om, iar lista de
 * obiecte `{ key, text, why }` e forma cu care pleacă cererea spre `salveaza_grila`.
 * Un import respins pentru forma variantelor, când conținutul e corect, e exact
 * genul de fricțiune care oprește scrisul.
 */
function citesteVariante(brut: unknown): { triple: [string, string, string][]; problema: string | null } {
  const triple: [string, string, string][] = [];

  if (Array.isArray(brut)) {
    for (const el of brut) {
      if (Array.isArray(el) && el.length >= 2) {
        triple.push([sir(el[0]), sir(el[1]), sir(el[2])]);
      } else if (esteObiect(el) && 'key' in el) {
        triple.push([sir(el['key']), sir(el['text']), sir(el['why'])]);
      } else {
        return { triple: [], problema: 'Variantele trebuie scrise ca perechi [literă, text].' };
      }
    }
    return { triple, problema: null };
  }

  if (esteObiect(brut)) {
    for (const [cheie, valoare] of Object.entries(brut)) triple.push([cheie, sir(valoare), '']);
    return { triple, problema: null };
  }

  return { triple: [], problema: 'Grila nu are variante.' };
}

/**
 * Un rând brut, turnat în forma pe care o știe formularul.
 *
 * Problemele întoarse sunt doar cele pe care `valideaza()` nu le poate vedea,
 * fiindcă în formular n-au cum să apară: acolo tipul vine dintr-un `select`, iar
 * literele variantelor sunt fixe.
 */
function catreCiorna(
  brut: Record<string, unknown>,
  implicite: LotImplicit,
  tipuri: TipuriGrile,
): { ciorna: Ciorna; probleme: string[] } {
  const probleme: string[] = [];
  const ciorna = ciornaGoala(sir(brut['capId']) as ChapterId);

  ciorna.id = sir(brut['id']).trim();
  ciorna.text = sir(brut['text']);
  ciorna.expl = sir(brut['expl']);
  ciorna.src = sir(brut['src']);

  const colectie = sir(brut['colectie']).trim();
  ciorna.colectie = colectie !== '' ? colectie : (implicite.colectie ?? '').trim();

  const sursa = sir(brut['sursa']);
  if (sursa !== '') {
    if (!esteSursa(sursa)) probleme.push(`Sursă necunoscută: ${sursa}.`);
    else ciorna.sursa = sursa;
  } else if (implicite.sursa) {
    ciorna.sursa = implicite.sursa;
  }
  ciorna.an = typeof brut['an'] === 'number' ? String(brut['an']) : sir(brut['an']);

  // Tipurile se citesc din bază, deci lista lor nu mai poate fi scrisă aici.
  const tip = sir(brut['tip']);
  const cunoscute = tipuri.lista.map((t) => t.id);
  if (tip === '') {
    probleme.push(`Grila nu spune ce tip e (${cunoscute.map((t) => `„${t}"`).join(' sau ') || 'niciun tip încărcat'}).`);
  } else if (cunoscute.length > 0 && !cunoscute.includes(tip)) {
    probleme.push(`Tip necunoscut: ${tip}.`);
  } else {
    ciorna.tip = tip;
  }

  const enunturi = brut['enunturi'];
  if (Array.isArray(enunturi)) ciorna.enunturi = [0, 1, 2, 3].map((i) => sir(enunturi[i]));

  const { triple, problema } = citesteVariante(brut['opts']);
  if (problema) probleme.push(problema);

  const why = esteObiect(brut['why']) ? brut['why'] : {};
  ciorna.opts = opturiGoale();
  for (const [cheie, text, motiv] of triple) {
    const litera = cheie.trim().toUpperCase();
    if (!(OPTION_KEYS as string[]).includes(litera)) {
      probleme.push(`Varianta „${cheie}" nu e o literă între A și E.`);
      continue;
    }
    ciorna.opts[litera as OptionKey] = { text, why: motiv !== '' ? motiv : sir(why[litera]) };
  }

  const corect = sir(brut['correct']).trim().toUpperCase();
  if (!(OPTION_KEYS as string[]).includes(corect)) {
    probleme.push(`Răspunsul corect „${sir(brut['correct'])}" nu e o literă între A și E.`);
  } else {
    ciorna.correct = corect as OptionKey;
  }

  return { ciorna, probleme };
}

/** Starea cerută de rând, dacă o cere; altfel cea aleasă pentru tot lotul. */
function stareaRandului(brut: Record<string, unknown>, implicit: QuestionStatus): QuestionStatus {
  const cerut = sir(brut['status']);
  return (STARI as string[]).includes(cerut) ? (cerut as QuestionStatus) : implicit;
}

/**
 * Citește lotul lipit și spune, rând cu rând, ce se poate salva și ce nu.
 *
 * `existente` e biblioteca de acum, folosită doar ca să marcheze rândurile care
 * rescriu o grilă. Nu e o eroare — reimportarea unui lot corectat e chiar felul
 * în care se lucrează — dar trebuie spus înainte, nu descoperit după.
 */
export function citesteImport(
  brut: string,
  implicite: LotImplicit,
  existente: readonly { id: string }[],
  taxonomie: Taxonomie = TAXONOMIE_GOALA,
  tipuri: TipuriGrile = TIPURI_GOALE,
): RezultatCitire {
  if (brut.trim() === '') return { eroare: null, randuri: [] };

  let citit: unknown;
  try {
    citit = JSON.parse(brut);
  } catch (e: unknown) {
    return { eroare: `JSON-ul nu se poate citi: ${e instanceof Error ? e.message : 'format greșit'}`, randuri: [] };
  }

  // O singură grilă lipită, fără paranteze drepte, e o greșeală prea probabilă
  // ca să merite un mesaj de eroare în loc de un import care merge.
  const lista = Array.isArray(citit) ? citit : [citit];
  if (lista.length === 0) return { eroare: null, randuri: [] };

  const idExistent = new Set(existente.map((g) => g.id));
  const deCateOri = new Map<string, number>();

  const randuri = lista.map((el, i): RandImport => {
    const pozitie = i + 1;
    if (!esteObiect(el)) {
      return { pozitie, id: '', grila: null, probleme: ['Rândul nu e o grilă.'], suprascrie: false };
    }

    const { ciorna, probleme } = catreCiorna(el, implicite, tipuri);
    probleme.push(...valideaza(ciorna, taxonomie, tipuri));
    if (ciorna.id !== '') deCateOri.set(ciorna.id, (deCateOri.get(ciorna.id) ?? 0) + 1);

    return {
      pozitie,
      id: ciorna.id,
      grila: probleme.length === 0 ? catreSalvare(ciorna, stareaRandului(el, implicite.status), tipuri) : null,
      probleme,
      suprascrie: idExistent.has(ciorna.id),
    };
  });

  // Două rânduri cu același id nu sunt două grile: al doilea l-ar rescrie tăcut
  // pe primul, în aceeași apăsare, iar lotul ar raporta două reușite pentru una.
  for (const rand of randuri) {
    if ((deCateOri.get(rand.id) ?? 0) > 1) {
      rand.probleme.push(`Identificatorul „${rand.id}" apare de mai multe ori în lot.`);
      rand.grila = null;
    }
  }

  return { eroare: null, randuri };
}

/**
 * „1 rescrie o grilă existentă" / „2 rescriu grile existente".
 *
 * `numar()` acordă substantivul, dar aici se acordă și verbul, iar numărul e
 * randat separat, colorat — deci fraza nu se poate lipi din bucăți în jurul lui.
 * E a doua oară când acordul cade exact aici: prima a fost „1 grilă scrise", tot
 * un cuvânt rămas la plural lângă un numeral de unu, tot prins abia în browser.
 */
export const frazaRescrieri = (n: number): string =>
  n === 1 ? 'rescrie o grilă existentă' : 'rescriu grile existente';

export interface BilantImport {
  reusite: number;
  esecuri: { id: string; mesaj: string }[];
}

/**
 * Trimite rândurile valide, unul câte unul, și strânge ce a picat.
 *
 * `salveaza` vine prin parametru, nu ca import: la fel ca banca dată motoarelor
 * de quiz, asta ține funcția testabilă fără rețea. Secvențial, nu în paralel —
 * două sute de cereri deodată nu sunt mai rapide prin PostgREST, iar progresul
 * numărat înseamnă ceva doar dacă ordinea e reală.
 */
export async function importa(
  randuri: readonly RandImport[],
  salveaza: (g: GrilaDeSalvat) => Promise<void>,
  onProgres?: (facute: number, total: number) => void,
): Promise<BilantImport> {
  const deTrimis = randuri.flatMap((r) => (r.grila ? [r.grila] : []));
  const esecuri: BilantImport['esecuri'] = [];
  let reusite = 0;

  for (const [i, grila] of deTrimis.entries()) {
    try {
      await salveaza(grila);
      reusite += 1;
    } catch (e: unknown) {
      esecuri.push({ id: grila.id, mesaj: e instanceof Error ? e.message : 'Eroare necunoscută.' });
    }
    onProgres?.(i + 1, deTrimis.length);
  }

  return { reusite, esecuri };
}

/**
 * Biblioteca, în forma pe care o citește importul.
 *
 * Aceeași formă ca `src/data/questions.ts`, deci un export se poate corecta
 * într-un editor și reimporta întreg, iar o grilă din fișierul de fixturi se
 * poate lipi direct. `status` merge cu ele, ca reimportarea să nu publice din
 * greșeală ce era ciornă.
 */
export function catreJson(grile: readonly GrilaCuStare[]): string {
  return JSON.stringify(
    grile.map((g) => ({
      id: g.id,
      capId: g.capId,
      tip: g.tip,
      status: g.status,
      text: g.text,
      ...(g.enunturi ? { enunturi: g.enunturi } : {}),
      opts: g.opts,
      correct: g.correct,
      why: g.why,
      expl: g.expl,
      src: g.src,
      sursa: g.sursa,
      ...(g.colectie !== '' ? { colectie: g.colectie } : {}),
      ...(g.an !== undefined ? { an: g.an } : {}),
    })),
    null,
    2,
  );
}
