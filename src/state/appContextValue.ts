import { createContext, useContext } from 'react';
import type { MaterieId } from '../data/chapters';
import type { Question } from '../data/questions';
import type { GrilaCatalog } from '../lib/continut';
import type { Screen } from '../lib/router';
import type { Taxonomie } from '../lib/taxonomie';
import type { TipuriGrile } from '../lib/tipuriGrile';
import type { Session } from './useSession';
import type { Simulare } from './useSimulare';
import type { CoadaRecapitulare } from './useCoadaRecapitulare';

export type Theme = 'light' | 'dark';

export interface AppValue {
  theme: Theme;
  toggleTheme: () => void;
  screen: Screen;
  go: (screen: Screen) => void;
  materie: MaterieId;
  setMaterie: (id: MaterieId) => void;
  /** Fixtură completă pentru drumul vechi; goală în aplicația reală. */
  questions: Question[];
  /** Index sigur pentru numărători, progres și recapitulare. */
  catalog: GrilaCatalog[];
  /** Materiile și capitolele, din bază. Etichetele de capitol vin de aici. */
  taxonomie: Taxonomie;
  /** Formatele de grilă, din bază. */
  tipuri: TipuriGrile;
  session: Session;
  recapitulare: CoadaRecapitulare;
  sim: Simulare;
}

export const AppContext = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp trebuie folosit în interiorul <AppProvider>');
  return ctx;
}
