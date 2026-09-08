import { describe, expect, it } from 'vitest';
import { TIPURI_SEED } from '../data/tipuriSeed';
import { pregatesteJson, scrieJsonPregatit, modelJson } from './importJson';

describe('fișiere JSON pentru importul ghidat', () => {
  it('completează numai metadatele absente, fără să inventeze un răspuns', () => {
    const r = pregatesteJson(JSON.stringify([{ text: 'Una' }, { id: 'existenta', capId: 'chim-alcooli', tip: 'grupat', colectie: 'carte', status: 'publicata' }]), 'lot-1', 'bio-nervos', 'simplu');
    expect(r.grile[0]).toEqual({ text: 'Una', id: 'lot-1-1', capId: 'bio-nervos', tip: 'simplu' });
    expect(r.grile[1]).toMatchObject({ id: 'existenta', capId: 'chim-alcooli', tip: 'grupat', colectie: 'carte', status: 'publicata' });
  });
  it('păstrează identitatea după corectare, reordonare și reîncercare', () => {
    const r = pregatesteJson('[{"text":"Una"},{"text":"Două"}]', 'lot', 'bio-nervos', 'simplu');
    r.grile.reverse();
    const recitit = pregatesteJson(scrieJsonPregatit(r), 'alt-lot', '', 'grupat');
    expect(recitit.grile.map((g) => g['id'])).toEqual(['lot-2', 'lot-1']);
  });
  it('păstrează numele, durata și ordinea unui test', () => {
    const r = pregatesteJson('{"test":{"nume":"Simulare","durataMinute":90},"grile":[{"id":"b"},{"id":"a"}]}', 'lot', '', 'simplu');
    expect(r.test).toEqual({ nume: 'Simulare', durata: '90' });
    expect(pregatesteJson(scrieJsonPregatit(r), 'nou', '', 'simplu')).toEqual(r);
    expect(r.grile.map((g) => g['id'])).toEqual(['b', 'a']);
  });
  it('respinge structurile greșite și durata invalidă înainte de orice salvare', () => {
    for (const text of ['{', '{}', '[null]', '[4]', '{"test":{"nume":""},"grile":[]}', '{"test":{"nume":"T","durataMinute":1.5},"grile":[]}']) {
      expect(() => pregatesteJson(text, 'lot', '', 'simplu')).toThrow();
    }
  });
  it('modelele pentru întrebări și teste pot fi încărcate, inclusiv formatul grupat', () => {
    for (const tip of TIPURI_SEED.lista) {
      for (const test of [false, true]) {
        const r = pregatesteJson(modelJson(tip, test), 'lot', 'bio-nervos', tip.id);
        expect(r.grile).toHaveLength(1);
        expect(r.grile[0]!['tip']).toBe(tip.id);
        expect(!!r.test).toBe(test);
        if (tip.cereEnunturi) expect(r.grile[0]!['enunturi']).toHaveLength(tip.nrEnunturi!);
      }
    }
  });
});
