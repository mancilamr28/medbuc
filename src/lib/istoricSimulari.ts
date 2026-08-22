import type { OptionKey, Question, QuestionId } from '../data/questions';
import type { AttemptRow } from './progres';
import { supabase } from './supabase';

/**
 * Istoricul lucrărilor de simulare, derivat — ca tot restul — din ce s-a scris
 * la predare, nu dintr-un punctaj stocat.
 *
 * `sim_runs` ține numitorul (`question_ids`, inclusiv grilele lăsate goale), iar
 * `attempts` ține numărătorul (un rând per grilă la care s-a răspuns). Procentul
 * se recalculează de fiecare dată din cele două, deci o lucrare veche arată
 * același scor ca în ziua predării, oricât s-ar schimba biblioteca.
 */

/** Rândul citit din `sim_runs`. `config` vine ca `jsonb`, deci nimic nu e garantat. */
export interface SimRunRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  config: Record<string, unknown> | null;
  question_ids: string[];
}

export interface LucrareIstoric {
  id: string;
  startedAt: number;
  finishedAt: number;
  /** Ce scria pe configurare, sau eticheta neutră dacă lipsește din `jsonb`. */
  model: string;
  total: number;
  corecte: number;
  gresite: number;
  neraspunse: number;
  pct: number;
  durataMs: number;
}

/** O poziție din lucrare, așa cum se recitește după predare. */
export interface GrilaLucrare {
  pozitie: number;
  /** `null` când grila a fost retrasă din bibliotecă după predare. */
  question: Question | null;
  ales: OptionKey | null;
}

const textSau = (valoare: unknown, implicit: string): string =>
  typeof valoare === 'string' && valoare.trim() !== '' ? valoare : implicit;

/**
 * Rezumă lucrările predate.
 *
 * O lucrare fără `finished_at` e una în curs, nu istorie: ea trăiește în
 * `localStorage` până la predare sau expirare. Cele nesincronizate lipsesc din
 * listă exact cât timp lipsesc din bază — cardul de eșec din `AttemptSync` e
 * cel care spune că n-au ajuns acolo.
 */
export function rezumaLucrari(
  runs: readonly SimRunRow[],
  attempts: readonly AttemptRow[],
): LucrareIstoric[] {
  const peLucrare = new Map<string, { raspunsuri: number; corecte: number }>();
  for (const attempt of attempts) {
    if (attempt.sim_run_id === null) continue;
    const acc = peLucrare.get(attempt.sim_run_id) ?? { raspunsuri: 0, corecte: 0 };
    acc.raspunsuri += 1;
    if (attempt.is_correct) acc.corecte += 1;
    peLucrare.set(attempt.sim_run_id, acc);
  }

  const lucrari: LucrareIstoric[] = [];
  for (const run of runs) {
    if (run.finished_at === null) continue;
    const finishedAt = Date.parse(run.finished_at);
    const startedAt = Date.parse(run.started_at);
    if (!Number.isFinite(finishedAt) || !Number.isFinite(startedAt)) continue;

    const total = run.question_ids.length;
    const { raspunsuri, corecte } = peLucrare.get(run.id) ?? { raspunsuri: 0, corecte: 0 };
    lucrari.push({
      id: run.id,
      startedAt,
      finishedAt,
      model: textSau(run.config?.['model'], 'Simulare'),
      total,
      corecte,
      gresite: Math.max(raspunsuri - corecte, 0),
      neraspunse: Math.max(total - raspunsuri, 0),
      // Punctajul UMFCD: numitorul e lucrarea întreagă, nu câte grile ai atins.
      pct: total === 0 ? 0 : Math.round((corecte / total) * 100),
      durataMs: Math.max(finishedAt - startedAt, 0),
    });
  }

  return lucrari.sort((a, b) => b.finishedAt - a.finishedAt);
}

/**
 * Poziția din lucrare, scoasă din `client_key`.
 *
 * `attempts` nu ține poziția ca atare, iar `question_id` singur n-ar ajunge: o
 * bibliotecă mică e repetată de `buildOrder` ca să umple cele 100 de grile, deci
 * aceeași grilă apare de mai multe ori în aceeași lucrare. Cheia scrisă la
 * predare — `${run.id}:${poziție}` — spune exact la care dintre ele s-a răspuns.
 */
export function pozitiaDinClientKey(runId: string, clientKey: string | null): number | null {
  if (clientKey === null || !clientKey.startsWith(`${runId}:`)) return null;
  const pozitie = Number(clientKey.slice(runId.length + 1));
  return Number.isInteger(pozitie) && pozitie >= 0 ? pozitie : null;
}

/** Rândul de răspuns citit pentru recitirea unei lucrări. */
export interface RaspunsLucrare {
  client_key: string | null;
  question_id: string;
  chosen: string | null;
}

/**
 * Reface lucrarea poziție cu poziție: ce grilă a fost și ce s-a bifat.
 *
 * Ordinea vine din `question_ids`, nu din răspunsuri, deci grilele lăsate goale
 * își păstrează locul și numerotarea rămâne cea din timpul examenului.
 */
export function reconstituieLucrarea(
  run: SimRunRow,
  raspunsuri: readonly RaspunsLucrare[],
  byId: ReadonlyMap<QuestionId, Question>,
): GrilaLucrare[] {
  const pePozitie = new Map<number, string | null>();
  for (const raspuns of raspunsuri) {
    const pozitie = pozitiaDinClientKey(run.id, raspuns.client_key);
    if (pozitie === null) continue;
    pePozitie.set(pozitie, raspuns.chosen);
  }

  return run.question_ids.map((id, pozitie) => {
    const ales = pePozitie.get(pozitie) ?? null;
    return {
      pozitie,
      question: byId.get(id as QuestionId) ?? null,
      ales: ales as OptionKey | null,
    };
  });
}

/** Lucrările contului, cele mai recente întâi. RLS le limitează la ale lui. */
export async function citesteSimulari(): Promise<SimRunRow[]> {
  const { data, error } = await supabase
    .from('sim_runs')
    .select('id,started_at,finished_at,config,question_ids')
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SimRunRow[];
}

/** Răspunsurile unei singure lucrări, citite abia când e deschisă. */
export async function citesteRaspunsurileLucrarii(runId: string): Promise<RaspunsLucrare[]> {
  const { data, error } = await supabase
    .from('attempts')
    .select('client_key,question_id,chosen')
    .eq('sim_run_id', runId);
  if (error) throw error;
  return (data ?? []) as RaspunsLucrare[];
}
