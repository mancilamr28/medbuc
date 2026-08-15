import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { calculeazaProgres, type AttemptRow } from './progres';

const attempt = (partial: Partial<AttemptRow> & Pick<AttemptRow, 'question_id' | 'is_correct'>): AttemptRow => ({
  source: 'sesiune',
  session_id: 's1',
  sim_run_id: null,
  answered_at: '2026-08-15T10:00:00.000Z',
  ...partial,
});

describe('calculeazaProgres', () => {
  it('numără răspunsurile repetate, dar grilele încercate o singură dată', () => {
    const q = QUESTIONS[0]!;
    const rezultat = calculeazaProgres(
      [attempt({ question_id: q.id, is_correct: false }), attempt({ question_id: q.id, is_correct: true })],
      QUESTIONS,
    );

    expect(rezultat).toMatchObject({ raspunsuri: 2, corecte: 1, pct: 50 });
    expect(rezultat.capitole).toContainEqual(
      expect.objectContaining({ capId: q.capId, raspunsuri: 2, corecte: 1, grileIncercate: 1, pct: 50 }),
    );
  });

  it('grupează evoluția pe sesiuni, în ordine cronologică', () => {
    const [q1, q2] = QUESTIONS;
    const rezultat = calculeazaProgres(
      [
        attempt({ question_id: q1!.id, is_correct: true, session_id: 'tarziu', answered_at: '2026-08-16T10:00:00Z' }),
        attempt({ question_id: q1!.id, is_correct: true, session_id: 'devreme', answered_at: '2026-08-15T10:00:00Z' }),
        attempt({ question_id: q2!.id, is_correct: false, session_id: 'devreme', answered_at: '2026-08-15T10:00:00Z' }),
      ],
      QUESTIONS,
    );

    expect(rezultat.evolutie.map((p) => [p.id, p.pct])).toEqual([
      ['sesiune:devreme', 50],
      ['sesiune:tarziu', 100],
    ]);
  });

  it('nu atribuie unui capitol o grilă care lipsește din bibliotecă', () => {
    const rezultat = calculeazaProgres([attempt({ question_id: 'grila-retrasa', is_correct: true })], QUESTIONS);
    expect(rezultat).toMatchObject({ raspunsuri: 1, corecte: 1, pct: 100, capitole: [] });
  });
});
