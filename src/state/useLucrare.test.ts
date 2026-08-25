import { describe, expect, it } from 'vitest';
import type { OptionKey } from '../data/questions';
import type { GrilaDinLucrare } from '../lib/lucrari';
import { grilaDin, randuiesteOptiuni, secundeRamase, verificaPeLoc } from './useLucrare';

const OPT = (...chei: OptionKey[]) => chei.map((k) => ({ key: k, text: `text ${k}` }));

describe('ordinea variantelor', () => {
  it('păstrează ordinea firească când lucrarea n-a amestecat nimic', () => {
    expect(randuiesteOptiuni(OPT('A', 'B', 'C'), null)).toEqual([
      ['A', 'text A'],
      ['B', 'text B'],
      ['C', 'text C'],
    ]);
  });

  it('așază variantele în ordinea scrisă pe lucrare', () => {
    expect(randuiesteOptiuni(OPT('A', 'B', 'C'), ['C', 'A', 'B'])).toEqual([
      ['C', 'text C'],
      ['A', 'text A'],
      ['B', 'text B'],
    ]);
  });

  /**
   * O nepotrivire între instantaneu și bibliotecă nu are voie să facă variante
   * să dispară de pe ecran: o grilă cu patru variante afișate din cinci arată
   * corect și e greșită.
   */
  it('nu pierde o variantă pe care ordinea n-o pomenește', () => {
    expect(randuiesteOptiuni(OPT('A', 'B', 'C'), ['C', 'A'])).toEqual([
      ['C', 'text C'],
      ['A', 'text A'],
      ['B', 'text B'],
    ]);
  });

  it('ignoră o literă din ordine care nu are variantă', () => {
    expect(randuiesteOptiuni(OPT('A', 'B'), ['E', 'B', 'A'])).toEqual([
      ['B', 'text B'],
      ['A', 'text A'],
    ]);
  });
});

const RAND: GrilaDinLucrare = {
  position: 3,
  question_id: 'bio-nervos-01',
  chosen: 'B',
  revealed: false,
  marked: true,
  answered_at: null,
  option_order: null,
  text: 'Enunțul grilei',
  enunturi: null,
  tip_id: 'simplu',
  chapter_id: 'bio-nervos',
  optiuni: OPT('A', 'B'),
};

describe('grila adusă din lucrare', () => {
  it('duce poziția, alegerea și semnul mai departe', () => {
    expect(grilaDin(RAND)).toMatchObject({
      pozitie: 3,
      questionId: 'bio-nervos-01',
      aleasa: 'B',
      verificata: false,
      marcata: true,
      opts: [
        ['A', 'text A'],
        ['B', 'text B'],
      ],
    });
  });

  /**
   * Lipsa răspunsului corect e informație, nu o scăpare: la o simulare în curs
   * serverul chiar nu-l trimite. O cheie prezentă cu valoarea `undefined` ar
   * arăta la fel într-un `toMatchObject`, dar nu și pentru codul care întreabă
   * `'correct' in grila`.
   */
  it('nu inventează cheile răspunsului cât timp nu a fost câștigat', () => {
    const g = grilaDin(RAND);
    expect('correct' in g).toBe(false);
    expect('expl' in g).toBe(false);
    expect('why' in g).toBe(false);
  });

  it('le duce pe toate odată ce au venit', () => {
    const g = grilaDin({ ...RAND, revealed: true, correct: 'A', expl: 'de asta', why: { A: 'ține' } });
    expect(g).toMatchObject({ verificata: true, correct: 'A', expl: 'de asta', why: { A: 'ține' } });
  });

  /** O grilă ștearsă din bibliotecă după generare își păstrează poziția. */
  it('lasă golul vizibil când grila nu mai există', () => {
    const g = grilaDin({ ...RAND, text: null, optiuni: null, tip_id: null, chapter_id: null });
    expect(g).toMatchObject({ pozitie: 3, text: null, opts: [] });
  });
});

/**
 * Numărătoarea se derivă dintr-un moment absolut, niciodată dintr-un contor
 * scăzut la fiecare secundă — altfel timpul s-ar opri cu fila închisă.
 */
describe('timpul rămas', () => {
  const t0 = Date.parse('2026-08-25T10:00:00Z');

  it('scade singur pe măsură ce trece timpul', () => {
    const ends = '2026-08-25T10:30:00Z';
    expect(secundeRamase(ends, t0)).toBe(1800);
    expect(secundeRamase(ends, t0 + 600_000)).toBe(1200);
  });

  it('se oprește la zero, nu trece în negativ', () => {
    expect(secundeRamase('2026-08-25T09:00:00Z', t0)).toBe(0);
  });

  /** „Fără ceas" și „a expirat" sunt lucruri diferite și nu încap în același zero. */
  it('deosebește lucrarea fără ceas de cea expirată', () => {
    expect(secundeRamase(null, t0)).toBeNull();
  });
});

/** Oglindește `v_verific` din `raspunde`: divergența lor ar fi invizibilă. */
describe('modurile care verifică pe loc', () => {
  it('lasă simularea și testul predefinit fără verificare până la predare', () => {
    expect(verificaPeLoc('simulare')).toBe(false);
    expect(verificaPeLoc('test_predefinit')).toBe(false);
  });

  it('verifică pe loc la exersare și la modurile derivate din jurnal', () => {
    for (const m of ['exersare', 'recapitulare', 'greseli', 'favorite', 'nevazute'] as const) {
      expect(verificaPeLoc(m)).toBe(true);
    }
  });
});
