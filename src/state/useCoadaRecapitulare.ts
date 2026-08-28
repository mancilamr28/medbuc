import { useMemo } from 'react';
import type { GrilaCatalog } from '../lib/continut';
import { calculeazaRecapitulare, type GrilaDeRecapitulat } from '../lib/recapitulare';
import type { AttemptRow } from '../lib/progres';

/**
 * Coada inteligentă rămâne o derivare din jurnal; numai rezolvarea s-a mutat.
 *
 * Vechiul hook ținea și o mini-lucrare în memoria browserului, ceea ce îl obliga
 * să primească răspunsurile întregii biblioteci. Acesta calculează doar ce este
 * scadent. La apăsarea „Începe”, ecranul cere o lucrare reală serverului.
 */
export interface CoadaRecapitulare {
  items: GrilaDeRecapitulat[];
  scadente: GrilaDeRecapitulat[];
}

export function useCoadaRecapitulare(
  acum: number,
  catalog: readonly GrilaCatalog[],
  attempts: readonly AttemptRow[],
): CoadaRecapitulare {
  const items = useMemo(
    () => calculeazaRecapitulare(attempts, catalog, acum),
    [acum, attempts, catalog],
  );
  const scadente = useMemo(() => items.filter((item) => item.scadenta), [items]);
  return useMemo(() => ({ items, scadente }), [items, scadente]);
}
