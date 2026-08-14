import { describe, expect, it } from 'vitest';
import { mapeazaGrila, type RandGrila } from './continut';

const rand = (peste: Partial<RandGrila> = {}): RandGrila => ({
  id: 'bio-nervos-01',
  chapter_id: 'bio-nervos',
  tip: 'simplu',
  status: 'publicata',
  text: 'Enunțul',
  enunturi: null,
  correct: 'B',
  expl: 'Explicația',
  src: 'Manual',
  question_options: [
    { key: 'B', text: 'a doua', why: 'de ce ține' },
    { key: 'A', text: 'prima', why: null },
  ],
  ...peste,
});

describe('mapeazaGrila', () => {
  /**
   * PostgREST nu garantează ordinea unei resurse încorporate, iar interfața
   * afișează variantele în ordinea din `opts`. Fără sortare, A și B și-ar
   * schimba locurile între încărcări.
   */
  it('pune variantele în ordinea literelor, nu cum vin din bază', () => {
    expect(mapeazaGrila(rand()).opts).toEqual([
      ['A', 'prima'],
      ['B', 'a doua'],
    ]);
  });

  it('strânge explicațiile per variantă doar unde există', () => {
    expect(mapeazaGrila(rand()).why).toEqual({ B: 'de ce ține' });
  });

  it('lasă enunțurile nedefinite la complementul simplu', () => {
    expect(mapeazaGrila(rand()).enunturi).toBeUndefined();
  });

  it('păstrează cele patru afirmații la complementul grupat', () => {
    const g = mapeazaGrila(rand({ tip: 'grupat', enunturi: ['a', 'b', 'c', 'd'] }));
    expect(g.tip).toBe('grupat');
    expect(g.enunturi).toEqual(['a', 'b', 'c', 'd']);
  });

  it('duce starea mai departe, pentru Admin', () => {
    expect(mapeazaGrila(rand({ status: 'ciorna' })).status).toBe('ciorna');
  });

  /** O grilă fără variante nu trebuie să arunce la randare, ci să arate goală. */
  it('suportă o grilă fără variante', () => {
    const g = mapeazaGrila(rand({ question_options: null }));
    expect(g.opts).toEqual([]);
    expect(g.why).toEqual({});
  });

  /** Litere din afara lui A–E n-au ce căuta în interfață, care iterează `OPTION_KEYS`. */
  it('ignoră litere din afara A–E', () => {
    const g = mapeazaGrila(
      rand({ question_options: [{ key: 'Z', text: 'intrusă', why: null }] }),
    );
    expect(g.opts).toEqual([]);
  });
});
