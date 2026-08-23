import { createContext, useContext } from 'react';
import type { Question } from '../data/questions';
import type { GrilaCuStare } from '../lib/continut';
import type { Taxonomie } from '../lib/taxonomie';
import type { TipuriGrile } from '../lib/tipuriGrile';
import type { Colectii } from '../lib/colectii';

export interface ContentValue {
  grile: GrilaCuStare[];
  questions: Question[];
  /**
   * Materiile și capitolele, din bază.
   *
   * Se încarcă și fără sesiune — politicile publice din migrarea 0009 — fiindcă
   * pagina de prezentare numără capitole înainte de orice cont.
   */
  taxonomie: Taxonomie;
  /** Formatele de grilă, din bază: ce validează, ce randează, ce se poate amesteca. */
  tipuri: TipuriGrile;
  /** Loturile din care vin grilele: lucrări de admitere, simulări, culegeri. */
  colectii: Colectii;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const ContentContext = createContext<ContentValue | null>(null);

export function useContentOptional(): ContentValue | null {
  return useContext(ContentContext);
}

export function useContent(): ContentValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent trebuie folosit în interiorul <ContentProvider>');
  return ctx;
}
