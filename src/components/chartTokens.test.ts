import { describe, expect, it } from 'vitest';
import { PRAG_RELUARE, barColor } from './chartTokens';

describe('barColor', () => {
  /**
   * Invariantul care lipsea: culoarea barei și linia verticală din grafic
   * vorbesc despre același prag.
   *
   * Se verifică tot intervalul, nu câteva valori alese de mână — vechile praguri
   * (65 și 80) pică aici oriunde ar fi reintroduse, fără să trebuiască ghicit
   * dinainte unde anume.
   */
  it('schimbă culoarea exact la PRAG_RELUARE, pe tot intervalul', () => {
    for (let pct = 0; pct <= 100; pct += 1) {
      expect({ pct, subPrag: barColor(pct) === 'var(--bad)' }).toEqual({ pct, subPrag: pct < PRAG_RELUARE });
    }
  });

  it('trece de la „sub prag" la „peste" chiar pe prag', () => {
    expect(barColor(PRAG_RELUARE - 1)).toBe('var(--bad)');
    expect(barColor(PRAG_RELUARE)).toBe('var(--brand)');
  });

  /**
   * Fără treaptă de „excelent": aplicația n-are un asemenea prag, iar unul
   * inventat aici ar readuce exact necorelarea reparată.
   */
  it('nu afirmă mai mult de două stări', () => {
    const culori = new Set(Array.from({ length: 101 }, (_, pct) => barColor(pct)));
    expect(culori).toEqual(new Set(['var(--bad)', 'var(--brand)']));
  });
});
