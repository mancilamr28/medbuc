import { describe, expect, it } from 'vitest';
import type { OptionKey, Question } from '../data/questions';
import { scoreOf } from './useSession';

/** Grile de test: doar câmpurile care contează pentru scor. */
const grila = (correct: OptionKey): Question => ({
  tip: 'simplu',
  materie: 'Biologie',
  cap: '01. Test',
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
