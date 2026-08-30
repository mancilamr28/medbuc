import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  citesteTestePredefiniteAdmin,
  listaTestePredefinite,
  salveazaTestPredefinit,
} from './testePredefinite';

const baza = vi.hoisted(() => ({
  apeluri: [] as { nume: string; args: Record<string, unknown> }[],
  data: null as unknown,
  eroare: null as { message: string } | null,
}));

vi.mock('./supabase', () => ({
  supabase: {
    rpc: async (nume: string, args: Record<string, unknown>) => {
      baza.apeluri.push({ nume, args });
      return { data: baza.data, error: baza.eroare };
    },
  },
}));

beforeEach(() => {
  baza.apeluri = [];
  baza.data = null;
  baza.eroare = null;
});

describe('testele predefinite în client', () => {
  it('citește lista publică fără să trimită filtre inventate', async () => {
    baza.data = [{ id: 'admitere-2026', nume: 'Admitere 2026' }];

    await expect(listaTestePredefinite()).resolves.toEqual(baza.data);
    expect(baza.apeluri[0]).toEqual({ nume: 'lista_teste_predefinite', args: {} });
  });

  it('citește inventarul complet numai prin poarta de administrator', async () => {
    baza.data = [{ id: 'admitere-2026', grile: ['bio-nervos-01'] }];

    await citesteTestePredefiniteAdmin();
    expect(baza.apeluri[0]).toEqual({ nume: 'citeste_teste_predefinite_admin', args: {} });
  });

  it('salvează definiția într-un singur payload', async () => {
    baza.data = 'admitere-2026';
    const payload = {
      id: 'admitere-2026',
      centru_id: 'umfcd',
      nume: 'Admitere 2026',
      mod_selectie: 'fix' as const,
      grile: ['bio-nervos-01'],
      acces: 'liber' as const,
      publicat: true,
    };

    await expect(salveazaTestPredefinit(payload)).resolves.toBe('admitere-2026');
    expect(baza.apeluri[0]).toEqual({
      nume: 'salveaza_test_predefinit',
      args: { payload },
    });
  });

  it('nu ascunde eroarea venită de la server', async () => {
    baza.eroare = { message: 'Lista de grile conține duplicate' };

    await expect(listaTestePredefinite()).rejects.toThrow(/duplicate/i);
  });
});
