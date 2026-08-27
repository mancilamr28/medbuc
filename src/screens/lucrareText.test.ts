import { describe, expect, it } from 'vitest';
import { CODURI_LUCRARE, type ModTest } from '../lib/lucrari';
import { detaliuLucrare, frazaFaraRaspuns, frazaScor, mesajCodLucrare, titluMod } from './lucrareText';

describe('numele modului', () => {
  it('numește modurile pe care le poate avea o lucrare', () => {
    expect(titluMod('simulare')).toBe('Simulare');
    expect(titluMod('greseli')).toBe('Greșelile mele');
  });

  /** Ca peste tot: un id necunoscut se vede, nu dispare. */
  it('arată id-ul brut pentru un mod pe care nu-l cunoaște', () => {
    expect(titluMod('mod_viitor' as ModTest)).toBe('mod_viitor');
  });
});

describe('mesajul unui cod', () => {
  /**
   * Lista e închisă, ca `CODURI_LUCRARE`. Fără testul ăsta, un cod adăugat în
   * bază ar cădea tăcut pe fraza generală, iar elevul ar rămâne fără explicație
   * exact în cazul pentru care codul a fost inventat.
   */
  it('are o frază proprie pentru fiecare cod cunoscut', () => {
    const general = mesajCodLucrare(null);
    const fara = CODURI_LUCRARE.filter((c) => mesajCodLucrare(c) === general);
    expect(fara).toEqual([]);
  });

  it('cade pe o frază generală pentru orice altceva', () => {
    expect(mesajCodLucrare(null)).toBe('Nu am putut deschide lucrarea.');
  });
});

/** Numitorul e ce s-a cerut, nu câte grile au intrat în lucrare. */
describe('scorul în cuvinte', () => {
  it('acordă „corecte" și păstrează numitorul cerut', () => {
    expect(frazaScor(1, 100)).toBe('1 grilă corectă din 100');
    expect(frazaScor(2, 100)).toBe('2 grile corecte din 100');
    expect(frazaScor(20, 100)).toBe('20 de grile corecte din 100');
  });

  /**
   * Lucrările mutate din tabelele vechi n-au numitor: ordinea lor a trăit doar
   * în `localStorage`. Se spune cât s-a nimerit, nu se inventează din ce.
   */
  it('nu inventează un numitor când lucrarea n-are unul', () => {
    expect(frazaScor(3, null)).toBe('3 grile corecte');
    expect(frazaScor(1, null)).toBe('1 grilă corectă');
  });
});

describe('grilele fără răspuns', () => {
  it('acordă și spune altceva la zero', () => {
    expect(frazaFaraRaspuns(0)).toBe('Ai răspuns la toate');
    expect(frazaFaraRaspuns(1)).toBe('1 grilă fără răspuns');
    expect(frazaFaraRaspuns(2)).toBe('2 grile fără răspuns');
    expect(frazaFaraRaspuns(20)).toBe('20 de grile fără răspuns');
  });
});

describe('detaliul din antet', () => {
  it('spune doar câte sunt când atâtea s-au și cerut', () => {
    expect(detaliuLucrare(20, 20)).toBe('20 de grile');
    expect(detaliuLucrare(1, 1)).toBe('1 grilă');
    expect(detaliuLucrare(3, null)).toBe('3 grile');
  });

  /**
   * Când banca n-a avut destule, diferența e chiar informația utilă — iar
   * adjectivul se acordă și el, fiindcă stă înăuntrul lui `numar()`.
   */
  it('spune amândouă cifrele când lucrarea a ieșit mai scurtă', () => {
    expect(detaliuLucrare(47, 100)).toBe('47 de grile socotite din 100');
    expect(detaliuLucrare(2, 20)).toBe('2 grile socotite din 20');
    expect(detaliuLucrare(1, 20)).toBe('1 grilă socotită din 20');
  });
});
