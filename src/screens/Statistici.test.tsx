import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import type { AttemptRow } from '../lib/progres';
import { AppProvider } from '../state/AppState';
import { Statistici } from './Statistici';

vi.mock('../lib/supabase', () => import('../test/supabaseFals'));

const stare = vi.hoisted(() => ({
  attempts: [] as AttemptRow[],
  loading: false,
  error: null as string | null,
  reload: vi.fn(async () => {}),
}));

vi.mock('../state/progressState', () => ({ useProgressOptional: () => stare }));

const deschide = () => render(<AppProvider catalog={QUESTIONS}><Statistici /></AppProvider>);

beforeEach(() => {
  stare.attempts = [];
  stare.loading = false;
  stare.error = null;
  stare.reload.mockClear();
});

describe('statisticile reale', () => {
  it('arată cifrele calculate și distribuția pe surse', () => {
    const acum = new Date().toISOString();
    stare.attempts = [
      { question_id: QUESTIONS[0]!.id, is_correct: true, source: 'sesiune', session_id: 's1', sim_run_id: null, answered_at: acum },
      { question_id: QUESTIONS[1]!.id, is_correct: false, source: 'simulare', session_id: null, sim_run_id: 'm1', answered_at: acum },
      { question_id: QUESTIONS[0]!.id, is_correct: true, source: 'recapitulare', session_id: 'r1', sim_run_id: null, answered_at: acum },
    ];
    deschide();

    expect(screen.getByText('3', { selector: '.tabular' })).toBeInTheDocument();
    expect(screen.getByText('67', { selector: '.tabular' })).toBeInTheDocument();
    expect(screen.getByText('2', { selector: '.tabular' })).toBeInTheDocument();
    expect(screen.getByText('Sesiuni libere')).toBeInTheDocument();
    expect(screen.getByText('Recapitulări')).toBeInTheDocument();
  });

  it('arată o stare goală onestă și permite schimbarea perioadei', async () => {
    const user = userEvent.setup();
    deschide();

    expect(screen.getByText('Nu există răspunsuri în perioada aleasă')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Tot timpul' }));
    expect(screen.getByText('Încheie o sesiune de grile și progresul va apărea aici.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Alege un capitol' }));
    expect(window.location.hash).toBe('#/test-nou/exersare');
  });

  it('nu transformă o eroare de citire în zero și poate reîncerca', async () => {
    const user = userEvent.setup();
    stare.error = 'Nu am putut încărca progresul tău.';
    deschide();

    expect(screen.getByText(stare.error)).toBeInTheDocument();
    expect(screen.queryByText('Nu există răspunsuri în perioada aleasă')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reîncearcă' }));
    expect(stare.reload).toHaveBeenCalledOnce();
  });
});
