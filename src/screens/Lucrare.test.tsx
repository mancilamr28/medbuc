import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { TAXONOMIE_SEED } from '../data/taxonomieSeed';
import { TIPURI_SEED } from '../data/tipuriSeed';
import type { GrilaDinLucrare, Lucrare as LucrareCitita, ModTest } from '../lib/lucrari';
import { AppProvider } from '../state/AppState';
import { Lucrare } from './Lucrare';

vi.mock('../lib/supabase', () => import('../test/supabaseFals'));

vi.mock('../state/progressState', () => ({ useProgressOptional: () => undefined }));

const motor = vi.hoisted(() => ({
  citeste: vi.fn(),
  raspunde: vi.fn(),
  preda: vi.fn(),
}));

vi.mock('../lib/lucrari', async (original) => ({
  ...(await original<typeof import('../lib/lucrari')>()),
  citesteTest: motor.citeste,
  raspunde: motor.raspunde,
  predaTest: motor.preda,
}));

const ID = '0f5b9c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b';

const grila = (peste: Partial<GrilaDinLucrare> = {}): GrilaDinLucrare => ({
  position: 0,
  question_id: 'bio-nervos-01',
  chosen: null,
  revealed: false,
  marked: false,
  answered_at: null,
  option_order: null,
  text: 'Care este unitatea structurală a țesutului nervos?',
  enunturi: null,
  tip_id: 'simplu',
  chapter_id: 'bio-nervos',
  optiuni: [
    { key: 'A', text: 'Neuronul' },
    { key: 'B', text: 'Nefronul' },
  ],
  ...peste,
});

const lucrarea = (mod: ModTest, grile: GrilaDinLucrare[], predata = false): LucrareCitita => ({
  run: {
    id: ID,
    mod,
    config: { mod },
    started_at: '2026-08-25T10:00:00.000Z',
    // Trebuie să fie în viitor față de momentul rulării testului. Data fixă de
    // aici a expirat la două zile după ce a fost scris testul, iar simularea
    // „în curs" se preda singură înainte ca testul să poată alege o variantă.
    ends_at: mod === 'simulare' ? new Date(Date.now() + 3 * 60 * 60_000).toISOString() : null,
    finished_at: predata ? '2026-08-25T11:00:00.000Z' : null,
    qi: 0,
    nr_cerut: grile.length,
  },
  grile,
});

const deschide = () =>
  render(
    <AppProvider questions={QUESTIONS} taxonomie={TAXONOMIE_SEED} tipuri={TIPURI_SEED}>
      <Lucrare />
    </AppProvider>,
  );

beforeEach(() => {
  motor.citeste.mockReset();
  motor.raspunde.mockReset();
  motor.preda.mockReset();
  window.location.hash = `#/lucrare/${ID}`;
});

const buton = (name: RegExp | string) => screen.getByRole('button', { name });

