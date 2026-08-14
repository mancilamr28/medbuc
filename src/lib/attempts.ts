import { QUESTIONS } from '../data/questions';
import { supabase } from './supabase';
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

/**
 * Persistă o sesiune în două operații retry-safe. Dacă a doua operație eșuează,
 * repetarea sincronizării nu dublează răspunsurile datorită `client_key` unic.
 */
export async function syncFinishedSession(userId: string, session: Session, finishedAt: number): Promise<void> {
  const { error: sessionError } = await supabase.from('sessions').upsert(
    {
      id: session.id,
      user_id: userId,
      started_at: new Date(session.startedAt).toISOString(),
      finished_at: new Date(finishedAt).toISOString(),
      chapter_ids: [],
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (sessionError) throw sessionError;

  const attempts = attemptsFromSession(session, userId, finishedAt);
  if (attempts.length === 0) return;

  const { error: attemptsError } = await supabase
    .from('attempts')
    .upsert(attempts, { onConflict: 'client_key', ignoreDuplicates: true });
  if (attemptsError) throw attemptsError;
}
