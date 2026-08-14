import { describe, expect, it } from 'vitest';
import { cheiLocale, numeFisier } from './exportDate';

/** Un `localStorage` de mână — `cheiLocale` ia depozitul ca parametru tocmai ca să meargă asta. */
function depozit(perechi: Record<string, string>): Storage {
  const chei = Object.keys(perechi);
  return {
    length: chei.length,
    key: (i: number) => chei[i] ?? null,
    getItem: (k: string) => perechi[k] ?? null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  } as Storage;
}

describe('numeFisier', () => {
  it('pune data în față, cu zerouri', () => {
    expect(numeFisier(new Date(2026, 7, 9))).toBe('medbuc-datele-mele-2026-08-09.json');
  });
});

describe('cheiLocale', () => {
  it('ia doar cheile aplicației', () => {
    const r = cheiLocale(
      depozit({
        'medbuc.theme': '"dark"',
        'medbuc.note.bio-nervos': 'notița mea',
        'alt-site.token': 'secret',
        theme: 'light',
      }),
    );

    expect(r).toEqual({
      'medbuc.theme': '"dark"',
      'medbuc.note.bio-nervos': 'notița mea',
    });
  });

  /** Exportul e al utilizatorului: dacă un alt site a scris în același depozit, nu îl luăm cu noi. */
  it('nu scurge chei ale altor site-uri', () => {
    const r = cheiLocale(depozit({ 'alt-site.token': 'secret' }));
    expect(Object.keys(r)).toHaveLength(0);
  });

  it('merge pe un depozit gol', () => {
    expect(cheiLocale(depozit({}))).toEqual({});
  });
});