describe('ecranul unei lucrări', () => {
  it('spune că n-are ce deschide când adresa n-are id', () => {
    window.location.hash = '#/lucrare';
    deschide();
    expect(screen.getByText('N-am ce lucrare să deschid')).toBeInTheDocument();
    expect(motor.citeste).not.toHaveBeenCalled();
  });

  it('citește lucrarea după id-ul din adresă', async () => {
    motor.citeste.mockResolvedValue(lucrarea('exersare', [grila()]));
    deschide();

    await waitFor(() => expect(screen.getByText(/unitatea structurală/)).toBeInTheDocument());
    expect(motor.citeste).toHaveBeenCalledWith(ID);
    expect(screen.getByText('Exersare')).toBeInTheDocument();
  });

  /**
   * Alegerea unei variante rămâne locală la exersare: trimiterea ei **este**
   * verificarea, deci un clic pe o literă ar deschide răspunsul fără să-l fi
   * cerut nimeni.
   */
  it('nu deschide răspunsul doar fiindcă ai atins o variantă', async () => {
    const user = userEvent.setup();
    motor.citeste.mockResolvedValue(lucrarea('exersare', [grila()]));
    deschide();

    await waitFor(() => expect(screen.getByText(/unitatea structurală/)).toBeInTheDocument());
    await user.click(screen.getByRole('radio', { name: /Neuronul/ }));

    expect(motor.raspunde).not.toHaveBeenCalled();
    expect(screen.queryByText(/Răspuns corect/)).not.toBeInTheDocument();
  });

  it('verifică pe server și arată explicația venită de acolo', async () => {
    const user = userEvent.setup();
    motor.citeste.mockResolvedValue(lucrarea('exersare', [grila()]));
    motor.raspunde.mockResolvedValue({
      inregistrat: true,
      corect: true,
      correct: 'A',
      expl: 'Neuronul este unitatea structurală și funcțională.',
      why: { A: 'Corect.', B: 'Nefronul e la rinichi.' },
    });
    deschide();

    await waitFor(() => expect(screen.getByText(/unitatea structurală/)).toBeInTheDocument());
    await user.click(screen.getByRole('radio', { name: /Neuronul/ }));
    await user.click(buton('Verifică răspunsul'));

    expect(motor.raspunde).toHaveBeenCalledWith({ runId: ID, pozitie: 0, aleasa: 'A' });
    await waitFor(() =>
      expect(screen.getByText('Neuronul este unitatea structurală și funcțională.')).toBeInTheDocument(),
    );
    expect(screen.getByText('Răspuns corect: A')).toBeInTheDocument();
  });

  /**
   * Jumătatea de motor care contează: la o simulare în curs, răspunsul corect
   * **nu vine**, deci nu are cum să apară nicăieri pe ecran — nici în explicație,
   * nici colorat în navigator. Răspunsul pleacă la server la fiecare alegere, ca
   * să nu se piardă la reîncărcarea filei.
   */
  it('nu arată nimic despre corectitudine la o simulare în curs', async () => {
    const user = userEvent.setup();
    motor.citeste.mockResolvedValue(lucrarea('simulare', [grila(), grila({ position: 1 })]));
    motor.raspunde.mockResolvedValue({ inregistrat: true });
    deschide();

    await waitFor(() => expect(screen.getByText(/unitatea structurală/)).toBeInTheDocument());
    await user.click(screen.getByRole('radio', { name: /Neuronul/ }));

    await waitFor(() =>
      expect(motor.raspunde).toHaveBeenCalledWith({ runId: ID, pozitie: 0, aleasa: 'A' }),
    );
    expect(screen.queryByText(/Răspuns corect/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Corect\./)).not.toBeInTheDocument();
    // Butonul duce mai departe, nu la o verificare care n-are ce verifica.
    expect(buton(/Următoarea grilă/)).toBeInTheDocument();
  });

  /**
   * Marcarea retrimite varianta aleasă neschimbată: `raspunde` ridică
   * `raspuns_blocat` pentru orice altă valoare la o grilă verificată, iar un
   * `null` ar însemna „am șters răspunsul".
   */
  it('pune semnul fără să atingă răspunsul', async () => {
    const user = userEvent.setup();
    motor.citeste.mockResolvedValue(lucrarea('exersare', [grila({ chosen: 'A', revealed: true })]));
    motor.raspunde.mockResolvedValue({ inregistrat: true });
    deschide();

    await waitFor(() => expect(screen.getByText(/unitatea structurală/)).toBeInTheDocument());
    await user.click(buton('☆ Marchează'));

    expect(motor.raspunde).toHaveBeenCalledWith({
      runId: ID,
      pozitie: 0,
      aleasa: 'A',
      marcata: true,
    });
  });

  it('predă lucrarea și arată scorul venit de la server', async () => {
    const user = userEvent.setup();
    motor.citeste
      .mockResolvedValueOnce(lucrarea('exersare', [grila(), grila({ position: 1 })]))
      .mockResolvedValueOnce(
        lucrarea('exersare', [grila({ chosen: 'A', revealed: true, correct: 'A' }), grila({ position: 1 })], true),
      );
    motor.preda.mockResolvedValue({
      run_id: ID,
      finished_at: '2026-08-25T11:00:00.000Z',
      nr_cerut: 2,
      corecte: 1,
      gresite: 0,
      pct: 50,
    });
    deschide();

    await waitFor(() => expect(screen.getByText(/unitatea structurală/)).toBeInTheDocument());
    await user.click(buton('Predă lucrarea'));

    await waitFor(() => expect(screen.getByText('Rezultatul tău')).toBeInTheDocument());
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('1 grilă corectă din 2')).toBeInTheDocument();
    expect(screen.getByText('1 grilă fără răspuns')).toBeInTheDocument();
  });

  /**
   * O lucrare deschisă după predare arată direct rezultatul: `preda_test` e
   * idempotentă, deci scorul se cere din nou fără să se rescrie nimic.
   */
  it('deschide direct rezultatul unei lucrări deja predate', async () => {
    motor.citeste.mockResolvedValue(
      lucrarea('simulare', [grila({ chosen: 'B', revealed: true, correct: 'A' })], true),
    );
    motor.preda.mockResolvedValue({
      run_id: ID,
      finished_at: '2026-08-25T11:00:00.000Z',
      nr_cerut: 1,
      corecte: 0,
      gresite: 1,
      pct: 0,
    });
    deschide();

    await waitFor(() => expect(screen.getByText('Rezultatul tău')).toBeInTheDocument());
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Corect: A')).toBeInTheDocument();
  });

  /**
   * O lucrare dinaintea motorului n-are numitor: se spune cât s-a nimerit, nu
   * se pune un zero care ar fi o notă inventată.
   */
  it('nu arată procent la o lucrare fără numitor', async () => {
    const citita = lucrarea('exersare', [grila({ chosen: 'A', revealed: true, correct: 'A' })], true);
    motor.citeste.mockResolvedValue({ ...citita, run: { ...citita.run, nr_cerut: null } });
    motor.preda.mockResolvedValue({
      run_id: ID,
      finished_at: '2026-08-25T11:00:00.000Z',
      nr_cerut: null,
      corecte: 1,
      gresite: 0,
      pct: null,
    });
    deschide();

    await waitFor(() => expect(screen.getByText('Rezultatul tău')).toBeInTheDocument());
    expect(screen.getByText('1 grilă corectă')).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  /** Poziția rămâne, ca restul lucrării să nu se renumeroteze. */
  it('lasă golul vizibil când o grilă a fost retrasă între timp', async () => {
    motor.citeste.mockResolvedValue(
      lucrarea('exersare', [grila({ text: null, optiuni: null, tip_id: null, chapter_id: null })]),
    );
    deschide();

    await waitFor(() => expect(screen.getByText('Grila 1 nu mai există')).toBeInTheDocument());
  });

  it('spune de ce nu poate deschide o lucrare care nu e a ta', async () => {
    motor.citeste.mockRejectedValue(new Error('lucrare_inexistenta'));
    deschide();

    await waitFor(() =>
      expect(screen.getByText('Lucrarea asta nu există sau nu e a ta.')).toBeInTheDocument(),
    );
  });
});
