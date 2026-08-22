import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { citesteSimulari, type SimRunRow } from '../lib/istoricSimulari';
import { supabase } from '../lib/supabase';
import type { AttemptRow } from '../lib/progres';
import { useAuth } from './authState';
import { ProgressContext, type ProgressValue } from './progressState';

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, loading: sesiuneaSeIncarca } = useAuth();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [simRuns, setSimRuns] = useState<SimRunRow[]>([]);
  const [incarcatePentru, setIncarcatePentru] = useState<string | null>(null);
  const [seIncarca, setSeIncarca] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incarca = useCallback(async () => {
    if (!user) return;
    const userId = user.id;
    setSeIncarca(true);
    setError(null);
    try {
      // Cele două citiri pleacă odată: istoricul simulărilor n-are de ce să
      // aștepte jurnalul, iar ecranul le folosește împreună.
      const [raspunsuri, lucrari] = await Promise.all([
        supabase
          .from('attempts')
          .select('question_id,is_correct,source,session_id,sim_run_id,answered_at')
          .order('answered_at', { ascending: true }),
        citesteSimulari(),
      ]);
      if (raspunsuri.error) throw raspunsuri.error;
      setAttempts((raspunsuri.data ?? []) as AttemptRow[]);
      setSimRuns(lucrari);
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
      setSimRuns([]);
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
      simRuns: user && incarcatePentru === user.id ? simRuns : [],
      loading: sesiuneaSeIncarca || seIncarca || Boolean(user && incarcatePentru !== user.id),
      error,
      reload: incarca,
    }),
    [attempts, simRuns, incarcatePentru, user, sesiuneaSeIncarca, seIncarca, error, incarca],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
