import { describe, expect, it, vi } from 'vitest';
import { catreJson, citesteImport, frazaRescrieri, importa } from './importLot';
import type { GrilaCuStare } from '../lib/continut';
import type { GrilaDeSalvat } from '../lib/continut';

/** O grilă validă, în forma canonică — cea din `src/data/questions.ts`. */
const valida = (peste: Record<string, unknown> = {}) => ({
  id: 'bio-nervos-42',
  capId: 'bio-nervos',
  tip: 'simplu',
  text: 'Substanța cenușie a medulei spinării este dispusă:',
  opts: [
    ['A', 'la periferie'],
    ['B', 'central, în formă de „H"'],
  ],
  correct: 'B',
  why: { B: 'Forma de H e dată de coarne.' },
  expl: 'Cenușia e centrală, albă la periferie.',
  src: 'Manual clasa a XI-a, p. 84',
  ...peste,
});

const citeste = (v: unknown, existente: { id: string }[] = []) =>
  citesteImport(JSON.stringify(v), 'ciorna', existente);

describe('citesteImport', () => {
  it('acceptă un lot valid și îl pregătește pentru salvare', () => {
    const { eroare, randuri } = citeste([valida()]);

    expect(eroare).toBeNull();
    expect(randuri).toHaveLength(1);
    expect(randuri[0]!.probleme).toEqual([]);
    expect(randuri[0]!.grila).toMatchObject({
      id: 'bio-nervos-42',
      capId: 'bio-nervos',
      correct: 'B',
      status: 'ciorna',
      opts: [
        { key: 'A', text: 'la periferie' },
        { key: 'B', text: 'central, în formă de „H"', why: 'Forma de H e dată de coarne.' },
      ],
    });
  });

  it('nu cade pe o singură grilă lipită fără paranteze drepte', () => {
    const { randuri } = citeste(valida());
    expect(randuri).toHaveLength(1);
    expect(randuri[0]!.grila).not.toBeNull();
  });

  it('spune ce n-a mers când JSON-ul e stricat, fără să arunce', () => {
    const { eroare, randuri } = citesteImport('[{ "id": ', 'ciorna', []);
    expect(eroare).toMatch(/nu se poate citi/);
    expect(randuri).toEqual([]);
  });

  it('nu raportează nimic pentru un câmp gol', () => {
    expect(citesteImport('   ', 'ciorna', [])).toEqual({ eroare: null, randuri: [] });
  });
});

/**
 * Regulile de conținut nu se rescriu aici: rândul trece prin `valideaza()`,
 * aceeași funcție pe care o cheamă formularul. Testul de mai jos păzește exact
 * legătura asta — dacă importul și-ar face reguli proprii, o grilă respinsă în
 * formular ar intra în bibliotecă prin lipire.
 */
describe('citesteImport folosește regulile formularului', () => {
  it('respinge un răspuns corect care nu e printre variantele scrise', () => {
    const { randuri } = citeste([valida({ correct: 'D' })]);
    expect(randuri[0]!.grila).toBeNull();
    expect(randuri[0]!.probleme).toContain('Răspunsul corect trebuie să fie una dintre variantele scrise.');
  });

  it('respinge un capitol inexistent', () => {
    const { randuri } = citeste([valida({ capId: 'bio-inventat' })]);
    expect(randuri[0]!.probleme).toContain('Alege un capitol.');
  });

  it('cere exact patru afirmații la complementul grupat', () => {
    const { randuri } = citeste([valida({ tip: 'grupat', enunturi: ['una', 'doua'] })]);
    expect(randuri[0]!.probleme).toContain('Complementul grupat are nevoie de exact patru afirmații.');
  });

  it('respinge un identificator cu majuscule sau spații', () => {
    const { randuri } = citeste([valida({ id: 'Bio Nervos 42' })]);
    expect(randuri[0]!.probleme).toContain(
      'Identificatorul poate conține doar litere mici, cifre și cratime.',
    );
  });
});

