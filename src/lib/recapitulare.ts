import type { GrilaCatalog } from './continut';
import type { AttemptRow } from './progres';

const ZI_MS = 24 * 60 * 60 * 1000;

/** Intervalele simple și explicabile ale repetării: 1, 3, 7, 14, apoi 30 de zile. */
export const INTERVALE_RECAPITULARE_ZILE = [1, 3, 7, 14, 30] as const;

export interface GrilaDeRecapitulat {
  question: GrilaCatalog;
  /** Momentul de la care grila trebuie să revină. */
  scadentaLa: number;
  /** Câte răspunsuri corecte consecutive are după ultima greșeală. */
  serieCorecta: number;
  scadenta: boolean;
}

/**
 * Derivă repetarea numai din jurnalul imuabil de răspunsuri.
 *
 * O grilă intră în recapitulare abia după cel puțin o greșeală. O nouă
 * greșeală o face scadentă imediat; răspunsurile corecte consecutive mută
 * următoarea apariție la 1, 3, 7, 14 și apoi 30 de zile. Nu există o a doua
 * stare care să poată contrazice jurnalul din `attempts`.
 */
export function calculeazaRecapitulare(
  attempts: readonly AttemptRow[],
  questions: readonly GrilaCatalog[],
  acum: number,
): GrilaDeRecapitulat[] {
  const intrebari = new Map(questions.map((question) => [question.id, question]));
  const istoric = new Map<string, { corect: boolean; la: number }[]>();

  for (const attempt of attempts) {
    if (!intrebari.has(attempt.question_id)) continue;
    const la = Date.parse(attempt.answered_at);
    if (!Number.isFinite(la)) continue;
    const randuri = istoric.get(attempt.question_id) ?? [];
    randuri.push({ corect: attempt.is_correct, la });
    istoric.set(attempt.question_id, randuri);
  }

  const rezultat: GrilaDeRecapitulat[] = [];
  for (const [questionId, randuriNesortate] of istoric) {
    const question = intrebari.get(questionId);
    if (!question || !randuriNesortate.some((rand) => !rand.corect)) continue;

    const randuri = [...randuriNesortate].sort((a, b) => a.la - b.la);
    const ultima = randuri.at(-1)!;
    let serieCorecta = 0;
    for (let i = randuri.length - 1; i >= 0 && randuri[i]!.corect; i -= 1) serieCorecta += 1;

    const zile = (ultima.corect
      ? INTERVALE_RECAPITULARE_ZILE[
          Math.min(Math.max(serieCorecta - 1, 0), INTERVALE_RECAPITULARE_ZILE.length - 1)
        ]
      : 0) ?? INTERVALE_RECAPITULARE_ZILE.at(-1)!;
    const scadentaLa = ultima.la + zile * ZI_MS;
    rezultat.push({ question, scadentaLa, serieCorecta, scadenta: scadentaLa <= acum });
  }

  return rezultat.sort(
    (a, b) => a.scadentaLa - b.scadentaLa || a.question.id.localeCompare(b.question.id, 'ro'),
  );
}

export function urmatoareaScadenta(items: readonly GrilaDeRecapitulat[]): number | null {
  return items.find((item) => !item.scadenta)?.scadentaLa ?? null;
}
