import { describe, expect, it } from 'vitest';
import {
  areAccesPremium,
  cerereDin,
  cuModul,
  descriereMod,
  frazaCapitoleAlese,
  frazaDisponibile,
  frazaIncepe,
  frazaScurta,
  nrValid,
  pasVecin,
  pasiVizibili,
  stareInitiala,
  type StareAsistent,
} from './asistent';

const stare = (peste: Partial<StareAsistent> = {}): StareAsistent => ({
  ...stareInitiala(),
  ...peste,
});

describe('pașii asistentului', () => {
  /**
   * Ideea care ține tot ecranul: un pas care n-are ce întreba nu se afișează.
   * Cu două capitole scrise din 30, un pas de conținut cu o singură bifă e o
   * pagină în plus, nu o alegere.
   */
  it('sare peste conținut cât timp biblioteca are sub două capitole scrise', () => {
    expect(pasiVizibili(stare(), { capitoleCuGrile: 1 })).toEqual(['mod', 'configurare', 'rezumat']);
    expect(pasiVizibili(stare(), { capitoleCuGrile: 2 })).toEqual([
      'mod',
      'continut',
      'configurare',
      'rezumat',
    ]);
  });

  /** Greșelile mele sunt deja ale mele: nu se mai restrâng pe capitol. */
  it('sare peste conținut la modurile care își aleg singure grilele', () => {
    for (const mod of ['greseli', 'favorite'] as const) {
      expect(pasiVizibili(stare({ mod }), { capitoleCuGrile: 30 })).not.toContain('continut');
    }
    expect(pasiVizibili(stare({ mod: 'nevazute' }), { capitoleCuGrile: 30 })).toContain('continut');
  });

  it('cere doar alegerea testului când definiția deține restul configurării', () => {
    expect(pasiVizibili(stare({ mod: 'test_predefinit' }), { capitoleCuGrile: 30 })).toEqual([
      'mod',
      'test',
      'rezumat',
    ]);
  });

  it('nu trece dincolo de capetele listei', () => {
    const pasi = pasiVizibili(stare(), { capitoleCuGrile: 5 });
    expect(pasVecin(pasi, 'mod', -1)).toBeNull();
    expect(pasVecin(pasi, 'rezumat', 1)).toBeNull();
    expect(pasVecin(pasi, 'mod', 1)).toBe('continut');
  });

  /**
   * Pasul curent poate să dispară sub picioare — se alege „Greșelile mele" din
   * rezumat și `continut` iese din listă. Vecinul trebuie să întoarcă un pas
   * real, nu `undefined` transformat într-un ecran gol.
   */
  it('duce înapoi la primul pas când pasul curent nu mai există', () => {
    const pasi = pasiVizibili(stare({ mod: 'favorite' }), { capitoleCuGrile: 30 });
    expect(pasVecin(pasi, 'continut', 1)).toBe('mod');
  });
});

describe('schimbarea modului', () => {
  /**
   * Fără asta, „Simulare" moștenea 20 de grile și niciun ceas de la „Exersare"
   * — adică exact configurarea pe care modul o contrazice.
   */
  it('aduce cu ea valorile implicite ale modului nou', () => {
    const dupa = cuModul(stare({ nr: 20, durataMinute: null }), 'simulare');
    expect(dupa.nr).toBe(descriereMod('simulare').nrImplicit);
    expect(dupa.durataMinute).toBe(180);
  });

  it('nu atinge nimic dacă modul e același', () => {
    const inainte = stare({ nr: 7 });
    expect(cuModul(inainte, 'exersare')).toBe(inainte);
  });

  it('păstrează capitolele alese', () => {
    const dupa = cuModul(stare({ capitole: ['bio-nervos'] }), 'simulare');
    expect(dupa.capitole).toEqual(['bio-nervos']);
  });

  it('uită testul exact când se schimbă felul', () => {
    const dupa = cuModul(stare({ mod: 'test_predefinit', testId: 'admitere-2026' }), 'exersare');
    expect(dupa.testId).toBeNull();
  });
});

