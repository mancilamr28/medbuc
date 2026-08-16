import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttemptSync } from './AttemptSync';

const stare = vi.hoisted(() => ({
  syncRecapitulare: vi.fn(),
  reload: vi.fn(async () => {}),
  user: { id: 'user-1' },
  session: { id: 'sesiune-1', finished: false },
  recapitulare: { id: 'recap-1', phase: 'rezultat', finishedAt: 2_000 },
}));

vi.mock('../lib/syncAttempts', () => ({ syncFinishedSession: vi.fn() }));
vi.mock('../lib/syncRecapitulare', () => ({
  syncFinishedRecapitulare: (...args: unknown[]) => stare.syncRecapitulare(...args),
}));
vi.mock('../state/authState', () => ({ useAuth: () => ({ user: stare.user }) }));
vi.mock('../state/progressState', () => ({
  useProgressOptional: () => ({ reload: stare.reload }),
}));
vi.mock('../state/appContextValue', () => ({
  useApp: () => ({
    session: stare.session,
    recapitulare: stare.recapitulare,
  }),
}));

beforeEach(() => {
  stare.syncRecapitulare.mockReset();
  stare.reload.mockClear();
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
