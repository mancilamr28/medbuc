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

const deschide = (attempts: readonly AttemptRow[] = [], questions = QUESTIONS) =>
  render(
    <AppProvider questions={questions} attempts={attempts}>
      <Recapitulare />
    </AppProvider>,
  );

const gresealaLa = (question_id: string, cuCateMinuteInUrma: number): AttemptRow => ({
  question_id,
  is_correct: false,
  source: 'sesiune',
  session_id: 'sesiune-initiala',
  sim_run_id: null,
  answered_at: new Date(Date.now() - cuCateMinuteInUrma * 60_000).toISOString(),
});

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
    expect(screen.getByText('În program').parentElement).toHaveTextContent(/1\s*grilă/);
    const porneste = screen.getByRole('button', { name: /Începe recapitularea/ });
    expect(porneste).toHaveClass('btn-primary', 'tinta-tactila');
    expect(porneste).toHaveStyle({ padding: '12px 18px' });
    await user.click(porneste);

    const variantaCorecta = question.opts.find(([key]) => key === question.correct)![1];
    await user.click(screen.getByRole('radio', { name: new RegExp(variantaCorecta.slice(0, 24), 'i') }));
    await user.click(screen.getByRole('button', { name: 'Verifică răspunsul' }));

    expect(screen.getByText('Corect — intervalul va crește.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Vezi rezultatul/ }));
    expect(screen.getByRole('heading', { name: 'Rezultatul tău' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/1 grilă corectă din 1/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Scor 100%' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('button', { name: /Vezi coada actualizată/ })).toHaveStyle({
      padding: '12px 20px',
    });
  });

  /**
   * Cealaltă jumătate a buclei: recapitularea spune singură ce se întâmplă cu
   * greșelile, dar nu ducea nicăieri unde se vede că progresul s-a mișcat.
   */
  it('duce de la rezultatul recapitulării la progres', async () => {
    const user = userEvent.setup();
    const question = QUESTIONS[0]!;
    deschide([raspunsGresit()]);

    await user.click(screen.getByRole('button', { name: /Începe recapitularea/ }));
    const variantaCorecta = question.opts.find(([key]) => key === question.correct)![1];
    await user.click(screen.getByRole('radio', { name: new RegExp(variantaCorecta.slice(0, 24), 'i') }));
    await user.click(screen.getByRole('button', { name: 'Verifică răspunsul' }));
    await user.click(screen.getByRole('button', { name: /Vezi rezultatul/ }));

    await user.click(screen.getByRole('button', { name: /Vezi progresul/ }));
    expect(window.location.hash).toBe('#/statistici');
  });

  it('nu inventează o coadă înainte de prima greșeală', () => {
    deschide();

    expect(screen.getByRole('heading', { name: 'Construiește prima recapitulare' })).toBeInTheDocument();
    expect(screen.getByText('Ritmul repetării')).toBeInTheDocument();
    const exerseaza = screen.getByRole('button', { name: /Exersează din capitole/ });
    expect(exerseaza).toHaveClass('btn-primary', 'tinta-tactila');
    expect(exerseaza).toHaveStyle({ padding: '12px 18px' });
    expect(screen.queryByRole('button', { name: /Începe recapitularea/ })).not.toBeInTheDocument();
  });

  it('păstrează sesiunea când elevul iese temporar din recapitulare', async () => {
    const user = userEvent.setup();
    deschide([raspunsGresit()]);

    await user.click(screen.getByRole('button', { name: /Începe recapitularea/ }));
    await user.click(screen.getByRole('button', { name: 'Ieși din recapitulare' }));

    expect(window.location.hash).toBe('#/acasa');
    expect(screen.getByText('Grila 1 din 1')).toBeInTheDocument();
  });

  /**
   * Răspunsurile sunt cheiate pe poziția din bancă, iar banca se rezolvă din
   * id-uri. Dacă o grilă retrasă între timp e **scoasă** din bancă în loc să
   * lase un gol, tot ce urmează alunecă cu o poziție: elevul vede grila
   * următoare în locul celei lipsă, iar la salvare răspunsul lui intră în
   * jurnalul imutabil pe id-ul greșit de grilă. Sesiunea de exersare păstrează
   * golurile de la bun început; recapitularea le compacta.
   */
  it('nu alunecă pe grila următoare când una dispare din bibliotecă în timpul recapitulării', async () => {
    const user = userEvent.setup();
    const [prima, adoua] = [QUESTIONS[0]!, QUESTIONS[1]!];
    const gresite = [gresealaLa(prima.id, 2), gresealaLa(adoua.id, 1)];
    const { rerender } = deschide(gresite);

    await user.click(screen.getByRole('button', { name: /Începe recapitularea/ }));
    expect(screen.getByText('Grila 1 din 2')).toBeInTheDocument();
    expect(screen.getByText(prima.text)).toBeInTheDocument();

    // Prima grilă e retrasă din Administrare cât timp recapitularea e deschisă.
    rerender(
      <AppProvider questions={QUESTIONS.filter((q) => q.id !== prima.id)} attempts={gresite}>
        <Recapitulare />
      </AppProvider>,
    );

    expect(screen.getByText('Grila nu mai este disponibilă')).toBeInTheDocument();
    expect(screen.queryByText(adoua.text)).not.toBeInTheDocument();
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
