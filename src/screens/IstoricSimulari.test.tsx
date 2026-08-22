import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import type { SimRunRow, RaspunsLucrare } from '../lib/istoricSimulari';
import type { AttemptRow } from '../lib/progres';
import { AppProvider } from '../state/AppState';
import { Simulari } from './Simulari';

vi.mock('../lib/supabase', () => import('../test/supabaseFals'));

/**
 * Răspunsurile unei lucrări se cer abia la deschiderea ei, deci citirea e
 * dublată aici; restul modulului — funcțiile pure — rămâne cel adevărat și e
 * verificat separat în `istoricSimulari.test.ts`.
 */
const citirea = vi.hoisted(() => ({
  raspunsuri: [] as RaspunsLucrare[],
  esueaza: false,
}));

vi.mock('../lib/istoricSimulari', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/istoricSimulari')>()),
  citesteRaspunsurileLucrarii: async () => {
    if (citirea.esueaza) throw new Error('rețea');
    return citirea.raspunsuri;
  },
}));

const progres = vi.hoisted(() => ({
  simRuns: [] as SimRunRow[],
  attempts: [] as AttemptRow[],
  loading: false,
}));

vi.mock('../state/progressState', () => ({
  useProgressOptional: () => ({
    attempts: progres.attempts,
    simRuns: progres.simRuns,
    loading: progres.loading,
    error: null,
    reload: async () => {},
  }),
}));

const inceput = Date.parse('2026-08-20T09:00:00.000Z');

const lucrare = (over: Partial<SimRunRow> = {}): SimRunRow => ({
  id: 'lucrare-1',
  started_at: new Date(inceput).toISOString(),
  finished_at: new Date(inceput + 60 * 60 * 1000).toISOString(),
  config: { model: 'UMFCD · Medicină', nr: '100', durata: '180 minute' },
  question_ids: [QUESTIONS[0]!.id, QUESTIONS[1]!.id],
  ...over,
});

const raspuns = (corect: boolean): AttemptRow => ({
  question_id: QUESTIONS[0]!.id,
  is_correct: corect,
  source: 'simulare',
  session_id: null,
  sim_run_id: 'lucrare-1',
  answered_at: new Date(inceput + 60 * 60 * 1000).toISOString(),
});

const deschide = () =>
  render(
    <AppProvider questions={QUESTIONS}>
      <Simulari />
    </AppProvider>,
  );

beforeEach(() => {
  window.location.hash = '#/simulari';
  progres.simRuns = [];
  progres.attempts = [];
  progres.loading = false;
  citirea.raspunsuri = [];
  citirea.esueaza = false;
});

describe('istoricul simulărilor', () => {
  /**
   * Panoul „Simulările tale" a fost gol de la prima zi: întâi fiindcă era o
   * listă fixă de lucrări inventate, apoi fiindcă simulările nu se salvau
   * deloc. Acum are de unde să se umple.
   */
  it('arată lucrările predate, cu punctajul raportat la lucrarea întreagă', () => {
    progres.simRuns = [lucrare()];
    progres.attempts = [raspuns(true)];
    deschide();

    const panou = screen.getByText('Simulările tale').parentElement!;
    // O grilă corectă din două: grila fără răspuns rămâne în numitor.
    expect(within(panou).getByText('50%')).toBeInTheDocument();
    expect(within(panou).getByText('1 grilă corectă din 2')).toBeInTheDocument();
    expect(screen.queryByText('Nicio simulare dată încă')).not.toBeInTheDocument();
  });

  /** Lucrarea în curs trăiește în localStorage, nu în istoric. */
  it('nu trece o lucrare nepredată drept lucrare din istoric', () => {
    progres.simRuns = [lucrare({ finished_at: null })];
    deschide();

    expect(screen.getByText('Nicio simulare dată încă')).toBeInTheDocument();
  });

  it('redeschide o lucrare veche, cu răspunsurile date și fără să mai poți răspunde', async () => {
    progres.simRuns = [lucrare()];
    progres.attempts = [raspuns(false)];
    const gresita = QUESTIONS[0]!.opts.find(([k]) => k !== QUESTIONS[0]!.correct)![0];
    citirea.raspunsuri = [{ client_key: 'lucrare-1:0', question_id: QUESTIONS[0]!.id, chosen: gresita }];
    deschide();

    await userEvent.click(screen.getByRole('button', { name: /Vezi lucrarea/ }));

    expect(screen.getByText('Lucrare predată')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Recitește grilele')).toBeInTheDocument());

    // Grila 1 a fost greșită, deci apare în filtrul implicit „Ce am ratat".
    expect(screen.getByText('Grila 1')).toBeInTheDocument();
    expect(screen.getByText('Greșit')).toBeInTheDocument();
    for (const optiune of screen.getAllByRole('radio')) {
      expect(optiune).toBeDisabled();
    }

    // Configurarea nu s-a pierdut: se revine la ea, nu la o simulare pornită.
    await userEvent.click(screen.getByRole('button', { name: /Înapoi la simulări/ }));
    expect(screen.getByRole('button', { name: /Începe simularea/ })).toBeInTheDocument();
  });

  /**
   * Punctajul lucrării vine din jurnalul deja încărcat, nu din citirea asta,
   * deci o cădere de rețea nu are voie să-l ascundă — și nici să lase ecranul
   * într-o încărcare fără sfârșit.
   */
  it('păstrează punctajul când răspunsurile nu pot fi citite', async () => {
    progres.simRuns = [lucrare()];
    progres.attempts = [raspuns(true)];
    citirea.esueaza = true;
    deschide();

    await userEvent.click(screen.getByRole('button', { name: /Vezi lucrarea/ }));

    await waitFor(() =>
      expect(screen.getByText('Nu am putut citi răspunsurile lucrării')).toBeInTheDocument(),
    );
    expect(screen.getByRole('progressbar', { name: 'Scor 50%' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reîncearcă' })).toBeInTheDocument();
  });
});
