import { describe, expect, it } from 'vitest';
import { mapeazaGrila, pentruIlike, type RandGrila } from './continut';

const rand = (peste: Partial<RandGrila> = {}): RandGrila => ({
  id: 'bio-nervos-01',
  chapter_id: 'bio-nervos',
  tip: 'simplu',
  tip_id: 'simplu',
  status: 'publicata',
  text: 'Enunțul',
  enunturi: null,
  correct: 'B',
  expl: 'Explicația',
  src: 'Manual',
  sursa: 'materie',
  an: null,
  colectie_id: null,
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
    const g = mapeazaGrila(rand({ tip_id: 'grupat', enunturi: ['a', 'b', 'c', 'd'] }));
    expect(g.tip).toBe('grupat');
    expect(g.enunturi).toEqual(['a', 'b', 'c', 'd']);
  });

  /**
   * Formatul se citește din `tip_id`, nu din coloana `tip`.
   *
   * `tip` e enumul istoric, păstrat o vreme ca un client deja livrat să nu se
   * strice între migrare și deploy. Un tip nou n-are ce valoare de enum să scrie
   * acolo — scrie null — deci o mapare care încă citește `tip` ar randa grilele
   * formatului nou fără niciun tip.
   */
  it('citește formatul din tip_id, nu din enumul istoric', () => {
    const g = mapeazaGrila(rand({ tip: null, tip_id: 'flashcard' }));
    expect(g.tip).toBe('flashcard');
  });

  it('duce starea mai departe, pentru Admin', () => {
    expect(mapeazaGrila(rand({ status: 'ciorna' })).status).toBe('ciorna');
  });

  it('citește sursa și anul unui subiect oficial', () => {
    const g = mapeazaGrila(rand({ sursa: 'subiect_oficial', an: 2026 }));
    expect(g.sursa).toBe('subiect_oficial');
    expect(g.an).toBe(2026);
  });

  it('lasă anul nedefinit când bază întoarce null', () => {
    expect(mapeazaGrila(rand({ an: null })).an).toBeUndefined();
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

/**
 * Căutarea din Administrare merge prin `ilike`, unde `%` și `_` sunt
 * metacaractere. Fără scăpare, un autor care caută „50%" ar primi toată
 * biblioteca — un rezultat greșit care arată exact ca unul corect.
 */
describe('pentruIlike', () => {
  it('scapă metacaracterele ilike, ca o căutare cu procent să nu dea tot', () => {
    // Două scăpări: `\%` pentru ilike, apoi backslash-ul dublat pentru
    // ghilimelele PostgREST, ca serverul să-i predea lui ilike chiar `\%`.
    expect(pentruIlike('50%')).toBe('"%50\\\\%%"');
    expect(pentruIlike('a_b')).toBe('"%a\\\\_b%"');
  });

  /**
   * Virgula desparte termenii într-un `or=(...)`, iar textul variantelor unui
   * complement grupat chiar conține virgule. Nescăpată, căutarea primea 400 de
   * la PostgREST — verificat pe serverul real.
   */
  it('pune tiparul între ghilimele, ca o virgulă să nu rupă filtrul', () => {
    expect(pentruIlike('1, 2, 3')).toBe('"%1, 2, 3%"');
    // Ghilimeaua dinăuntru trebuie scăpată, altfel închide valoarea mai devreme.
    // Ea trece doar prin a doua scăpare — nu e metacaracter `ilike`.
    expect(pentruIlike('zi "buna"')).toBe('"%zi \\"buna\\"%"');
  });

  it('lasă textul obișnuit între ghilimele, altfel neatins', () => {
    expect(pentruIlike('sistemul nervos')).toBe('"%sistemul nervos%"');
  });
});
