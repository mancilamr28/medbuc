import { createContext, useContext } from 'react';
import type { AttemptRow } from '../lib/progres';

export interface ProgressValue {
  attempts: AttemptRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const ProgressContext = createContext<ProgressValue | null>(null);

export function useProgressOptional(): ProgressValue | null {
  return useContext(ProgressContext);
}
