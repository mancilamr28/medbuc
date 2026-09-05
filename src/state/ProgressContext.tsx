import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { citesteTot } from '../lib/paginare';
import { supabase } from '../lib/supabase';
import type { AttemptRow } from '../lib/progres';
import { useAuth } from './authState';
import { ProgressContext, type ProgressValue } from './progressState';

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, loading: sesiuneaSeIncarca } = useAuth();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [incarcatePentru, setIncarcatePentru] = useState<string | null>(null);
  const [seIncarca, setSeIncarca] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incarca = useCallback(async () => {
    if (!user) return;
    const userId = user.id;
    setSeIncarca(true);
    setError(null);
    try {
      const raspunsuri = await citesteTot<AttemptRow>(async (de, la) => {
          const r = await supabase
            .from('attempts')
            .select('question_id,is_correct,source,answered_at', { count: 'exact' })
            .order('answered_at', { ascending: true })
            .range(de, la);
          return { data: r.data as AttemptRow[] | null, error: r.error, count: r.count };
        });
      setAttempts(raspunsuri);
    } catch (e: unknown) {
      setError('Nu am putut încărca progresul tău.');
      console.warn('[medbuc] Încărcarea progresului a eșuat.', e);
    } finally {
      setIncarcatePentru(userId);
      setSeIncarca(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAttempts([]);
      setIncarcatePentru(null);
      setError(null);
      return;
    }
    void incarca();
  }, [incarca, user]);

  const value = useMemo<ProgressValue>(
    () => ({
      // La schimbarea contului, rândurile vechi devin invizibile chiar în
      // primul render; nu așteptăm efectul ca să ascundă progresul altcuiva.
      attempts: user && incarcatePentru === user.id ? attempts : [],
      loading: sesiuneaSeIncarca || seIncarca || Boolean(user && incarcatePentru !== user.id),
      error,
      reload: incarca,
    }),
    [attempts, incarcatePentru, user, sesiuneaSeIncarca, seIncarca, error, incarca],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
