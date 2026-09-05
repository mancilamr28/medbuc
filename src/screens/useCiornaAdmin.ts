import { useState } from 'react';
import { usePersistentState } from '../lib/hooks';
import { OPTION_KEYS } from '../data/questions';
import { ciornaGoala, type Ciorna } from './adminCiorna';

interface LucruAdmin {
  ciorna: Ciorna;
  pas: number;
  raspunsAles: boolean;
  modificata: boolean;
  editez: string | null;
}

const obiect = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Recuperarea acceptă și o întrebare incompletă, dar niciodată o structură stricată. */
export function esteLucruAdmin(v: unknown): v is LucruAdmin {
  if (!obiect(v) || !obiect(v.ciorna)) return false;
  const c = v.ciorna;
  return ['id', 'capId', 'tip', 'text', 'expl', 'src', 'colectie', 'an'].every((k) => typeof c[k] === 'string')
    && ['materie', 'culegere', 'subiect_oficial'].includes(String(c.sursa))
    && OPTION_KEYS.includes(c.correct as typeof OPTION_KEYS[number])
    && Array.isArray(c.enunturi) && c.enunturi.every((e) => typeof e === 'string')
    && obiect(c.opts) && OPTION_KEYS.every((k) => {
      const o = (c.opts as Record<string, unknown>)[k];
      return obiect(o) && typeof o.text === 'string' && typeof o.why === 'string';
    })
    && [0, 1, 2].includes(v.pas as number)
    && typeof v.raspunsAles === 'boolean' && typeof v.modificata === 'boolean'
    && (v.editez === null || typeof v.editez === 'string');
}

export function useCiornaAdmin(userId: string) {
  const [initial] = useState<LucruAdmin>(() => ({
    ciorna: { ...ciornaGoala(''), id: `grila-${crypto.randomUUID()}` },
    pas: 0, raspunsAles: false, modificata: false, editez: null,
  }));
  const [lucru, scrie] = usePersistentState(`medbuc.admin.ciorna.v1.${userId}`, initial, esteLucruAdmin);
  const camp = <K extends keyof LucruAdmin>(key: K) =>
    (valoare: LucruAdmin[K] | ((vechi: LucruAdmin[K]) => LucruAdmin[K])) => scrie((vechi) => ({
      ...vechi,
      [key]: typeof valoare === 'function' ? valoare(vechi[key]) : valoare,
    }));
  return { ...lucru, setCiorna: camp('ciorna'), setPas: camp('pas'),
    setRaspunsAles: camp('raspunsAles'), setModificata: camp('modificata'), setEditez: camp('editez') };
}
