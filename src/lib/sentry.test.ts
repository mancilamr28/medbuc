import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const { init, send, capture } = vi.hoisted(() => ({ init: vi.fn(), send: vi.fn(async () => ({})), capture: vi.fn() }));
vi.mock('@sentry/react', () => ({ init, captureException: capture, makeFetchTransport: () => ({ send, flush: async () => true }) }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubEnv('VITE_SENTRY_DSN', 'https://example.invalid/1'); });
afterEach(() => vi.unstubAllEnvs());

it('fără DSN rămâne sigur pentru orice eroare, chiar și cu acord', async () => {
  vi.stubEnv('VITE_SENTRY_DSN', '');
  const sentry = await import('./sentry');
  sentry.seteazaAcordDiagnostic(() => true);
  expect(() => sentry.reportError(new Error('test'))).not.toThrow();
  expect(() => sentry.reportError(new Error('test'), 'in <Grile>')).not.toThrow();
  expect(() => sentry.reportError('un șir')).not.toThrow();
  expect(() => sentry.reportError({ ceva: 'neașteptat' })).not.toThrow();
  expect(init).not.toHaveBeenCalled();
  expect(capture).not.toHaveBeenCalled();
});

it('nu pornește fără acord; retragerea blochează toate trimiterile', async () => {
  const sentry = await import('./sentry');
  sentry.initSentry();
  sentry.reportError(new Error('înainte de acord'));
  expect(init).not.toHaveBeenCalled();
  let acord = true;
  sentry.seteazaAcordDiagnostic(() => acord);
  await vi.waitFor(() => expect(init).toHaveBeenCalledTimes(1));
  const optiuni = init.mock.calls[0]![0];
  const transport = optiuni.transport({});
  await transport.send([]);
  expect(send).toHaveBeenCalledTimes(1);
  acord = false;
  await transport.send([]);
  expect(send).toHaveBeenCalledTimes(1);
  expect(optiuni.beforeSend({ message: 'oprit' })).toBeNull();
  expect(optiuni.beforeBreadcrumb({ message: 'oprit' })).toBeNull();
  sentry.reportError(new Error('după retragere'));
  expect(capture).not.toHaveBeenCalled();
  acord = true;
  sentry.seteazaAcordDiagnostic(() => acord);
  expect(init).toHaveBeenCalledTimes(1);
  await transport.send([]);
  expect(send).toHaveBeenCalledTimes(2);
});

it('nu inițializează SDK-ul dacă acordul dispare în timpul încărcării', async () => {
  const sentry = await import('./sentry');
  let acord = true;
  sentry.seteazaAcordDiagnostic(() => acord);
  acord = false;
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(init).not.toHaveBeenCalled();
});
