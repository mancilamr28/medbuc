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

  it('calculează stăpânirea zilnică fără ca sesiunile sau repetările imediate să o poată umfla', () => {
    const [q1, q2, q3, q4, q5] = QUESTIONS;
    const rezultat = calculeazaProgres(
      [
        attempt({ question_id: q1!.id, is_correct: true, session_id: 'a', answered_at: '2026-08-15T09:00:00Z' }),
        attempt({ question_id: q2!.id, is_correct: true, session_id: 'b', answered_at: '2026-08-15T09:10:00Z' }),
        attempt({ question_id: q3!.id, is_correct: true, session_id: 'c', answered_at: '2026-08-15T09:20:00Z' }),
        attempt({ question_id: q4!.id, is_correct: false, session_id: 'd', answered_at: '2026-08-15T09:30:00Z' }),
        attempt({ question_id: q5!.id, is_correct: false, session_id: 'e', answered_at: '2026-08-15T09:40:00Z' }),
        // Reîncercarea imediată nu rescrie primul răspuns al zilei.
        attempt({ question_id: q5!.id, is_correct: true, session_id: 'f', answered_at: '2026-08-15T09:50:00Z' }),
        // În ziua următoare, grila poate demonstra că informația a fost reținută.
        attempt({ question_id: q5!.id, is_correct: true, session_id: 'g', answered_at: '2026-08-16T10:00:00Z' }),
      ],
      QUESTIONS,
    );

    expect(rezultat.evolutie.map((p) => [p.id, p.pct, p.grile])).toEqual([
      ['2026-08-15', 60, 5],
      ['2026-08-16', 80, 5],
    ]);
  });

  it('nu publică un procent de stăpânire bazat pe mai puțin de cinci grile distincte', () => {
    const attempts = QUESTIONS.slice(0, 4).map((q, index) =>
      attempt({ question_id: q.id, is_correct: true, answered_at: `2026-08-1${index + 1}T10:00:00Z` }),
    );

    expect(calculeazaProgres(attempts, QUESTIONS).evolutie).toEqual([]);
  });

  it('ignoră în evoluție datele invalide și grilele care nu mai sunt în bibliotecă', () => {
    const valide = QUESTIONS.slice(0, 5).map((q) => attempt({ question_id: q.id, is_correct: true }));
    const rezultat = calculeazaProgres(
      [
        ...valide,
        attempt({ question_id: QUESTIONS[5]!.id, is_correct: true, answered_at: 'nu-e-dată' }),
        attempt({ question_id: 'grila-retrasa', is_correct: true }),
      ],
      QUESTIONS,
    );

    expect(rezultat.evolutie).toHaveLength(1);
    expect(rezultat.evolutie[0]).toMatchObject({ pct: 100, grile: 5 });
  });

  it('nu atribuie unui capitol o grilă care lipsește din bibliotecă', () => {
    const rezultat = calculeazaProgres([attempt({ question_id: 'grila-retrasa', is_correct: true })], QUESTIONS);
    expect(rezultat).toMatchObject({ raspunsuri: 1, corecte: 1, pct: 100, capitole: [] });
  });
});
