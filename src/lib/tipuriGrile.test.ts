import { describe, expect, it } from 'vitest';
import { TIPURI_SEED, TIPURI_SEED_RANDURI } from '../data/tipuriSeed';
import { TIPURI_GOALE, construiesteTipuri } from './tipuriGrile';

describe('construiesteTipuri', () => {
  it('ordonează după position și rezolvă după id', () => {
    const t = construiesteTipuri([
      { ...TIPURI_SEED_RANDURI[1]!, position: 0 },
      { ...TIPURI_SEED_RANDURI[0]!, position: 1 },
    ]);

    expect(t.lista.map((x) => x.id)).toEqual(['grupat', 'simplu']);
    expect(t.tip('simplu')?.nume).toBe('Complement simplu');
  });

  it('cade pe id-ul brut pentru un tip pe care nu-l cunoaște', () => {
    expect(TIPURI_SEED.eticheta('flashcard')).toBe('flashcard');
    expect(TIPURI_SEED.tip('flashcard')).toBeUndefined();
  });

  /**
   * Regula de siguranță din spatele generării testelor: la complementul grupat
   * textele variantelor sunt cheia fixă a formatului („1, 2, 3", „1, 3", …), deci
   * amestecarea lor ar rupe grila. Steagul stă pe **tip**, nu pe grilă — 110
   * grile ar fi însemnat 110 ocazii de a-l pune greșit.
   */
  it('marchează complementul grupat ca neamestecabil, iar simplul ca amestecabil', () => {
    expect(TIPURI_SEED.tip('grupat')?.permiteAmestecare).toBe(false);
    expect(TIPURI_SEED.tip('grupat')?.sablonOptiuni).toEqual(['1, 2, 3', '1, 3', '2, 4', 'doar 4', 'toate']);
    expect(TIPURI_SEED.tip('simplu')?.permiteAmestecare).toBe(true);
    expect(TIPURI_SEED.tip('simplu')?.sablonOptiuni).toBeNull();
  });

  /**
   * Invariantul pe care se sprijină siguranța: un tip cu variante fixe nu poate
   * fi și amestecabil. Baza îl impune printr-un CHECK; aici se verifică fixtura,
   * ca un tip adăugat de mână în teste să nu poată descrie ceva imposibil.
   */
  it('nu are niciun tip cu șablon fix și amestecare permisă', () => {
    for (const tip of TIPURI_SEED.lista) {
      if (tip.sablonOptiuni !== null) expect(tip.permiteAmestecare).toBe(false);
      expect(tip.cereEnunturi).toBe(tip.nrEnunturi !== null);
    }
  });

  it('nu aruncă pe o listă goală', () => {
    expect(TIPURI_GOALE.lista).toEqual([]);
    expect(TIPURI_GOALE.eticheta('simplu')).toBe('simplu');
    expect(TIPURI_GOALE.tip('simplu')).toBeUndefined();
  });
});
