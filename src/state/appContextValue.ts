import { createContext, useContext } from 'react';
import type { MaterieId } from '../data/chapters';
import type { GrilaCatalog } from '../lib/continut';
import type { Screen } from '../lib/router';
import type { Taxonomie } from '../lib/taxonomie';
import type { TipuriGrile } from '../lib/tipuriGrile';
import type { Colectii } from '../lib/colectii';
import type { useSimulareVeche } from './useSimulareVeche';
import type { CoadaRecapitulare } from './useCoadaRecapitulare';

export type Theme = 'light' | 'dark';

export interface AppValue {
  theme: Theme;
  toggleTheme: () => void;
  screen: Screen;
  go: (screen: Screen) => void;
  materie: MaterieId;
  setMaterie: (id: MaterieId) => void;
  /** Index sigur pentru numărători, progres și recapitulare. */
  catalog: GrilaCatalog[];
  /** Materiile și capitolele, din bază. Etichetele de capitol vin de aici. */
  taxonomie: Taxonomie;
  /** Formatele de grilă, din bază. */
  tipuri: TipuriGrile;
  /** Sursele organizate ale grilelor, cu nivelul lor de acces. */
  colectii: Colectii;
  recapitulare: CoadaRecapitulare;
  simulareVeche: ReturnType<typeof useSimulareVeche>;
}

export const AppContext = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp trebuie folosit în interiorul <AppProvider>');
  return ctx;
}
