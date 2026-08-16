import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import type { AttemptRow } from './progres';
import { calculeazaStatistici } from './statistici';

const ACUM = Date.parse('2026-08-16T12:00:00.000Z');
const ZI = 24 * 60 * 60 * 1000;

const attempt = (
  questionId: string,
  isCorrect: boolean,
  answeredAt: number,
  source: AttemptRow['source'] = 'sesiune',
): AttemptRow => ({
  question_id: questionId,
  is_correct: isCorrect,
  source,
  session_id: source === 'simulare' ? null : `${source}-1`,
  sim_run_id: source === 'simulare' ? 'sim-1' : null,
  answered_at: new Date(answeredAt).toISOString(),
});

describe('calculeazaStatistici', () => {
  it('filtrează perioada înainte să calculeze toate cifrele', () => {
    const [q1, q2] = QUESTIONS;
    const rezultat = calculeazaStatistici(
      [
        attempt(q1!.id, true, ACUM - 2 * ZI),
        attempt(q2!.id, false, ACUM - 8 * ZI),
      ],
      QUESTIONS,
      '7z',
      ACUM,
    );

    expect(rezultat.progres).toMatchObject({ raspunsuri: 1, corecte: 1, pct: 100 });
    expect(rezultat).toMatchObject({ grileUnice: 1, zileActive: 1 });
  });

  it('numără separat sursele și grupează activitatea pe zi', () => {
    const [q1, q2] = QUESTIONS;
    const rezultat = calculeazaStatistici(
      [
        attempt(q1!.id, true, ACUM - 2_000, 'sesiune'),
        attempt(q2!.id, false, ACUM - 1_000, 'recapitulare'),
        attempt(q1!.id, true, ACUM - ZI, 'simulare'),
      ],
      QUESTIONS,
      'toate',
      ACUM,
    );

    expect(rezultat.surse).toEqual({ sesiune: 1, simulare: 1, recapitulare: 1 });
    expect(rezultat.activitate.map((zi) => [zi.raspunsuri, zi.corecte, zi.pct])).toEqual([
      [1, 1, 100],
      [2, 1, 50],
    ]);
  });

  it('ignoră datele invalide și răspunsurile din viitor', () => {
    const q = QUESTIONS[0]!;
    const invalid: AttemptRow = { ...attempt(q.id, true, ACUM), answered_at: 'nu-e-dată' };
    const rezultat = calculeazaStatistici(
      [invalid, attempt(q.id, true, ACUM + 1_000)],
      QUESTIONS,
      'toate',
      ACUM,
    );

    expect(rezultat.progres.raspunsuri).toBe(0);
    expect(rezultat.activitate).toEqual([]);
  });
});
