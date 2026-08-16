import type { Recapitulare } from '../state/useRecapitulare';
import { attemptsFromRecapitulare } from './attempts';
import { supabase } from './supabase';

/** Persistă recapitularea fără tabel nou: sesiune proprie + attempts cu sursa dedicată. */
export async function syncFinishedRecapitulare(
  userId: string,
  recapitulare: Pick<Recapitulare, 'id' | 'banca' | 'answers' | 'startedAt'>,
  finishedAt: number,
): Promise<void> {
  const chapterIds = [...new Set(recapitulare.banca.map((question) => question.capId))];
  const { error: sessionError } = await supabase.from('sessions').upsert(
    {
      id: recapitulare.id,
      user_id: userId,
      started_at: new Date(recapitulare.startedAt).toISOString(),
      finished_at: new Date(finishedAt).toISOString(),
      chapter_ids: chapterIds,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (sessionError) throw sessionError;

  const attempts = attemptsFromRecapitulare(recapitulare, userId, finishedAt);
  if (attempts.length === 0) return;
  const { error: attemptsError } = await supabase
    .from('attempts')
    .upsert(attempts, { onConflict: 'client_key', ignoreDuplicates: true });
  if (attemptsError) throw attemptsError;
}
