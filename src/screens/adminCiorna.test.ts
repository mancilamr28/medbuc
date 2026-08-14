import { describe, expect, it } from 'vitest';
import { catreSalvare, ciornaGoala, dinGrila, idSugerat, valideaza, type Ciorna } from './adminCiorna';
import { QUESTIONS } from '../data/questions';
import type { GrilaCuStare } from '../lib/continut';

/** O ciornă completă și corectă; fiecare test strică exact un lucru. */
const buna = (peste: Partial<Ciorna> = {}): Ciorna => ({
  ...ciornaGoala('bio-nervos'),
  id: 'bio-nervos-07',
  text: 'Enunțul grilei',
  opts: {
    A: { text: 'prima', why: 'de ce cade' },
    B: { text: 'a doua', why: '' },
    C: { text: '', why: '' },
    D: { text: '', why: '' },
    E: { text: '', why: '' },
  },
  correct: 'B',
  expl: 'Explicația generală',
  src: 'Manual',
  ...peste,
});

describe('valideaza', () => {
  it('lasă o ciornă corectă să treacă', () => {
    expect(valideaza(buna())).toEqual([]);
  });

  it('cere identificator', () => {
    expect(valideaza(buna({ id: '  ' }))).toContain('Grila are nevoie de un identificator.');
  });

  /** Id-ul ajunge în `attempts` și în lucrările salvate; un spațiu acolo doare mai târziu. */
  it('refuză un identificator cu spații sau majuscule', () => {
    expect(valideaza(buna({ id: 'Bio Nervos 07' }))[0]).toMatch(/litere mici/);
  });

  it('cere enunț și explicație', () => {
    expect(valideaza(buna({ text: '' }))).toContain('Enunțul nu poate fi gol.');
    expect(valideaza(buna({ expl: '   ' }))).toContain('Explicația generală nu poate fi goală.');
  });

  it('cere cel puțin două variante', () => {
    const c = buna();
    c.opts.B = { text: '', why: '' };
    expect(valideaza(c)).toContain('Scrie cel puțin două variante.');
  });

  /**
   * Aceeași regulă pe care o apără cheia externă amânată din schemă. Fără ea în
   * formular, autorul ar afla abia din mesajul serverului, după ce apasă salvează.
   */
  it('cere ca răspunsul corect să fie printre variantele scrise', () => {
    expect(valideaza(buna({ correct: 'E' }))).toContain(
      'Răspunsul corect trebuie să fie una dintre variantele scrise.',
    );
  });

  it('cere exact patru afirmații la complementul grupat', () => {
    expect(valideaza(buna({ tip: 'grupat', enunturi: ['a', 'b', '', ''] }))).toContain(
      'Complementul grupat are nevoie de exact patru afirmații.',
    );
    expect(valideaza(buna({ tip: 'grupat', enunturi: ['a', 'b', 'c', 'd'] }))).toEqual([]);
  });

  it('nu cere afirmații la complementul simplu', () => {
    expect(valideaza(buna({ tip: 'simplu', enunturi: ['', '', '', ''] }))).toEqual([]);
  });
});

describe('catreSalvare', () => {
  it('nu trimite variantele lăsate goale', () => {
    expect(catreSalvare(buna(), 'ciorna').opts.map((o) => o.key)).toEqual(['A', 'B']);
  });

  it('lasă deoparte explicația per variantă când lipsește', () => {
    const opts = catreSalvare(buna(), 'ciorna').opts;
    expect(opts[0]).toHaveProperty('why', 'de ce cade');
    expect(opts[1]).not.toHaveProperty('why');
  });

  it('taie spațiile de la capete', () => {
    const g = catreSalvare(buna({ id: '  bio-nervos-07  ', text: ' cu spații ' }), 'publicata');
    expect(g.id).toBe('bio-nervos-07');
    expect(g.text).toBe('cu spații');
  });

  /** La simplu, afirmațiile nu pleacă deloc — altfel ar rămâne de la o editare veche. */
  it('trimite afirmațiile doar la complementul grupat', () => {
    expect(catreSalvare(buna({ tip: 'simplu' }), 'ciorna').enunturi).toBeUndefined();
    expect(
      catreSalvare(buna({ tip: 'grupat', enunturi: ['a', 'b', 'c', 'd'] }), 'ciorna').enunturi,
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('duce starea cerută, nu una din ciornă', () => {
    expect(catreSalvare(buna(), 'publicata').status).toBe('publicata');
    expect(catreSalvare(buna(), 'ciorna').status).toBe('ciorna');
  });
});

describe('dinGrila', () => {
  it('umple formularul astfel încât salvarea să dea înapoi aceeași grilă', () => {
    const original = QUESTIONS[0]!;
    const g: GrilaCuStare = { ...original, status: 'publicata' };

    const refacuta = catreSalvare(dinGrila(g), 'publicata');

    expect(refacuta.id).toBe(original.id);
    expect(refacuta.correct).toBe(original.correct);
    expect(refacuta.opts.map((o) => o.key)).toEqual(original.opts.map(([k]) => k));
    expect(refacuta.opts.map((o) => o.text)).toEqual(original.opts.map(([, t]) => t));
  });
});

describe('idSugerat', () => {
  it('continuă numerotarea capitolului', () => {
    expect(idSugerat('bio-nervos', QUESTIONS)).toMatch(/^bio-nervos-\d{2}$/);
  });

  it('pornește de la 01 într-un capitol gol', () => {
    expect(idSugerat('chim-zaharide', [])).toBe('chim-zaharide-01');
  });

  /** Sugestia nu are voie să propună un id deja luat: id-ul e identitatea grilei. */
  it('nu propune un identificator existent', () => {
    const sugestie = idSugerat('bio-nervos', QUESTIONS);
    expect(QUESTIONS.some((q) => q.id === sugestie)).toBe(false);
  });
});
