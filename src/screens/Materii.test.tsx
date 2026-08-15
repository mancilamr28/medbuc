import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS, materieQuestionCount } from '../data/questions';
import type { AttemptRow } from '../lib/progres';
import { AppProvider, useApp } from '../state/AppState';
import { Grile } from './Grile';
import { Materii } from './Materii';

vi.mock('../lib/supabase', () => import('../test/supabaseFals'));

let attemptsProgres: AttemptRow[] = [];
let eroareProgres: string | null = null;
vi.mock('../state/progressState', () => ({
  useProgressOptional: () => ({
    attempts: attemptsProgres,
    loading: false,
    error: eroareProgres,
    reload: async () => {},
  }),
}));

/** Exact ce face `Content()` în `App.tsx`: un singur ecran, ales de rută. */
function Aplicatie() {
  const { screen: ecran } = useApp();
  return ecran === 'grile' ? <Grile /> : <Materii />;
}

const deschide = () =>
  render(
    <AppProvider questions={QUESTIONS}>
      <Aplicatie />
    </AppProvider>,
  );

/** Rândul unui capitol, ca să nu se caute textul lui în tot ecranul. */
const rand = (element: HTMLElement) => within(element.closest('.list-row') as HTMLElement);

beforeEach(() => {
  window.location.hash = '';
  attemptsProgres = [];
  eroareProgres = null;
});

describe('exersarea pe capitol', () => {
  /**
   * Cele ~30 de butoane „Exersează" duceau toate în aceeași sesiune peste toată
   * biblioteca: capitolul ales nu ajungea nicăieri, iar `sessions.chapter_ids`
   * se scria gol.
   */
  it('deschide o sesiune doar din capitolul ales', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: 'Exersează 03. Sistemul nervos' }));

    // Antetul sesiunii, nu eticheta grilei de pe ecran: și aceea scrie materia
    // și capitolul, dar se schimbă de la o grilă la alta.
    const antet = await screen.findByText('Sesiune pe capitol');
    expect(antet.nextElementSibling).toHaveTextContent('Biologie · 03. Sistemul nervos · fără limită de timp');

    // Fixtura are o singură grilă pe capitolul ăsta; fără filtrare ar fi toate șase.
    expect(screen.getByText('Grila 1 din 1')).toBeInTheDocument();
  });

  it('butonul de materie ia toate capitolele ei', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: 'Exersează toată materia' }));

    const antet = await screen.findByText('Sesiune pe capitole');
    expect(antet.nextElementSibling).toHaveTextContent('Biologie · toate capitolele');

    // Numărul se ia din aceeași funcție pe care o folosește ecranul, nu din
    // prefixul id-ului: materia se citește din capitol, nu din felul cum e scris.
    expect(screen.getByText(`Grila 1 din ${materieQuestionCount('bio')}`)).toBeInTheDocument();
  });

  it('un capitol fără grile scrise nu se poate exersa', () => {
    deschide();
    // „01. Celula. Țesuturile" nu are nicio grilă în fixtură.
    expect(rand(screen.getByText('Celula. Țesuturile')).getByRole('button')).toBeDisabled();
  });

  it('arată progresul calculat din răspunsuri, fără să dubleze grila repetată', () => {
    const q = QUESTIONS.find((item) => item.capId === 'bio-nervos')!;
    attemptsProgres = [
      {
        question_id: q.id,
        is_correct: false,
        source: 'sesiune',
        session_id: 's1',
        sim_run_id: null,
        answered_at: '2026-08-15T10:00:00Z',
      },
      {
        question_id: q.id,
        is_correct: true,
        source: 'sesiune',
        session_id: 's2',
        sim_run_id: null,
        answered_at: '2026-08-16T10:00:00Z',
      },
    ];

    deschide();
    const nervos = rand(screen.getByText('Sistemul nervos'));
    expect(nervos.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(nervos.getByText('50%')).toBeInTheDocument();
    expect(nervos.getByText(/1 \/ 1 încercate/)).toBeInTheDocument();
  });

  it('nu prezintă o eroare de citire a progresului drept zero răspunsuri', () => {
    eroareProgres = 'Nu am putut încărca progresul tău.';

    deschide();

    expect(screen.getByText('Răspunsuri').closest('.card-flat')).toHaveTextContent('—');
    expect(rand(screen.getByText('Sistemul nervos')).getByText(/progres indisponibil/)).toBeInTheDocument();
    expect(rand(screen.getByText('Sistemul nervos')).queryByText('0%')).not.toBeInTheDocument();
  });

  /**
   * Numărătorile se fac pe biblioteca întreagă, nu pe banca sesiunii: cu
   * `session.banca`, o sesiune pornită pe un capitol golea toate celelalte
   * capitole din listă și le dezactiva butonul.
   */
  it('sesiunea pe un capitol nu golește restul listei', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: 'Exersează 03. Sistemul nervos' }));
    await screen.findByText('Sesiune pe capitol');

    window.location.hash = '#/materii';
    const endocrin = rand(await screen.findByText('Glandele endocrine'));
    expect(endocrin.getByText('1 grilă scrisă')).toBeInTheDocument();
    expect(endocrin.getByRole('button')).toBeEnabled();
  });
});