describe('cererea trimisă motorului', () => {
  it('trimite listele goale, nu le omite', () => {
    const c = cerereDin(stare());
    expect(c.filtre).toEqual({ materii: [], capitole: [], colectii: [] });
  });

  /**
   * Materia și capitolul se compun cu `and` în `private.candidati`, deci un
   * capitol bifat dintr-o materie nebifată n-ar mai intra în selecție. Când
   * există capitole anume, ele sunt alegerea; materiile n-au ce adăuga.
   */
  it('lasă materiile deoparte când sunt alese capitole anume', () => {
    const c = cerereDin(stare({ materii: ['bio'], capitole: ['chim-alcooli'] }));
    expect(c.filtre).toEqual({ materii: [], capitole: ['chim-alcooli'], colectii: [] });
  });

  it('trimite materiile când nu e ales niciun capitol', () => {
    expect(cerereDin(stare({ materii: ['bio'] })).filtre).toEqual({
      materii: ['bio'],
      capitole: [],
      colectii: [],
    });
  });

  it('trimite colecțiile alese motorului', () => {
    const cuColectie = stare({ colectii: ['corint-nervos'] });
    expect(cerereDin(cuColectie).filtre).toEqual({
      materii: [],
      capitole: [],
      colectii: ['corint-nervos'],
    });
  });

  /** Un mod fără pas de conținut n-are voie să care filtre rămase din alt mod. */
  it('nu duce filtre de conținut într-un mod care nu le cere', () => {
    const c = cerereDin(stare({ mod: 'favorite', materii: ['bio'], capitole: ['bio-nervos'] }));
    expect(c.filtre).toEqual({ materii: [], capitole: [], colectii: [] });
  });

  /** Prin `cuModul`, singurul drum pe care ecranul schimbă modul. */
  it('duce ceasul doar unde există', () => {
    expect(cerereDin(cuModul(stare(), 'simulare')).durata_minute).toBe(180);
    expect(cerereDin(cuModul(stare(), 'greseli')).durata_minute).toBeNull();
  });

  it('trimite numai id-ul definiției pentru un test predefinit', () => {
    expect(cerereDin(stare({ mod: 'test_predefinit', testId: 'admitere-2026' }))).toEqual({
      mod: 'test_predefinit',
      test_id: 'admitere-2026',
    });
  });
});

/**
 * Fiecare frază la 1, 2 și 20: unu pentru acord, douăzeci pentru „de". Acordul
 * a plecat greșit în producție de cinci ori, mereu la un numeral de unu lăsat
 * lângă un cuvânt la plural.
 */
describe('frazele numărate', () => {
  it('acordă „disponibile"', () => {
    expect(frazaDisponibile(1)).toBe('1 grilă disponibilă');
    expect(frazaDisponibile(2)).toBe('2 grile disponibile');
    expect(frazaDisponibile(20)).toBe('20 de grile disponibile');
    expect(frazaDisponibile(0)).toBe('0 grile disponibile');
  });

  it('acordă butonul de start', () => {
    expect(frazaIncepe(1)).toBe('Începe cu 1 grilă');
    expect(frazaIncepe(2)).toBe('Începe cu 2 grile');
    expect(frazaIncepe(20)).toBe('Începe cu 20 de grile');
  });

  it('acordă capitolele alese și spune „toate" la zero', () => {
    expect(frazaCapitoleAlese(0)).toBe('Toate capitolele');
    expect(frazaCapitoleAlese(1)).toBe('1 capitol ales');
    expect(frazaCapitoleAlese(2)).toBe('2 capitole alese');
    expect(frazaCapitoleAlese(20)).toBe('20 de capitole alese');
  });

  /** Numitorul rămâne ce s-a cerut, deci fraza trebuie să spună ambele cifre. */
  it('spune și cât s-a cerut, și cât se poate da', () => {
    expect(frazaScurta(100, 47)).toBe(
      'Ai cerut 100 de grile, dar se potrivesc doar 47 de grile. Lucrarea va avea 47, iar scorul se va calcula din 100.',
    );
    expect(frazaScurta(2, 1)).toBe(
      'Ai cerut 2 grile, dar se potrivesc doar 1 grilă. Lucrarea va avea 1, iar scorul se va calcula din 2.',
    );
  });
});

describe('numărul cerut', () => {
  it('refuză ce nu e un întreg pozitiv rezonabil', () => {
    expect(nrValid(1)).toBe(true);
    expect(nrValid(300)).toBe(true);
    expect(nrValid(0)).toBe(false);
    expect(nrValid(-3)).toBe(false);
    expect(nrValid(2.5)).toBe(false);
    expect(nrValid(301)).toBe(false);
    expect(nrValid(Number.NaN)).toBe(false);
  });
});

describe('indiciul de acces din interfață', () => {
  const acum = Date.parse('2026-09-04T12:00:00Z');

  it('arată premiumul unui abonament valabil și administratorului', () => {
    expect(areAccesPremium('elev', '2026-09-05T12:00:00Z', acum)).toBe(true);
    expect(areAccesPremium('admin', null, acum)).toBe(true);
  });

  it('nu tratează un abonament expirat ca valabil', () => {
    expect(areAccesPremium('elev', '2026-09-03T12:00:00Z', acum)).toBe(false);
    expect(areAccesPremium('elev', null, acum)).toBe(false);
  });
});
