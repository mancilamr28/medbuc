import type { Question, QuestionId } from '../data/questions';
import type { Session } from '../state/useSession';
import type { Recapitulare } from '../state/useRecapitulare';
import type { SimRun } from '../state/useSimulare';

export interface AttemptInsert {
  client_key: string;
  user_id: string;
  question_id: string;
  chosen: string;
  is_correct: boolean;
  source: 'sesiune' | 'simulare' | 'recapitulare';
  /** Lucrarea de simulare se leagă prin `sim_run_id`, deci aici e `null`. */
  session_id: string | null;
  sim_run_id: string | null;
  answered_at: string;
}

/**
 * Transformă răspunsurile unei sesiuni într-un jurnal de încercări.
 *
 * `session.answers` e cheiat pe poziția din bancă, deci grila se caută în banca
 * sesiunii — `session.banca` — nu într-un array importat. Jurnalul salvează
 * mereu `question.id`, nu poziția: poziția depinde de ce e în bibliotecă în ziua
 * aceea, id-ul nu.
 */
export function attemptsFromSession(session: Session, userId: string, finishedAt: number): AttemptInsert[] {
  const answeredAt = new Date(finishedAt).toISOString();
  return Object.entries(session.answers).flatMap(([index, chosen]) => {
    const question = session.banca[Number(index)];
    if (!question) return [];
    return [
      {
        client_key: `${session.id}:${index}`,
        user_id: userId,
        question_id: question.id,
        chosen,
        is_correct: chosen === question.correct,
        source: 'sesiune' as const,
        session_id: session.id,
        sim_run_id: null,
        answered_at: answeredAt,
      },
    ];
  });
}

/** Transformă o recapitulare în același jurnal retry-safe ca sesiunea liberă. */
export function attemptsFromRecapitulare(
  recapitulare: Pick<Recapitulare, 'id' | 'banca' | 'answers'>,
  userId: string,
  finishedAt: number,
): AttemptInsert[] {
  const answeredAt = new Date(finishedAt).toISOString();
  return Object.entries(recapitulare.answers).flatMap(([index, chosen]) => {
    const question = recapitulare.banca[Number(index)];
    if (!question) return [];
    return [
      {
        client_key: `${recapitulare.id}:${index}`,
        user_id: userId,
        question_id: question.id,
        chosen,
        is_correct: chosen === question.correct,
        source: 'recapitulare' as const,
        session_id: recapitulare.id,
        sim_run_id: null,
        answered_at: answeredAt,
      },
    ];
  });
}

/**
 * Transformă o lucrare de simulare predată în același jurnal retry-safe.
 *
 * **Se scriu doar grilele la care s-a răspuns**, ca la sesiune și la
 * recapitulare — deși coloana permite `chosen = null` (constrângerea
 * `attempts_chosen_or_blank`). O grilă lăsată necompletată valorează 0 la
 * punctajul UMFCD, dar nu e o dovadă că elevul n-o știe: de obicei înseamnă că
 * a rămas fără timp. Scrise ca răspunsuri greșite, cele 60 de grile neatinse
 * dintr-o lucrare de 100 ar prăbuși stăpânirea și ar inunda Recapitularea cu
 * grile pe care nu le-a văzut niciodată — coada intră pe „a greșit măcar o
 * dată" (`recapitulare.ts`).
 *
 * Punctajul examenului nu se pierde: `sim_runs.question_ids` păstrează
 * numitorul, deci procentul UMFCD rămâne derivabil, fără să stocăm vreun `pct`.
 *
 * Pozițiile indexează `run.order`, nu banca; id-ul grilei se scoate din
 * `byId`. O grilă retrasă între predare și sincronizare se sare — altfel
 * inserarea ar cădea pe cheia străină `attempts_question_id_fkey`.
 */
export function attemptsFromSimulare(
  run: Pick<SimRun, 'id' | 'order' | 'answers'>,
  userId: string,
  finishedAt: number,
  byId: ReadonlyMap<QuestionId, Question>,
): AttemptInsert[] {
  const answeredAt = new Date(finishedAt).toISOString();
  return Object.entries(run.answers).flatMap(([index, chosen]) => {
    const id = run.order[Number(index)];
    const question = id !== undefined ? byId.get(id) : undefined;
    if (!question) return [];
    return [
      {
        client_key: `${run.id}:${index}`,
        user_id: userId,
        question_id: question.id,
        chosen,
        is_correct: chosen === question.correct,
        source: 'simulare' as const,
        session_id: null,
        sim_run_id: run.id,
        answered_at: answeredAt,
      },
    ];
  });
}
