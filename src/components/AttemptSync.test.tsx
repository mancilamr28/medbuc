import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttemptSync } from './AttemptSync';

const stare = vi.hoisted(() => ({
  syncSesiune: vi.fn(),
  syncSimulare: vi.fn(),
  raporteaza: vi.fn(),
  reload: vi.fn(async () => {}),
  user: { id: 'user-1' },
  session: { id: 'sesiune-1', finished: false } as { id: string; finished: boolean; finishedAt?: number },
  // Fără lucrare predată, efectul de simulare nu pornește.
  sim: { run: null as { id: string } | null, finishedAt: null as number | null },
}));

vi.mock('../lib/sentry', () => ({ reportError: (...a: unknown[]) => stare.raporteaza(...a) }));
vi.mock('../lib/syncAttempts', () => ({
  syncFinishedSession: (...args: unknown[]) => stare.syncSesiune(...args),
}));
vi.mock('../lib/syncSimulare', () => ({
  syncFinishedSimulare: (...args: unknown[]) => stare.syncSimulare(...args),
}));
vi.mock('../state/authState', () => ({ useAuth: () => ({ user: stare.user }) }));
vi.mock('../state/progressState', () => ({
  useProgressOptional: () => ({ reload: stare.reload }),
}));
vi.mock('../state/appContextValue', () => ({
  useApp: () => ({
    session: stare.session,
    sim: stare.sim,
    questions: [],
  }),
}));

beforeEach(() => {
  // Implicit reușesc toate: testele care vor un eșec îl cer cu `…Once`.
  // Fără valoarea implicită, `mockReset` lasă mock-ul să întoarcă `undefined`,
  // iar `.then()` din efect crapă.
  stare.syncSesiune.mockReset().mockResolvedValue(undefined);
  stare.syncSimulare.mockReset().mockResolvedValue(undefined);
  stare.raporteaza.mockReset();
  stare.reload.mockClear();
  stare.sim = { run: null, finishedAt: null };
  stare.session = { id: 'sesiune-1', finished: false };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('sincronizarea simulării', () => {
  /**
   * Nu exista niciun efect pentru lucrări: un examen predat nu ajungea nicăieri.
   * Se pornește pe `finishedAt`, nu pe apăsarea butonului, ca o lucrare încheiată
   * prin expirarea timpului să se salveze la fel ca una predată de mână.
   */
  it('salvează lucrarea odată ce are oră de predare', async () => {
    stare.sim = { run: { id: 'sim-1' }, finishedAt: 5_000 };
    render(<AttemptSync />);

    await waitFor(() => expect(stare.syncSimulare).toHaveBeenCalledOnce());
    expect(stare.syncSimulare.mock.calls[0]![0]).toBe('user-1');
    expect(stare.syncSimulare.mock.calls[0]![2]).toBe(5_000);
    await waitFor(() => expect(stare.reload).toHaveBeenCalled());
  });

  it('nu salvează o lucrare încă în desfășurare', () => {
    stare.sim = { run: { id: 'sim-1' }, finishedAt: null };
    render(<AttemptSync />);

    expect(stare.syncSimulare).not.toHaveBeenCalled();
  });

  /** Aceeași lucrare nu se scrie de două ori la o re-randare. */
  it('nu resincronizează aceeași lucrare', async () => {
    stare.sim = { run: { id: 'sim-1' }, finishedAt: 5_000 };
    const { rerender } = render(<AttemptSync />);

    await waitFor(() => expect(stare.syncSimulare).toHaveBeenCalledOnce());
    rerender(<AttemptSync />);
    rerender(<AttemptSync />);

    expect(stare.syncSimulare).toHaveBeenCalledOnce();
  });
});

describe('eșecul salvării', () => {
  /**
   * Miezul reparației. Recapitularea avea de mult card de reîncercare, dar o
   * sesiune care nu se salva scria doar un `console.warn`: elevul își vedea
   * scorul, pleca de pe ecran, iar răspunsurile nu existau nicăieri. Aceeași
   * cale, două tratamente, în același fișier.
   */
  it('anunță o sesiune nesalvată, nu doar în consolă', async () => {
    stare.session = { id: 'sesiune-1', finished: true, finishedAt: 1_000 };
    stare.syncSesiune.mockRejectedValueOnce(new Error('offline'));

    render(<AttemptSync />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sesiunea nu a fost salvată.');
  });

  it('anunță și o simulare nesalvată', async () => {
    stare.sim = { run: { id: 'sim-1' }, finishedAt: 5_000 };
    stare.syncSimulare.mockRejectedValueOnce(new Error('offline'));

    render(<AttemptSync />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Simularea nu a fost salvată.');
  });

  /** Sentry vedea doar căderile de randare; o respingere RLS era invizibilă. */
  it('raportează eșecul, ca să nu rămână doar pe ecranul elevului', async () => {
    stare.session = { id: 'sesiune-1', finished: true, finishedAt: 1_000 };
    const eroare = new Error('rls');
    stare.syncSesiune.mockRejectedValueOnce(eroare);

    render(<AttemptSync />);

    await waitFor(() => expect(stare.raporteaza).toHaveBeenCalled());
    expect(stare.raporteaza.mock.calls[0]![0]).toBe(eroare);
  });

  it('reîncercarea salvează și face cardul să dispară', async () => {
    const user = userEvent.setup();
    stare.session = { id: 'sesiune-1', finished: true, finishedAt: 1_000 };
    stare.syncSesiune.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);

    render(<AttemptSync />);
    await screen.findByRole('alert');

    await user.click(screen.getByRole('button', { name: 'Reîncearcă salvarea' }));

    await waitFor(() => expect(stare.syncSesiune).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  /** Două căi picate deodată (offline) se spun amândouă, într-un singur card. */
  it('adună mai multe eșecuri într-un singur card', async () => {
    stare.session = { id: 'sesiune-1', finished: true, finishedAt: 1_000 };
    stare.sim = { run: { id: 'sim-1' }, finishedAt: 5_000 };
    stare.syncSesiune.mockRejectedValueOnce(new Error('offline'));
    stare.syncSimulare.mockRejectedValueOnce(new Error('offline'));

    render(<AttemptSync />);

    // Se recitește de fiecare dată: React înlocuiește nodul la re-randare, iar
    // o referință păstrată ar rămâne detașată din document.
    await screen.findByRole('alert');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sesiunea nu a fost salvată.'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Simularea nu a fost salvată.'));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
