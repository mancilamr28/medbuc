import { describe, expect, it } from 'vitest';
import { catreSalvare, ciornaGoala, dinGrila, idSugerat, valideaza, type Ciorna } from './adminCiorna';
import { QUESTIONS } from '../data/questions';
import { TAXONOMIE_SEED } from '../data/taxonomieSeed';
import { TIPURI_SEED } from '../data/tipuriSeed';
import type { GrilaCuStare } from '../lib/continut';

/** O ciornă completă și corectă; fiecare test strică exact un lucru. */
/** `valideaza` cu fixturile de taxonomie și de tipuri — regulile vin de acolo. */
const valideazaCu = (c: Ciorna) => valideaza(c, TAXONOMIE_SEED, TIPURI_SEED);
const catreSalvareCu = (c: Ciorna, status: Parameters<typeof catreSalvare>[1]) =>
  catreSalvare(c, status, TIPURI_SEED);

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
    expect(valideazaCu(buna())).toEqual([]);
  });

  it('cere identificator', () => {
    expect(valideazaCu(buna({ id: '  ' }))).toContain('Grila are nevoie de un identificator.');
  });

  /** Id-ul ajunge în `attempts` și în lucrările salvate; un spațiu acolo doare mai târziu. */
  it('refuză un identificator cu spații sau majuscule', () => {
    expect(valideazaCu(buna({ id: 'Bio Nervos 07' }))[0]).toMatch(/litere mici/);
  });

  it('cere enunț și explicație', () => {
    expect(valideazaCu(buna({ text: '' }))).toContain('Enunțul nu poate fi gol.');
    expect(valideazaCu(buna({ expl: '   ' }))).toContain('Explicația generală nu poate fi goală.');
  });

  it('cere cel puțin două variante', () => {
    const c = buna();
    c.opts.B = { text: '', why: '' };
    expect(valideazaCu(c)).toContain('Scrie cel puțin 2 variante.');
  });

  /**
   * Aceeași regulă pe care o apără cheia externă amânată din schemă. Fără ea în
   * formular, autorul ar afla abia din mesajul serverului, după ce apasă salvează.
   */
  it('cere ca răspunsul corect să fie printre variantele scrise', () => {
    expect(valideazaCu(buna({ correct: 'E' }))).toContain(
      'Răspunsul corect trebuie să fie una dintre variantele scrise.',
    );
  });

  /**
   * La complementul grupat toate cinci variantele sunt cerute, fiindcă textele
   * lor sunt cheia fixă a formatului, nu conținut. Regula vine din tip, nu
   * dintr-un `if` pe nume — un format nou o capătă fără să se atingă codul.
   */
  const grupata = (peste: Partial<Ciorna> = {}): Ciorna =>
    buna({
      tip: 'grupat',
      opts: {
        A: { text: '1, 2, 3', why: '' },
        B: { text: '1, 3', why: '' },
        C: { text: '2, 4', why: '' },
        D: { text: 'doar 4', why: '' },
        E: { text: 'toate', why: '' },
      },
      ...peste,
    });

  it('cere exact patru afirmații la complementul grupat', () => {
    expect(valideazaCu(grupata({ enunturi: ['a', 'b', '', ''] }))).toContain(
      'Complement grupat are nevoie de exact 4 afirmații.',
    );
    expect(valideazaCu(grupata({ enunturi: ['a', 'b', 'c', 'd'] }))).toEqual([]);
  });

  it('cere toate cele cinci variante ale complementului grupat', () => {
    const faraE = grupata({ enunturi: ['a', 'b', 'c', 'd'] });
    faraE.opts.E = { text: '', why: '' };
    expect(valideazaCu(faraE)).toContain('Scrie cel puțin 5 variante.');
  });

  it('nu cere afirmații la complementul simplu', () => {
    expect(valideazaCu(buna({ tip: 'simplu', enunturi: ['', '', '', ''] }))).toEqual([]);
  });

  it('lasă anul gol să treacă, dar respinge unul absurd', () => {
    expect(valideazaCu(buna({ an: '' }))).toEqual([]);
    expect(valideazaCu(buna({ an: '1900' }))).toContain('Anul subiectului trebuie să fie un an valid.');
    expect(valideazaCu(buna({ an: 'douămiișaișe' }))).toContain('Anul subiectului trebuie să fie un an valid.');
  });
});

describe('catreSalvare', () => {
  it('nu trimite variantele lăsate goale', () => {
    expect(catreSalvareCu(buna(), 'ciorna').opts.map((o) => o.key)).toEqual(['A', 'B']);
  });

  it('lasă deoparte explicația per variantă când lipsește', () => {
    const opts = catreSalvareCu(buna(), 'ciorna').opts;
    expect(opts[0]).toHaveProperty('why', 'de ce cade');
    expect(opts[1]).not.toHaveProperty('why');
  });

  it('taie spațiile de la capete', () => {
    const g = catreSalvareCu(buna({ id: '  bio-nervos-07  ', text: ' cu spații ' }), 'publicata');
    expect(g.id).toBe('bio-nervos-07');
    expect(g.text).toBe('cu spații');
  });

  /** La simplu, afirmațiile nu pleacă deloc — altfel ar rămâne de la o editare veche. */
  it('trimite afirmațiile doar la complementul grupat', () => {
    expect(catreSalvareCu(buna({ tip: 'simplu' }), 'ciorna').enunturi).toBeUndefined();
    expect(
      catreSalvareCu(buna({ tip: 'grupat', enunturi: ['a', 'b', 'c', 'd'] }), 'ciorna').enunturi,
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('duce starea cerută, nu una din ciornă', () => {
    expect(catreSalvareCu(buna(), 'publicata').status).toBe('publicata');
    expect(catreSalvareCu(buna(), 'ciorna').status).toBe('ciorna');
  });

  it('trimite colecția, curățată de spații', () => {
    expect(catreSalvareCu(buna({ colectie: '  Simulare 2026 UMFCD  ' }), 'ciorna').colectie).toBe(
      'Simulare 2026 UMFCD',
    );
    expect(catreSalvareCu(buna(), 'ciorna').colectie).toBe('');
  });

  it('trimite sursa aleasă și anul doar când e completat', () => {
    expect(catreSalvareCu(buna({ sursa: 'culegere' }), 'ciorna').sursa).toBe('culegere');
    expect(catreSalvareCu(buna(), 'ciorna').an).toBeUndefined();
    expect(catreSalvareCu(buna({ sursa: 'subiect_oficial', an: '2026' }), 'ciorna').an).toBe(2026);
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
