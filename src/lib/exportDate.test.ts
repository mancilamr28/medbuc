import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adunaDatele, cheiLocale, numeFisier } from './exportDate';

/** Se schimbă per test, ca să se poată simula o interogare picată. */
let raspuns: { data: unknown; error: { message: string } | null } = { data: [], error: null };

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        then: (r: (v: unknown) => unknown) => r(raspuns),
      }),
    }),
  },
}));

beforeEach(() => {
  raspuns = { data: [], error: null };
});

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

/**
 * Clientul Supabase nu respinge promisiunea la o eroare raportată de server —
 * întoarce `{ data: null, error }`. Cât timp exportul citea doar `.data ?? []`,
 * un timeout devenea tăcut o listă goală, iar fișierul pleca cu toast de succes
 * și fără datele promise. Un buton care minte că dreptul GDPR a fost onorat e
 * mai rău decât unul mort.
 */
describe('adunaDatele', () => {
  it('aruncă în loc să livreze un export incomplet', async () => {
    raspuns = { data: null, error: { message: 'canceling statement due to statement timeout' } };

    await expect(adunaDatele('u1', 'ana@exemplu.ro')).rejects.toThrow(/statement timeout/);
  });

  it('spune care parte a picat', async () => {
    raspuns = { data: null, error: { message: 'permission denied' } };

    await expect(adunaDatele('u1', null)).rejects.toThrow(/sesiuni|simulari|raspunsuri|notite/);
  });

  it('întoarce datele când totul reușește', async () => {
    const date = await adunaDatele('u1', 'ana@exemplu.ro');

    expect(date.cont).toEqual({ id: 'u1', email: 'ana@exemplu.ro' });
    expect(date.raspunsuri).toEqual([]);
    expect(date.exportatLa).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
