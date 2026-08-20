import { attemptsFromSimulare } from './attempts';
import { supabase } from './supabase';
import type { Question, QuestionId } from '../data/questions';
import type { SimRun } from '../state/useSimulare';

/**
 * Persistă o lucrare de simulare predată, în două operații retry-safe.
 *
 * Până acum nu exista deloc: o lucrare de 100 de grile se termina, arăta
 * scorul, și dispărea la „Simulare nouă". Consecințele erau vizibile în trei
 * locuri — istoricul lucrărilor rămânea gol pentru totdeauna, rândul
 * „Simulări" din Statistici era structural zero, iar greșelile dintr-un examen
 * simulat nu ajungeau niciodată în Recapitulare, adică exact grilele pe care
 * elevul trebuia să le repete.
 *
 * `sim_runs` se scrie cu `ignoreDuplicates`, iar răspunsurile pe `client_key`,
 * deci o reîncercare după o cădere de rețea nu dublează nimic.
 */
export async function syncFinishedSimulare(
  userId: string,
  run: SimRun,
  finishedAt: number,
  byId: ReadonlyMap<QuestionId, Question>,
): Promise<void> {
  const { error: runError } = await supabase.from('sim_runs').upsert(
    {
      id: run.id,
      user_id: userId,
      started_at: new Date(run.startedAt).toISOString(),
      ends_at: new Date(run.endsAt).toISOString(),
      finished_at: new Date(finishedAt).toISOString(),
      config: run.config,
      // Ordinea completă, inclusiv grilele fără răspuns: e numitorul
      // punctajului UMFCD, deci procentul rămâne derivabil fără să fie stocat.
      question_ids: run.order,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (runError) throw runError;

  const attempts = attemptsFromSimulare(run, userId, finishedAt, byId);
  if (attempts.length === 0) return;

  const { error: attemptsError } = await supabase
    .from('attempts')
    .upsert(attempts, { onConflict: 'client_key', ignoreDuplicates: true });
  if (attemptsError) throw attemptsError;
}
