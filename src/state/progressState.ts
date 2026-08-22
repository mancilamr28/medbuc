import { createContext, useContext } from 'react';
import type { SimRunRow } from '../lib/istoricSimulari';
import type { AttemptRow } from '../lib/progres';

export interface ProgressValue {
  attempts: AttemptRow[];
  /**
   * Lucrările de simulare predate. Stau lângă răspunsuri fiindcă istoricul se
   * derivă din amândouă — `sim_runs` dă numitorul, `attempts` numărătorul — și
   * fiindcă `reload()` de după o predare trebuie să le împrospăteze pe amândouă,
   * altfel lucrarea tocmai dată n-ar apărea în listă până la o reîncărcare.
   */
  simRuns: SimRunRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const ProgressContext = createContext<ProgressValue | null>(null);

export function useProgressOptional(): ProgressValue | null {
  return useContext(ProgressContext);
}
