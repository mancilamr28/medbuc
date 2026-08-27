import type { GrilaCatalog } from './continut';
import { calculeazaProgres, type AttemptRow, type ProgresCalculat } from './progres';
import { TAXONOMIE_GOALA, type Taxonomie } from './taxonomie';

const ZI_MS = 24 * 60 * 60 * 1000;

export type PerioadaStatistici = '7z' | '30z' | 'toate';

export interface ActivitateZilnica {
  data: string;
  eticheta: string;
  raspunsuri: number;
  corecte: number;
  pct: number;
}

export interface StatisticiCalculate {
  progres: ProgresCalculat;
  grileUnice: number;
  zileActive: number;
  surse: Record<AttemptRow['source'], number>;
  activitate: ActivitateZilnica[];
}

const durata = (perioada: PerioadaStatistici): number | null =>
  perioada === '7z' ? 7 * ZI_MS : perioada === '30z' ? 30 * ZI_MS : null;

const procent = (corecte: number, total: number): number =>
  total === 0 ? 0 : Math.round((corecte / total) * 100);

const etichetaData = (iso: string): string =>
  new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' }).format(new Date(iso));

/** Derivă statisticile din jurnalul deja filtrat de RLS, fără stare paralelă. */
export function calculeazaStatistici(
  attempts: readonly AttemptRow[],
  questions: readonly GrilaCatalog[],
  perioada: PerioadaStatistici,
  acum: number,
  taxonomie: Taxonomie = TAXONOMIE_GOALA,
): StatisticiCalculate {
  const limita = durata(perioada);
  const valide = attempts.filter((attempt) => {
    const moment = Date.parse(attempt.answered_at);
    return Number.isFinite(moment) && (limita === null || moment >= acum - limita) && moment <= acum;
  });
  const peZi = new Map<string, { raspunsuri: number; corecte: number; iso: string }>();

  for (const attempt of valide) {
    const data = attempt.answered_at.slice(0, 10);
    const rand = peZi.get(data) ?? { raspunsuri: 0, corecte: 0, iso: attempt.answered_at };
    rand.raspunsuri += 1;
    if (attempt.is_correct) rand.corecte += 1;
    if (attempt.answered_at > rand.iso) rand.iso = attempt.answered_at;
    peZi.set(data, rand);
  }

  const surse: StatisticiCalculate['surse'] = { sesiune: 0, simulare: 0, recapitulare: 0 };
  for (const attempt of valide) surse[attempt.source] += 1;

  return {
    progres: calculeazaProgres(valide, questions, taxonomie),
    grileUnice: new Set(valide.map((attempt) => attempt.question_id)).size,
    zileActive: peZi.size,
    surse,
    activitate: [...peZi.entries()]
      .map(([data, rand]): ActivitateZilnica => ({
        data,
        eticheta: etichetaData(rand.iso),
        raspunsuri: rand.raspunsuri,
        corecte: rand.corecte,
        pct: procent(rand.corecte, rand.raspunsuri),
      }))
      .sort((a, b) => a.data.localeCompare(b.data)),
  };
}
