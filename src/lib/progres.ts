import { chapterById, chapterLabelById, materieNameOf, type ChapterId } from '../data/chapters';
import type { Question } from '../data/questions';

/** Rândul minim citit din jurnalul de răspunsuri. */
export interface AttemptRow {
  question_id: string;
  is_correct: boolean;
  source: 'sesiune' | 'simulare' | 'recapitulare';
  session_id: string | null;
  sim_run_id: string | null;
  answered_at: string;
}
export interface ProgresCapitol {
  capId: ChapterId;
  nume: string;
  materie: string;
  raspunsuri: number;
  corecte: number;
  grileIncercate: number;
  pct: number;
}

export interface PunctEvolutie {
  id: string;
  pct: number;
  eticheta: string;
  answeredAt: string;
}

export interface ProgresCalculat {
  raspunsuri: number;
  corecte: number;
  pct: number | null;
  capitole: ProgresCapitol[];
  evolutie: PunctEvolutie[];
}

const procent = (corecte: number, total: number): number =>
  total === 0 ? 0 : Math.round((corecte / total) * 100);

const etichetaData = (iso: string): string =>
  new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: 'short' }).format(new Date(iso));

/**
 * Derivă toate cifrele de progres din jurnalul imuabil `attempts`.
 *
 * Grila este rezolvată prin banca primită, nu prin poziția ei. Dacă o grilă nu
 * mai este disponibilă în bibliotecă, răspunsul rămâne în totalul global și în
 * evoluția sesiunii, dar nu este atribuit pe ghicite altui capitol.
 */
export function calculeazaProgres(attempts: readonly AttemptRow[], questions: readonly Question[]): ProgresCalculat {
  const intrebare = new Map(questions.map((q) => [q.id as string, q]));
  const peCapitol = new Map<ChapterId, { raspunsuri: number; corecte: number; grile: Set<string> }>();
  const peSesiune = new Map<string, { corecte: number; total: number; answeredAt: string }>();
  let corecte = 0;

  for (const attempt of attempts) {
    if (attempt.is_correct) corecte += 1;

    const q = intrebare.get(attempt.question_id);
    if (q) {
      const curent = peCapitol.get(q.capId) ?? { raspunsuri: 0, corecte: 0, grile: new Set<string>() };
      curent.raspunsuri += 1;
      if (attempt.is_correct) curent.corecte += 1;
      curent.grile.add(attempt.question_id);
      peCapitol.set(q.capId, curent);
    }

    const runId = attempt.session_id
      ? `sesiune:${attempt.session_id}`
      : attempt.sim_run_id
        ? `simulare:${attempt.sim_run_id}`
        : null;
    if (!runId) continue;
    const run = peSesiune.get(runId) ?? { corecte: 0, total: 0, answeredAt: attempt.answered_at };
    run.total += 1;
    if (attempt.is_correct) run.corecte += 1;
    if (attempt.answered_at > run.answeredAt) run.answeredAt = attempt.answered_at;
    peSesiune.set(runId, run);
  }

  const capitole = [...peCapitol.entries()]
    .filter(([capId]) => chapterById(capId) !== undefined)
    .map(([capId, row]): ProgresCapitol => ({
      capId,
      nume: chapterLabelById(capId),
      materie: materieNameOf(capId),
      raspunsuri: row.raspunsuri,
      corecte: row.corecte,
      grileIncercate: row.grile.size,
      pct: procent(row.corecte, row.raspunsuri),
    }));

  const evolutie = [...peSesiune.entries()]
    .map(([id, run]): PunctEvolutie => ({
      id,
      pct: procent(run.corecte, run.total),
      eticheta: etichetaData(run.answeredAt),
      answeredAt: run.answeredAt,
    }))
    .sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));

  return {
    raspunsuri: attempts.length,
    corecte,
    pct: attempts.length === 0 ? null : procent(corecte, attempts.length),
    capitole,
    evolutie,
  };
}
