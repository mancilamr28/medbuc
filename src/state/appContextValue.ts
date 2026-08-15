import { createContext, useContext } from 'react';
import type { MaterieId } from '../data/chapters';
import type { Question } from '../data/questions';
import type { Screen } from '../lib/router';
import type { Session } from './useSession';
import type { Simulare } from './useSimulare';

export type Theme = 'light' | 'dark';

export interface AppValue {
  theme: Theme;
  toggleTheme: () => void;
  screen: Screen;
  go: (screen: Screen) => void;
  materie: MaterieId;
  setMaterie: (id: MaterieId) => void;
  /** Biblioteca întreagă; `session.banca` este doar domeniul sesiunii curente. */
  questions: Question[];
  session: Session;
  sim: Simulare;
}

export const AppContext = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp trebuie folosit în interiorul <AppProvider>');
  return ctx;
}
