import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import type { AttemptRow } from './progres';
import { calculeazaRecapitulare, INTERVALE_RECAPITULARE_ZILE } from './recapitulare';

const ZI = 24 * 60 * 60 * 1000;
const ACUM = Date.parse('2026-08-16T12:00:00.000Z');

const attempt = (questionId: string, isCorrect: boolean, answeredAt: number): AttemptRow => ({
  question_id: questionId,
  is_correct: isCorrect,
  source: 'sesiune',
  session_id: 's1',
  sim_run_id: null,
  answered_at: new Date(answeredAt).toISOString(),
});
describe('calculeazaRecapitulare', () => {
  it('include imediat o grilă greșită, dar nu grilele neîncercate sau mereu corecte', () => {
    const [gresita, corecta] = QUESTIONS;
    const rezultat = calculeazaRecapitulare(
      [attempt(gresita!.id, false, ACUM - 1_000), attempt(corecta!.id, true, ACUM - 10 * ZI)],
      QUESTIONS,
      ACUM,
    );

    expect(rezultat).toHaveLength(1);
    expect(rezultat[0]).toMatchObject({ question: gresita, serieCorecta: 0, scadenta: true });
  });

  it('mută grila la 1, 3, 7, 14 și 30 de zile după răspunsuri corecte consecutive', () => {
    const question = QUESTIONS[0]!;

    INTERVALE_RECAPITULARE_ZILE.forEach((zile, index) => {
      const randuri = [attempt(question.id, false, ACUM - 40 * ZI)];
      for (let i = 0; i <= index; i += 1) randuri.push(attempt(question.id, true, ACUM));
      const [item] = calculeazaRecapitulare(randuri, QUESTIONS, ACUM);

      expect(item).toMatchObject({ serieCorecta: index + 1, scadenta: false });
      expect(item!.scadentaLa).toBe(ACUM + zile * ZI);
    });
  });

  it('o nouă greșeală resetează seria și devine din nou scadentă imediat', () => {
    const question = QUESTIONS[0]!;
    const rezultat = calculeazaRecapitulare(
      [
        attempt(question.id, false, ACUM - 10 * ZI),
        attempt(question.id, true, ACUM - 5 * ZI),
        attempt(question.id, false, ACUM - 500),
      ],
      QUESTIONS,
      ACUM,
    );

    expect(rezultat[0]).toMatchObject({ serieCorecta: 0, scadenta: true, scadentaLa: ACUM - 500 });
  });

  it('ignoră istoricul unei grile care nu mai există în biblioteca publicată', () => {
    expect(
      calculeazaRecapitulare([attempt('grila-retrasa', false, ACUM - ZI)], QUESTIONS, ACUM),
    ).toEqual([]);
  });
});
