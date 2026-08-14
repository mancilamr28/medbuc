import { attemptsFromSession } from './attempts';
import { supabase } from './supabase';
import type { Session } from '../state/useSession';

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
