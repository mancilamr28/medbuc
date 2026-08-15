import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { AttemptRow } from '../lib/progres';
import { useAuth } from './AuthContext';

interface ProgressValue {
  attempts: AttemptRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const ProgressContext = createContext<ProgressValue | null>(null);

export function useProgressOptional(): ProgressValue | null {
  return useContext(ProgressContext);
}

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
      const { data, error: queryError } = await supabase
        .from('attempts')
        .select('question_id,is_correct,source,session_id,sim_run_id,answered_at')
        .order('answered_at', { ascending: true });
      if (queryError) throw queryError;
      setAttempts((data ?? []) as AttemptRow[]);
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
