import { expect, it, vi } from 'vitest';
import { configuratieConsimtamant, pornesteConsimtamant, arataPreferinteCookie } from './consimtamant';
import * as CookieConsent from 'vanilla-cookieconsent';
import { seteazaAcordDiagnostic } from './sentry';

vi.mock('vanilla-cookieconsent', () => ({ run: vi.fn(async () => {}), showPreferences: vi.fn(), validConsent: vi.fn(() => true), acceptedCategory: vi.fn(() => true) }));
vi.mock('./sentry', () => ({ seteazaAcordDiagnostic: vi.fn() }));

it('păstrează opționalul oprit implicit și nu inventează servicii neconfigurate', () => {
  const c = configuratieConsimtamant(true);
  expect(c.mode).toBe('opt-in');
  expect(c.categories.diagnostic?.enabled).toBe(false);
  expect(c.categories.necessary?.readOnly).toBe(true);
  expect(configuratieConsimtamant(false).categories).not.toHaveProperty('diagnostic');
});
it('verifică acordul valid inclusiv după expirare', () => {
  const c = configuratieConsimtamant(true);
  c.onConsent!({ cookie: {} } as Parameters<NonNullable<typeof c.onConsent>>[0]);
  const verifica = vi.mocked(seteazaAcordDiagnostic).mock.calls.at(-1)![0];
  expect(verifica()).toBe(true);
  vi.mocked(CookieConsent.validConsent).mockReturnValue(false);
  expect(verifica()).toBe(false);
});
it('inițializează o singură dată și permite redeschiderea preferințelor', async () => {
  await Promise.all([pornesteConsimtamant(), pornesteConsimtamant()]);
  expect(CookieConsent.run).toHaveBeenCalledTimes(1);
  await arataPreferinteCookie();
  expect(CookieConsent.showPreferences).toHaveBeenCalledOnce();
});
