import { describe, expect, it } from 'vitest';
import type { ChapterId } from '../data/chapters';
import type { OptionKey, Question, QuestionSursa } from '../data/questions';
import { filtreazaCapitole, scoreOf } from './useSession';

/** Grile de test: doar câmpurile care contează pentru scor. */
let n = 0;
const grila = (correct: OptionKey, capId: ChapterId = 'bio-celula', sursa: QuestionSursa = 'materie'): Question => ({
  id: `test-${(n += 1)}`,
  tip: 'simplu',
  capId,
  text: 'Întrebare de test',
  opts: [
    ['A', 'a'],
    ['B', 'b'],
    ['C', 'c'],
    ['D', 'd'],
    ['E', 'e'],
  ],
  correct,
  expl: '',
  why: {},
  src: '',
  sursa,
  colectie: '',
});

const SASE = [grila('A'), grila('B'), grila('C'), grila('D'), grila('E'), grila('A')];

describe('scoreOf', () => {
  it('numără corect un amestec de corecte, greșite și fără răspuns', () => {
    // 3 corecte (0,1,2), 2 greșite (3,4), 1 fără răspuns (5)
    const answers: Record<number, OptionKey> = { 0: 'A', 1: 'B', 2: 'C', 3: 'A', 4: 'A' };
    expect(scoreOf(SASE, answers, 0)).toMatchObject({
      corecte: 3,
      gresite: 2,
      neraspunse: 1,
      total: 6,
      pct: 50,
    });
  });

  it('părțile însumează întotdeauna totalul', () => {
    const answers: Record<number, OptionKey> = { 0: 'A', 3: 'X' as OptionKey };
    const s = scoreOf(SASE, answers, 0);
    expect(s.corecte + s.gresite + s.neraspunse).toBe(s.total);
  });

  it('raportează procentul la total, nu la câte ai răspuns', () => {
    // O singură grilă, corectă, din șase: 17%, nu 100%.
    expect(scoreOf(SASE, { 0: 'A' }, 0).pct).toBe(17);
  });

  it('dă 0% fără niciun răspuns și 100% cu toate corecte', () => {
    expect(scoreOf(SASE, {}, 0)).toMatchObject({ corecte: 0, neraspunse: 6, pct: 0 });
    const toate: Record<number, OptionKey> = { 0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'A' };
    expect(scoreOf(SASE, toate, 0)).toMatchObject({ corecte: 6, gresite: 0, neraspunse: 0, pct: 100 });
  });

  it('numără un răspuns ales chiar dacă nu a fost verificat', () => {
    // „Încheie sesiunea" nu are voie să piardă un răspuns nebifat.
    expect(scoreOf(SASE, { 0: 'A' }, 0).corecte).toBe(1);
  });

  it('păstrează durata primită și nu acceptă valori negative', () => {
    expect(scoreOf(SASE, {}, 90_000).durataMs).toBe(90_000);
    expect(scoreOf(SASE, {}, -1).durataMs).toBe(0);
  });

  it('nu împarte la zero pe o listă goală', () => {
    expect(scoreOf([], {}, 0)).toMatchObject({ total: 0, pct: 0 });
  });

  it('ignoră răspunsurile pe poziții care nu există', () => {
    expect(scoreOf(SASE, { 99: 'A' }, 0)).toMatchObject({ corecte: 0, neraspunse: 6 });
  });
});

describe('filtreazaCapitole', () => {
  const AMESTEC = [
    grila('A', 'bio-nervos'),
    grila('B', 'chim-arene'),
    grila('C', 'bio-nervos'),
    grila('D', 'bio-osos'),
  ];

  it('lista goală înseamnă toată biblioteca', () => {
    expect(filtreazaCapitole(AMESTEC, [])).toEqual(AMESTEC);
  });

  /**
   * Nu doar egală — chiar aceeași. Identitatea băncii e ce ține memo-ul din
   * `useSession` (și, prin el, cel din `AppProvider`) să nu recalculeze degeaba.
   */
  it('fără capitole întoarce chiar banca primită, nu o copie', () => {
    expect(filtreazaCapitole(AMESTEC, [])).toBe(AMESTEC);
  });

  it('păstrează doar grilele din capitolele cerute, în ordinea lor', () => {
    expect(filtreazaCapitole(AMESTEC, ['bio-nervos']).map((q) => q.capId)).toEqual([
      'bio-nervos',
      'bio-nervos',
    ]);
    expect(filtreazaCapitole(AMESTEC, ['bio-osos', 'chim-arene']).map((q) => q.capId)).toEqual([
      'chim-arene',
      'bio-osos',
    ]);
  });

  it('un capitol fără grile scrise dă o listă goală, nu toată biblioteca', () => {
    expect(filtreazaCapitole(AMESTEC, ['bio-celula'])).toEqual([]);
  });

  it('lista de surse goală înseamnă orice sursă', () => {
    expect(filtreazaCapitole(AMESTEC, [], [])).toEqual(AMESTEC);
  });

  it('păstrează doar grilele din sursele cerute', () => {
    const cuSurse = [
      grila('A', 'bio-nervos', 'materie'),
      grila('B', 'bio-nervos', 'subiect_oficial'),
      grila('C', 'bio-nervos', 'culegere'),
    ];
    expect(filtreazaCapitole(cuSurse, [], ['subiect_oficial']).map((q) => q.id)).toEqual([cuSurse[1]!.id]);
  });

  it('combină filtrul de capitole cu cel de surse', () => {
    const mixt = [
      grila('A', 'bio-nervos', 'materie'),
      grila('B', 'bio-nervos', 'culegere'),
      grila('C', 'chim-arene', 'culegere'),
    ];
    expect(filtreazaCapitole(mixt, ['bio-nervos'], ['culegere']).map((q) => q.id)).toEqual([mixt[1]!.id]);
  });
});
