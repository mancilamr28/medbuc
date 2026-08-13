import { describe, expect, it } from 'vitest';
import { reportError } from './sentry';

/**
 * Fără `VITE_SENTRY_DSN` (cazul de test, de PR, de dezvoltare locală fără
 * cheie), `initSentry()` nu rulează niciodată. `reportError` trebuie să rămână
 * sigur de apelat oricum — `ErrorBoundary` îl cheamă la orice eroare prinsă,
 * și n-are voie să arunce el însuși în timp ce raportează o altă eroare.
 */
describe('reportError fără raportare configurată', () => {
  it('nu aruncă', () => {
    expect(() => reportError(new Error('test'))).not.toThrow();
  });

  it('nu aruncă nici cu un component stack atașat', () => {
    expect(() => reportError(new Error('test'), 'in <Grile>')).not.toThrow();
  });

  it('acceptă orice a fost prins, nu doar Error', () => {
    expect(() => reportError('un șir, nu un Error')).not.toThrow();
    expect(() => reportError({ ceva: 'neașteptat' })).not.toThrow();
  });
});
