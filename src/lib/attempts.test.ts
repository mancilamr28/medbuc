import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { attemptsFromSession } from './attempts';
import type { Session } from '../state/useSession';

const session = (answers: Record<number, 'A' | 'B' | 'C' | 'D' | 'E'>): Session => ({
  id: '00000000-0000-0000-0000-000000000001',
  capitole: [],
  qi: 0,
  question: QUESTIONS[0]!,
  questions: QUESTIONS,
  total: QUESTIONS.length,
  answers,
  revealed: {},
  marked: {},
  answer: answers[0],
  isRevealed: false,
  isMarked: false,
  isCorrect: false,
  startedAt: 1_000,
  finishedAt: 2_000,
  finished: true,
  pick: () => undefined,
  primary: () => undefined,
  next: () => undefined,
  prev: () => undefined,
  goTo: () => undefined,
  toggleMark: () => undefined,
  finish: () => undefined,
  start: () => undefined,
  restart: () => undefined,
  tally: { corecte: 0, gresite: 0, marcate: 0 },
  score: { corecte: 0, gresite: 0, neraspunse: QUESTIONS.length, total: QUESTIONS.length, pct: 0, durataMs: 0 },
});

describe('attemptsFromSession', () => {
  it('scrie doar răspunsurile date și păstrează cheia retry-safe', () => {
    const rows = attemptsFromSession(session({ 0: QUESTIONS[0]!.correct, 2: 'A' }), 'user-1', 2_000);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      client_key: '00000000-0000-0000-0000-000000000001:0',
      user_id: 'user-1',
      question_id: QUESTIONS[0]!.id,
      is_correct: true,
      source: 'sesiune',
      session_id: '00000000-0000-0000-0000-000000000001',
    });
    expect(rows[1]!.client_key).toBe('00000000-0000-0000-0000-000000000001:2');
    expect(rows[1]!.is_correct).toBe(false);
  });
});
