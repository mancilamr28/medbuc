import type { ChapterId, MaterieId } from '../data/chapters';
import type { OptionKey, QuestionId } from '../data/questions';
import type { SimRun } from '../state/useSimulare';

/**
 * Poarta către motorul de generare din bază.
 *
 * Cele cinci funcții de aici sunt singurul drum al clientului spre `test_runs`.
 * Nu există `supabase.from('test_runs')` nicăieri altundeva, și e o regulă, nu o
 * întâmplare: scrierea directă ar ocoli exact garanțiile pentru care motorul a
 * fost mutat pe server — nota pusă de server, răspunsul corect dat abia după ce
 * a fost câștigat, instantaneul închis după generare.
 *
 * Erorile din bază sunt **coduri**, nu propoziții (`fara_candidati`,
 * `lucrare_predata`, `raspuns_blocat`). `codEroare()` le scoate curate din
 * mesajul PostgREST, ca ecranele să ramifice pe ele; traducerea în românește
 * stă la ecran, unde se știe ce înseamnă în context — „n-am găsit nicio grilă"
 * sună altfel la exersare decât la recapitulare.
 */

/** Modurile pe care le acceptă `genereaza_test`; oglindesc enum-ul `test_mod`. */
export type ModTest =
  | 'exersare'
  | 'simulare'
  | 'recapitulare'
  | 'test_predefinit'
  | 'greseli'
  | 'favorite'
  | 'nevazute';

/** Fiecare listă goală înseamnă „fără restricție pe axa asta", ca peste tot. */
export interface FiltreTest {
  /** Id-uri exacte, folosite de coada inteligentă; gol înseamnă fără restricție. */
  ids?: QuestionId[];
  materii?: MaterieId[];
  capitole?: ChapterId[];
  colectii?: string[];
  surse?: string[];
  tipuri?: string[];
  dificultate_min?: number | null;
  dificultate_max?: number | null;
}

export interface CerereTest {
  mod: ModTest;
  /** Definiția aleasă; este singurul câmp configurabil de elev la un test predefinit. */
  test_id?: string;
  filtre?: FiltreTest;
  /** Cote pe materie. Când sunt date, `nr` se ignoră — suma lor ține locul. */
  cote?: { materie_id: MaterieId; nr: number }[];
  nr?: number;
  durata_minute?: number | null;
  amesteca_grile?: boolean;
  amesteca_optiuni?: boolean;
  /** Refuză, în loc să scurteze, când banca n-are destule. */
  strict?: boolean;
}

export interface RezultatGenerare {
  run_id: string;
  nr_cerut: number;
  nr_obtinut: number;
  insuficient: boolean;
  lipsa: { materie_id: MaterieId; lipsa: number }[];
}

export interface NumarCandidati {
  total: number;
  pe_materie: { materie_id: MaterieId; nr: number }[];
}

export interface GrilaDinLucrare {
  position: number;
  question_id: QuestionId;
  chosen: OptionKey | null;
  revealed: boolean;
  marked: boolean;
  answered_at: string | null;
  /** Ordinea variantelor pentru lucrarea asta; null = ordinea firească. */
  option_order: OptionKey[] | null;
  /** Null la o grilă ștearsă între timp din bibliotecă — poziția rămâne. */
  text: string | null;
  enunturi: string[] | null;
  tip_id: string | null;
  chapter_id: ChapterId | null;
  optiuni: { key: OptionKey; text: string }[] | null;
  /** Vin abia după verificarea grilei sau după predare. */
  correct?: OptionKey;
  expl?: string;
  why?: Partial<Record<OptionKey, string>>;
}

export interface Lucrare {
  run: {
    id: string;
    mod: ModTest;
    config: CerereTest;
    started_at: string;
    ends_at: string | null;
    /** Ține cont și de expirare: o lucrare expirată se citește ca predată. */
    finished_at: string | null;
    qi: number;
    nr_cerut: number | null;
  };
  grile: GrilaDinLucrare[];
}

export interface RaspunsDat {
  inregistrat: true;
  /** Lipsesc la simulare: acolo nu se verifică nimic până la predare. */
  corect?: boolean;
  correct?: OptionKey;
  expl?: string;
  why?: Partial<Record<OptionKey, string>>;
}

export interface ScorLucrare {
  run_id: string;
  finished_at: string;
  nr_cerut: number | null;
  corecte: number;
  gresite: number;
  /** Null când lucrarea vine dinaintea numitorului — vezi `nr_cerut`. */
  pct: number | null;
}

/**
 * Codurile pe care le poate ramifica un ecran. Lista e închisă dinadins: un cod
 * nou trebuie să fie o alegere, nu ceva ce apare de la sine în bază și trece
 * neobservat printr-un `catch` generic.
 */
export const CODURI_LUCRARE = [
  'neautentificat',
  'mod_necunoscut',
  'nr_invalid',
  'fara_candidati',
  'insuficient_strict',
  'test_predefinit_inexistent',
  'test_predefinit_indisponibil',
  'acces_interzis',
  'lucrare_inexistenta',
  'lucrare_predata',
  'pozitie_inexistenta',
  'raspuns_blocat',
] as const;

export type CodLucrare = (typeof CODURI_LUCRARE)[number];

/**
 * Codul dintr-o eroare venită de la bază, dacă e unul cunoscut.
 *
 * PostgREST împachetează `raise exception 'fara_candidati'` într-un mesaj mai
 * lung, deci potrivirea e pe cuvânt întreg, nu pe egalitate — dar rămâne pe
 * lista închisă, ca un mesaj oarecare să nu fie citit drept cod.
 */
export function codEroare(e: unknown): CodLucrare | null {
  const mesaj = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  return CODURI_LUCRARE.find((c) => new RegExp(`\\b${c}\\b`).test(mesaj)) ?? null;
}

const rpc = async <T>(nume: string, args: Record<string, unknown>): Promise<T> => {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase.rpc(nume, args);
  if (error) throw new Error(error.message);
  return data as T;
};

/** Contorul viu al asistentului: câte grile ar intra pe filtrele astea. */
export const numaraCandidati = (cerere: Pick<CerereTest, 'mod' | 'filtre'>) =>
  rpc<NumarCandidati>('numara_candidati', { payload: cerere });

/** Compune lucrarea și o scrie, într-o singură tranzacție pe server. */
export const genereazaTest = (cerere: CerereTest) =>
  rpc<RezultatGenerare>('genereaza_test', { payload: cerere });

export const citesteTest = (runId: string) => rpc<Lucrare>('citeste_test', { run_id: runId });

/**
 * Un răspuns. `aleasa: null` înseamnă „las-o goală", nu „șterge răspunsul": la
 * exersare grila e deja închisă după verificare.
 */
export const raspunde = (v: {
  runId: string;
  pozitie: number;
  aleasa: OptionKey | null;
  marcata?: boolean;
}) =>
  rpc<RaspunsDat>('raspunde', {
    payload: { run_id: v.runId, pozitie: v.pozitie, aleasa: v.aleasa, marcata: v.marcata ?? null },
  });

export const predaTest = (runId: string) => rpc<ScorLucrare>('preda_test', { run_id: runId });

/**
 * Mută o simulare salvată de versiunea veche în motorul persistent.
 * Funcția din bază este idempotentă, deci StrictMode sau o reîncercare după o
 * întrerupere nu dublează lucrarea.
 */
export const importaSimulareVeche = (run: SimRun) =>
  rpc<{ run_id: string }>('importa_simulare_veche', { payload: run });
