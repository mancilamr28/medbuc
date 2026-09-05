import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import type { AttemptRow } from '../lib/progres';
import { AppProvider } from '../state/AppState';
import { ToastProvider } from '../state/ToastContext';
import { Recapitulare } from './Recapitulare';

vi.mock('../lib/supabase', () => import('../test/supabaseFals'));

const genereaza = vi.hoisted(() => vi.fn(async () => ({ run_id: '10000000-0000-4000-8000-000000000001' })));
vi.mock('../lib/lucrari', async (original) => ({
  ...(await original<typeof import('../lib/lucrari')>()),
  genereazaTest: genereaza,
}));

const stareProgres = vi.hoisted(() => ({
  loading: false,
  error: null as string | null,
  reload: vi.fn(async () => {}),
}));

vi.mock('../state/progressState', () => ({
  useProgressOptional: () => ({
    attempts: [],
    loading: stareProgres.loading,
    error: stareProgres.error,
    reload: stareProgres.reload,
  }),
}));

const greseala = (question_id = QUESTIONS[0]!.id): AttemptRow => ({
  question_id,
  is_correct: false,
  source: 'sesiune',
  session_id: 'sesiune-initiala',
  sim_run_id: null,
  answered_at: new Date(Date.now() - 60_000).toISOString(),
});

const deschide = (attempts: readonly AttemptRow[] = []) =>
  render(
    <ToastProvider>
      <AppProvider catalog={QUESTIONS} attempts={attempts}>
        <Recapitulare />
      </AppProvider>
    </ToastProvider>,
  );

beforeEach(() => {
  window.location.hash = '#/recapitulare';
  stareProgres.loading = false;
  stareProgres.error = null;
  stareProgres.reload.mockClear();
  genereaza.mockClear();
});

describe('recapitularea inteligentă', () => {
  it('pornește o lucrare persistentă numai cu id-urile scadente', async () => {
    const user = userEvent.setup();
    const q = QUESTIONS[0]!;
    deschide([greseala(q.id)]);

    expect(screen.getByRole('button', { name: /Începe recapitularea/ })).toHaveTextContent('1 grilă');
    expect(screen.queryByText(q.text)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Începe recapitularea/ }));

    await waitFor(() =>
      expect(genereaza).toHaveBeenCalledWith({
        mod: 'recapitulare',
        filtre: { ids: [q.id] },
        nr: 1,
        amesteca_grile: false,
        amesteca_optiuni: false,
      }),
    );
    expect(window.location.hash).toBe('#/lucrare/10000000-0000-4000-8000-000000000001');
  });

  it('nu inventează o coadă înainte de prima greșeală', async () => {
    const user = userEvent.setup();
    deschide();

    expect(screen.getByText('Construiește prima recapitulare')).toBeInTheDocument();
    expect(screen.getByText('Ritmul repetării')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Exersează din capitole/ }));
    expect(window.location.hash).toBe('#/test-nou/exersare');
  });

  it('nu prezintă o eroare de citire drept o coadă goală și permite reîncercarea', async () => {
    const user = userEvent.setup();
    stareProgres.error = 'Nu am putut încărca progresul tău.';
    deschide();

    expect(screen.getByText('Nu am putut încărca progresul tău.')).toBeInTheDocument();
    expect(screen.queryByText('Nimic de recapitulat azi')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reîncearcă' }));
    expect(stareProgres.reload).toHaveBeenCalledOnce();
  });
});
