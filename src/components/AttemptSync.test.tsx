import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttemptSync } from './AttemptSync';

const stare = vi.hoisted(() => ({
  syncRecapitulare: vi.fn(),
  syncSimulare: vi.fn(),
  reload: vi.fn(async () => {}),
  user: { id: 'user-1' },
  session: { id: 'sesiune-1', finished: false },
  recapitulare: { id: 'recap-1', phase: 'rezultat', finishedAt: 2_000 },
  // Fără lucrare predată, efectul de simulare nu pornește.
  sim: { run: null as { id: string } | null, finishedAt: null as number | null },
}));

vi.mock('../lib/syncAttempts', () => ({ syncFinishedSession: vi.fn() }));
vi.mock('../lib/syncRecapitulare', () => ({
  syncFinishedRecapitulare: (...args: unknown[]) => stare.syncRecapitulare(...args),
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
    recapitulare: stare.recapitulare,
    sim: stare.sim,
    questions: [],
  }),
}));

beforeEach(() => {
  // Implicit reușesc amândouă: testele care vor un eșec îl cer cu `…Once`.
  // Fără valoarea implicită, `mockReset` lasă mock-ul să întoarcă `undefined`,
  // iar `.then()` din efect crapă.
  stare.syncRecapitulare.mockReset().mockResolvedValue(undefined);
  stare.syncSimulare.mockReset().mockResolvedValue(undefined);
  stare.reload.mockClear();
  stare.sim = { run: null, finishedAt: null };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('sincronizarea recapitulării', () => {
  it('anunță eșecul și permite reîncercarea fără a dubla răspunsurile', async () => {
    const user = userEvent.setup();
    stare.syncRecapitulare.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    render(<AttemptSync />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Recapitularea nu a fost salvată');
    await user.click(screen.getByRole('button', { name: 'Reîncearcă salvarea' }));

    await waitFor(() => expect(stare.syncRecapitulare).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(stare.reload).toHaveBeenCalledOnce();
  });
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