describe('citesteImport, problemele pe care formularul nu le poate avea', () => {
  it('numește tipul necunoscut în loc să cadă pe „simplu”', () => {
    const { randuri } = citeste([valida({ tip: 'flashcard' })]);
    expect(randuri[0]!.probleme).toContain('Tip necunoscut: flashcard.');
    expect(randuri[0]!.grila).toBeNull();
  });

  it('respinge o literă de variantă în afara lui A–E', () => {
    const { randuri } = citeste([valida({ opts: [['A', 'una'], ['F', 'alta']] })]);
    expect(randuri[0]!.probleme).toContain('Varianta „F" nu e o literă între A și E.');
  });

  it('respinge un răspuns corect care nu e o literă', () => {
    const { randuri } = citeste([valida({ correct: 'ambele' })]);
    expect(randuri[0]!.probleme).toContain('Răspunsul corect „ambele" nu e o literă între A și E.');
  });

  it('respinge un rând care nu e obiect', () => {
    const { randuri } = citeste(['bio-nervos-42']);
    expect(randuri[0]!.probleme).toEqual(['Rândul nu e o grilă.']);
  });

  /**
   * Două rânduri cu același id sunt cazul cel mai urât: fără verificarea asta,
   * al doilea îl rescrie tăcut pe primul în aceeași apăsare, iar bilanțul
   * raportează două grile importate acolo unde a rămas una.
   */
  it('oprește ambele rânduri când un identificator se repetă în lot', () => {
    const { randuri } = citeste([valida(), valida({ text: 'Alt enunț.' })]);

    expect(randuri).toHaveLength(2);
    for (const r of randuri) {
      expect(r.grila).toBeNull();
      expect(r.probleme).toContain('Identificatorul „bio-nervos-42" apare de mai multe ori în lot.');
    }
  });
});

describe('citesteImport, formele în care se scriu variantele', () => {
  // Forma scurtă nu are unde să pună explicațiile, deci harta `why` rămâne
  // singura sursă pentru ele — altfel alegerea formei ar costa treizeci de
  // explicații, adică exact ce face banca utilă.
  it('citește variantele ca obiect { A: „text” }, cu explicațiile din harta `why`', () => {
    const { randuri } = citeste([valida({ opts: { A: 'la periferie', B: 'central' } })]);
    expect(randuri[0]!.probleme).toEqual([]);
    expect(randuri[0]!.grila!.opts).toEqual([
      { key: 'A', text: 'la periferie' },
      { key: 'B', text: 'central', why: 'Forma de H e dată de coarne.' },
    ]);
  });

  it('citește variantele ca listă de obiecte { key, text, why }', () => {
    const { randuri } = citeste([
      valida({
        why: {},
        opts: [
          { key: 'A', text: 'la periferie', why: 'Cade: albă e la periferie.' },
          { key: 'B', text: 'central' },
        ],
      }),
    ]);

    expect(randuri[0]!.probleme).toEqual([]);
    expect(randuri[0]!.grila!.opts[0]).toEqual({
      key: 'A',
      text: 'la periferie',
      why: 'Cade: albă e la periferie.',
    });
  });
});

describe('citesteImport, starea grilelor', () => {
  it('pune starea aleasă pentru lot', () => {
    const r = citesteImport(JSON.stringify([valida()]), 'publicata', []);
    expect(r.randuri[0]!.grila!.status).toBe('publicata');
  });

  it('lasă rândul să-și ceară propria stare, ca reimportarea să nu publice o ciornă', () => {
    const r = citesteImport(JSON.stringify([valida({ status: 'ciorna' })]), 'publicata', []);
    expect(r.randuri[0]!.grila!.status).toBe('ciorna');
  });

  it('ignoră o stare necunoscută și o folosește pe cea a lotului', () => {
    const r = citesteImport(JSON.stringify([valida({ status: 'arhivata' })]), 'publicata', []);
    expect(r.randuri[0]!.grila!.status).toBe('publicata');
  });
});

/**
 * Rescrierea nu e o eroare — reimportarea unui lot corectat e chiar felul în
 * care se lucrează — dar trebuie spusă înainte de apăsare, nu descoperită după.
 */
