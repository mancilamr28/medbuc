import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../../data/questions';
import { TAXONOMIE_SEED } from '../../data/taxonomieSeed';
import { AppProvider } from '../../state/AppState';
import { TestNou } from './TestNou';

vi.mock('../../lib/supabase', () => import('../../test/supabaseFals'));

vi.mock('../../state/progressState', () => ({ useProgressOptional: () => undefined }));

const notificari: { fel: string; text: string }[] = [];
vi.mock('../../state/toastState', () => ({
  useToast: () => ({ notify: (fel: string, text: string) => notificari.push({ fel, text }) }),
}));

const motor = vi.hoisted(() => ({
  numara: vi.fn(),
  genereaza: vi.fn(),
}));

vi.mock('../../lib/lucrari', async (original) => ({
  ...(await original<typeof import('../../lib/lucrari')>()),
  numaraCandidati: motor.numara,
  genereazaTest: motor.genereaza,
}));

/** Contorul răspunde cu ce spune harta, altfel cu totalul implicit. */
const contorul = (implicit: number, peMod: Record<string, number> = {}) =>
  motor.numara.mockImplementation(async (cerere: { mod: string }) => ({
    total: peMod[cerere.mod] ?? implicit,
    pe_materie: [],
  }));

const deschide = () =>
  render(
    <AppProvider questions={QUESTIONS} taxonomie={TAXONOMIE_SEED}>
      <TestNou />
    </AppProvider>,
  );

beforeEach(() => {
  notificari.length = 0;
  motor.numara.mockReset();
  motor.genereaza.mockReset();
  window.location.hash = '#/test-nou';
});

const buton = (name: RegExp | string) => screen.getByRole('button', { name });

describe('asistentul de test nou', () => {
  it('începe cu felul testului și arată câte grile are fiecare', async () => {
    contorul(6, { greseli: 0, favorite: 0 });
    deschide();

    expect(screen.getByText('Test nou')).toBeInTheDocument();
    await waitFor(() => expect(buton(/Exersare/)).toHaveTextContent('6 grile'));
  });

  /**
   * Un mod fără grile spune ce lipsește, nu arată un lacăt — aceeași disciplină
   * ca `EmptyState`. Iar cifra zero vine de la server, nu e ghicită: fără ea,
   * cardul ar rămâne deschis spre o generare care nu poate reuși.
   */
  it('închide un mod gol și spune de ce, în cuvinte', async () => {
    contorul(6, { greseli: 0 });
    deschide();

    await waitFor(() => expect(buton(/Greșelile mele/)).toBeDisabled());
    expect(buton(/Greșelile mele/)).toHaveTextContent(
      'Ai nevoie de cel puțin o grilă greșită ca să ai ce relua.',
    );
  });

  it('trece la conținut după ce alegi felul', async () => {
    const user = userEvent.setup();
    contorul(6);
    deschide();

    await user.click(buton(/Exersare/));
    expect(screen.getByText('Materii')).toBeInTheDocument();
    expect(screen.getByText('Capitole')).toBeInTheDocument();
  });

  /**
   * Modurile care își aleg singure grilele n-au ce restrânge pe capitol, deci
   * pasul de conținut dispare cu totul — nu se afișează gol.
   */
  it('sare peste conținut la un mod care își alege singur grilele', async () => {
    const user = userEvent.setup();
    contorul(6);
    deschide();

    await user.click(buton(/Favoritele mele/));
    expect(screen.queryByText('Capitole')).not.toBeInTheDocument();
    expect(screen.getByText('Câte grile')).toBeInTheDocument();
  });

  it('arată totalul adevărat, numărat pe server, nu în bibliotecă', async () => {
    contorul(6);
    deschide();

    await waitFor(() => expect(screen.getByText('6 grile disponibile')).toBeInTheDocument());
  });

  /**
   * Numitorul rămâne ce s-a cerut, deci lipsa trebuie spusă înainte de start,
   * nu descoperită pe panoul de rezultat.
   */
  it('spune la rezumat când banca n-are cât s-a cerut', async () => {
    const user = userEvent.setup();
    contorul(6);
    deschide();

    await user.click(buton(/Exersare/));
    await user.click(buton('Mai departe →'));
    await user.click(buton('Mai departe →'));

    await waitFor(() =>
      expect(
        screen.getByText(
          'Ai cerut 20 de grile, dar se potrivesc doar 6 grile. Lucrarea va avea 6, iar scorul se va calcula din 20.',
        ),
      ).toBeInTheDocument(),
    );
    expect(buton(/Începe cu 6 grile/)).not.toBeDisabled();
  });

  it('trimite motorului chiar filtrele alese și deschide lucrarea', async () => {
    const user = userEvent.setup();
    contorul(6);
    motor.genereaza.mockResolvedValue({
      run_id: '0f5b9c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b',
      nr_cerut: 20,
      nr_obtinut: 1,
      insuficient: true,
      lipsa: [],
    });
    deschide();

    await user.click(buton(/Exersare/));
    await user.click(screen.getByRole('button', { name: /Sistemul nervos/ }));
    await user.click(buton('Mai departe →'));
    await user.click(buton('Mai departe →'));
    await user.click(buton(/Începe cu/));

    await waitFor(() => expect(motor.genereaza).toHaveBeenCalledTimes(1));
    expect(motor.genereaza.mock.calls[0]![0]).toEqual({
      mod: 'exersare',
      // Lista goală de materii se trimite goală: „fără restricție pe axa asta".
      filtre: { materii: [], capitole: ['bio-nervos'] },
      nr: 20,
      durata_minute: null,
      amesteca_grile: true,
      amesteca_optiuni: false,
    });
    expect(window.location.hash).toBe('#/lucrare/0f5b9c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b');
  });

  /** O generare căzută lasă asistentul pe ecran, cu motivul spus. */
  it('nu pierde alegerile când generarea eșuează', async () => {
    const user = userEvent.setup();
    contorul(6);
    motor.genereaza.mockRejectedValue(new Error('fara_candidati'));
    deschide();

    await user.click(buton(/Exersare/));
    await user.click(buton('Mai departe →'));
    await user.click(buton('Mai departe →'));
    await user.click(buton(/Începe cu/));

    await waitFor(() => expect(notificari).toHaveLength(1));
    expect(notificari[0]).toEqual({
      fel: 'eroare',
      text: 'Nicio grilă nu se potrivește cu ce ai ales.',
    });
    expect(screen.getByText('Cum arată testul')).toBeInTheDocument();
  });
});
