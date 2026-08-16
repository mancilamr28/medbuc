import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import type { AttemptRow } from '../lib/progres';
import { AppProvider } from '../state/AppState';
import { Recapitulare } from './Recapitulare';

vi.mock('../lib/supabase', () => import('../test/supabaseFals'));

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

const raspunsGresit = (): AttemptRow => ({
  question_id: QUESTIONS[0]!.id,
  is_correct: false,
  source: 'sesiune',
  session_id: 'sesiune-initiala',
  sim_run_id: null,
  answered_at: new Date(Date.now() - 60_000).toISOString(),
});

const deschide = (attempts: readonly AttemptRow[] = []) =>
  render(
    <AppProvider questions={QUESTIONS} attempts={attempts}>
      <Recapitulare />
    </AppProvider>,
  );

beforeEach(() => {
  window.location.hash = '#/recapitulare';
  stareProgres.loading = false;
  stareProgres.error = null;
  stareProgres.reload.mockClear();
});

describe('recapitularea inteligentă', () => {
  it('transformă o greșeală scadentă într-o sesiune și arată rezultatul real', async () => {
    const user = userEvent.setup();
    const question = QUESTIONS[0]!;
    deschide([raspunsGresit()]);

    expect(screen.getByText('1 grilă de repetat')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Începe recapitularea' }));

    const variantaCorecta = question.opts.find(([key]) => key === question.correct)![1];
    await user.click(screen.getByRole('radio', { name: new RegExp(variantaCorecta.slice(0, 24), 'i') }));
    await user.click(screen.getByRole('button', { name: 'Verifică răspunsul' }));

    expect(screen.getByText('Corect — intervalul va crește.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Încheie recapitularea' }));
    expect(screen.getByRole('heading', { name: '100% corecte' })).toBeInTheDocument();
    expect(screen.getByText(/1 grilă corectă din 1/)).toBeInTheDocument();
  });

  it('nu inventează o coadă înainte de prima greșeală', () => {
    deschide();

    expect(screen.getByText('Nimic de recapitulat azi')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Începe recapitularea' })).not.toBeInTheDocument();
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
