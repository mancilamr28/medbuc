import { QUESTIONS } from '../data/questions';
import type { Session } from '../state/useSession';

export interface AttemptInsert {
  client_key: string;
  user_id: string;
  question_id: string;
  chosen: string;
  is_correct: boolean;
  source: 'sesiune';
  session_id: string;
  answered_at: string;
}
/** Transformă răspunsurile unei sesiuni într-un jurnal de încercări. */
export function attemptsFromSession(session: Session, userId: string, finishedAt: number): AttemptInsert[] {
  const answeredAt = new Date(finishedAt).toISOString();
  return Object.entries(session.answers).flatMap(([index, chosen]) => {
    const question = QUESTIONS[Number(index)];
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
        answered_at: answeredAt,
      },
    ];
  });
}

