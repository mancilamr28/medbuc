import { createContext, useContext } from 'react';
import type { GrilaCatalog } from '../lib/continut';
import type { Taxonomie } from '../lib/taxonomie';
import type { TipuriGrile } from '../lib/tipuriGrile';
import type { Colectii } from '../lib/colectii';

export interface ContentValue {
  /** Indexul sigur al bibliotecii: numai identitate și capitol, fără răspunsuri. */
  catalog: GrilaCatalog[];
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
  /**
   * Reîncarcă taxonomia și colecțiile.
   *
   * Separat de `reload`, care aduce biblioteca de grile: ecranele de
   * administrare a materiilor și colecțiilor schimbă structura, nu conținutul,
   * iar o reîncărcare a celor 181 de grile după fiecare redenumire ar fi muncă
   * degeaba.
   */
  reloadStructura: () => Promise<void>;
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
