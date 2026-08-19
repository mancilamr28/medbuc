import { describe, expect, it } from 'vitest';
import { MATERII } from './chapters';
import {
  QUESTIONS,
  chapterQuestionCount,
  materieQuestionCount,
} from './questions';

/**
 * Regula fazei: nicio cifră afișată nu are voie să fie scrisă de mână. Testele
 * de aici o apără — dacă cineva reintroduce un `total` fix pe capitol, numărul
 * nu va mai corespunde cu banca și testul cade.
 */
describe('numărătoarea grilelor', () => {
  it('numără grilele unui capitol din bancă', () => {
    expect(chapterQuestionCount('bio-nervos')).toBe(1);
    expect(chapterQuestionCount('chim-alcooli')).toBe(1);
  });

  it('dă zero pentru un capitol în care nu s-a scris nimic', () => {
    expect(chapterQuestionCount('bio-respiratie')).toBe(0);
    expect(chapterQuestionCount('chim-zaharide')).toBe(0);
  });

  it('dă zero pentru un capitol inexistent, fără să arunce', () => {
    expect(chapterQuestionCount('capitol-inventat')).toBe(0);
  });

  it('adună pe materie exact cât e în bancă', () => {
    expect(materieQuestionCount('bio')).toBe(4);
    expect(materieQuestionCount('chim')).toBe(2);
  });

  it('suma pe materii dă exact banca, fără grile pierdute pe drum', () => {
    const suma = Object.values(MATERII).reduce((n, m) => n + materieQuestionCount(m.id), 0);
    expect(suma).toBe(QUESTIONS.length);
  });

  it('suma pe capitole dă tot banca', () => {
    const suma = Object.values(MATERII)
      .flatMap((m) => m.list)
      .reduce((n, c) => n + chapterQuestionCount(c.id), 0);
    expect(suma).toBe(QUESTIONS.length);
  });
});