describe('citesteImport marchează rescrierile', () => {
  it('semnalează un id care există deja în bibliotecă', () => {
    const { randuri } = citeste([valida()], [{ id: 'bio-nervos-42' }]);
    expect(randuri[0]!.suprascrie).toBe(true);
    expect(randuri[0]!.grila).not.toBeNull();
  });

  it('nu semnalează nimic pentru un id nou', () => {
    const { randuri } = citeste([valida()], [{ id: 'bio-nervos-01' }]);
    expect(randuri[0]!.suprascrie).toBe(false);
  });

  /**
   * „1 rescriu o grilă existentă" a ajuns pe ecran. Aceeași clasă de defect ca
   * „1 grilă scrise": un cuvânt rămas la plural lângă un numeral de unu, invizibil
   * pentru orice test care nu se uită la fraza întreagă.
   */
  it('acordă verbul cu numărul, nu doar substantivul', () => {
    expect(frazaRescrieri(1)).toBe('rescrie o grilă existentă');
    expect(frazaRescrieri(2)).toBe('rescriu grile existente');
    expect(frazaRescrieri(20)).toBe('rescriu grile existente');
  });
});

describe('importa', () => {
  const rand = (id: string, valid = true) => ({
    pozitie: 1,
    id,
    grila: valid ? ({ id } as GrilaDeSalvat) : null,
    probleme: [],
    suprascrie: false,
  });

  it('trimite doar rândurile valide', async () => {
    const salveaza = vi.fn().mockResolvedValue(undefined);
    const bilant = await importa([rand('a'), rand('b', false), rand('c')], salveaza);

    expect(salveaza).toHaveBeenCalledTimes(2);
    expect(bilant).toEqual({ reusite: 2, esecuri: [] });
  });

  /**
   * Un eșec la mijloc nu are voie să oprească lotul: la două sute de grile,
   * o singură cădere de rețea ar însemna reluarea a tot ce urma după ea.
   */
  it('continuă după un eșec și îl raportează cu id-ul lui', async () => {
    const salveaza = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Capitolul nu există: bio-x'))
      .mockResolvedValueOnce(undefined);

    const bilant = await importa([rand('a'), rand('b'), rand('c')], salveaza);

    expect(salveaza).toHaveBeenCalledTimes(3);
    expect(bilant.reusite).toBe(2);
    expect(bilant.esecuri).toEqual([{ id: 'b', mesaj: 'Capitolul nu există: bio-x' }]);
  });

  it('raportează progresul peste rândurile trimise, nu peste toate', async () => {
    const pasi: [number, number][] = [];
    await importa([rand('a'), rand('b', false), rand('c')], vi.fn().mockResolvedValue(undefined), (f, t) =>
      pasi.push([f, t]),
    );

    expect(pasi).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});

/**
 * Exportul și importul trebuie să se închidă în cerc: ce iese trebuie să poată
 * intra înapoi neatins. Fără testul ăsta, o corectură făcută într-un editor pe
 * exportul bibliotecii s-ar lovi de import la reintrare.
 */
describe('catreJson', () => {
  const dinBiblioteca: GrilaCuStare = {
    id: 'bio-nervos-01',
    tip: 'simplu',
    capId: 'bio-nervos',
    text: 'Enunțul.',
    opts: [
      ['A', 'una'],
      ['B', 'alta'],
    ],
    correct: 'B',
    expl: 'Explicația.',
    why: { A: 'Cade fiindcă…' },
    src: 'Manual, p. 1',
    status: 'publicata',
  };

  it('scoate biblioteca într-o formă pe care importul o citește înapoi', () => {
    const { eroare, randuri } = citesteImport(catreJson([dinBiblioteca]), 'ciorna', []);

    expect(eroare).toBeNull();
    expect(randuri[0]!.probleme).toEqual([]);
    expect(randuri[0]!.grila).toMatchObject({
      id: 'bio-nervos-01',
      capId: 'bio-nervos',
      correct: 'B',
      // Starea călătorește cu grila, deci o ciornă reimportată rămâne ciornă.
      status: 'publicata',
      opts: [
        { key: 'A', text: 'una', why: 'Cade fiindcă…' },
        { key: 'B', text: 'alta' },
      ],
    });
  });

  it('păstrează afirmațiile complementului grupat', () => {
    const grupata: GrilaCuStare = {
      ...dinBiblioteca,
      id: 'bio-nervos-02',
      tip: 'grupat',
      enunturi: ['una', 'doua', 'trei', 'patru'],
    };
    const { randuri } = citesteImport(catreJson([grupata]), 'ciorna', []);

    expect(randuri[0]!.probleme).toEqual([]);
    expect(randuri[0]!.grila!.enunturi).toEqual(['una', 'doua', 'trei', 'patru']);
  });
});
