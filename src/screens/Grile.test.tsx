import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Grile } from './Grile';
import { QUESTIONS } from '../data/questions';
import type { AttemptRow } from '../lib/progres';
import { AppProvider } from '../state/AppState';
import { useApp } from '../state/appContextValue';

vi.mock('../lib/supabase', () => import('../test/supabaseFals'));

/**
 * Jurnalul de răspunsuri, controlat din teste. Gol implicit, adică exact ce
 * vede ecranul fără `ProgressProvider` deasupra — testele de dinainte rămân
 * neschimbate. `vi.hoisted` e obligatoriu: fabrica lui `vi.mock` urcă deasupra
 * declarațiilor obișnuite și ar citi variabila în zona moartă.
 */
const jurnal = vi.hoisted(() => ({ attempts: [] as AttemptRow[] }));
vi.mock('../state/progressState', () => ({
  useProgressOptional: () => ({ attempts: jurnal.attempts, loading: false, error: null, reload: () => {} }),
}));

const raspuns = (corect: boolean): AttemptRow => ({
  question_id: 'bio-nervos-01',
  is_correct: corect,
  source: 'sesiune',
  session_id: 's1',
  sim_run_id: null,
  answered_at: '2026-08-19T10:00:00Z',
});

/**
 * Pornește direct o sesiune pe toată biblioteca, sărind peste configurare —
 * testele de aici verifică ecranul de rezolvare, nu formularul de dinainte.
 * Acela are propriile teste în `GrileConfig.test.tsx`.
 */
function PornesteBiblioteca() {
  // `start` e stabil (useCallback fără dependințe) chiar dacă `session`
  // capătă o identitate nouă la fiecare `start()`. Depinderea de `session`
  // întreg ar rula efectul din nou de fiecare dată, la infinit.
  const { start } = useApp().session;
  useEffect(() => {
    start([]);
  }, [start]);
  return null;
}

/** Pornește o sesiune pe un capitol fără nicio grilă în fixtură. */
function PornesteCapitolGol() {
  const { session } = useApp();
  return (
    <button type="button" onClick={() => session.start(['bio-celula'])}>
      capitol gol
    </button>
  );
}

const deschide = () =>
  render(
    <AppProvider questions={QUESTIONS}>
      <Grile />
      <PornesteBiblioteca />
      <PornesteCapitolGol />
    </AppProvider>,
  );

/**
 * Remontare fără `PornesteBiblioteca` — exact ce se întâmplă la un refresh:
 * aplicația pornește și trebuie să regăsească singură sesiunea din localStorage.
 */
const reincarca = (banca = QUESTIONS) =>
  render(
    <AppProvider questions={banca}>
      <Grile />
    </AppProvider>,
  );

const buton = (name: RegExp | string) => screen.getByRole('button', { name });

/** Alege varianta corectă a grilei aflate pe ecran, oricare ar fi ea. */
const raspundeCorect = async (index: number) => {
  const q = QUESTIONS[index]!;
  const text = q.opts.find(([k]) => k === q.correct)![1];
  await userEvent.click(screen.getByRole('radio', { name: new RegExp(text.slice(0, 24), 'i') }));
};

describe('sesiunea de grile', () => {
  it('mărește țintele tactile fără să îngroașe barele de navigare', () => {
    deschide();

    expect(buton('Încheie sesiunea')).toHaveClass('tinta-tactila');
    expect(screen.getByRole('tab', { name: 'Focus' })).toHaveClass('tinta-tactila');

    const pas = buton('Grila 1');
    expect(pas).toHaveClass('tinta-tactila');
    expect(pas.firstElementChild).toHaveStyle({ height: '6px' });
  });

  it('nu mai lasă răspunsul schimbat după verificare', async () => {
    deschide();
    await raspundeCorect(0);
    await userEvent.click(buton('Verifică răspunsul'));

    for (const optiune of screen.getAllByRole('radio')) {
      expect(optiune).toBeDisabled();
    }
  });

  it('ține grila ultimă la capătul listei, fără să se întoarcă la prima', async () => {
    deschide();
    const ultima = QUESTIONS.length;
    await userEvent.click(screen.getByRole('button', { name: `Grila ${ultima}` }));

    expect(screen.getByText(`Grila ${ultima} din ${ultima}`)).toBeInTheDocument();
    expect(buton(/Verifică răspunsul/)).toBeInTheDocument();
  });

  /**
   * Panoul de rezultat lipsea cu totul: terminai sesiunea și rămâneai pe ultima
   * grilă, fără să afli câte ai luat.
   */
  it('arată scorul la finalul sesiunii', async () => {
    deschide();
    await userEvent.click(buton('Încheie sesiunea'));

    expect(screen.getByText('Rezultatul tău')).toBeInTheDocument();
    expect(screen.getByText(/grile corecte din \d+/)).toBeInTheDocument();
  });

  it('socotește grilele fără răspuns împotriva ta', async () => {
    deschide();
    await raspundeCorect(0);
    await userEvent.click(buton('Verifică răspunsul'));
    await userEvent.click(buton('Încheie sesiunea'));

    const total = QUESTIONS.length;
    const asteptat = Math.round((1 / total) * 100);
    expect(screen.getByText(`${asteptat}%`)).toBeInTheDocument();
    expect(screen.getByText(`1 grilă corectă din ${total}`)).toBeInTheDocument();

    const faraRaspuns = screen.getByText('Fără răspuns').parentElement!;
    expect(within(faraRaspuns).getByText(String(total - 1))).toBeInTheDocument();
  });

  it('numără corect și greșit separat', async () => {
    deschide();
    const q = QUESTIONS[0]!;
    const gresita = q.opts.find(([k]) => k !== q.correct)![1];
    await userEvent.click(screen.getByRole('radio', { name: new RegExp(gresita.slice(0, 24), 'i') }));
    await userEvent.click(buton('Verifică răspunsul'));
    await userEvent.click(buton('Încheie sesiunea'));

    const corecte = screen.getByText('Corecte').parentElement!;
    const gresite = screen.getByText('Greșite').parentElement!;
    expect(within(corecte).getByText('0')).toBeInTheDocument();
    expect(within(gresite).getByText('1')).toBeInTheDocument();
  });

  it('sesiunea se poate relua de la zero din panoul de rezultat', async () => {
    deschide();
    await raspundeCorect(0);
    await userEvent.click(buton('Verifică răspunsul'));
    await userEvent.click(buton('Încheie sesiunea'));
    await userEvent.click(buton('Reia sesiunea'));

    expect(screen.getByText(`Grila 1 din ${QUESTIONS.length}`)).toBeInTheDocument();
    for (const optiune of screen.getAllByRole('radio')) {
      expect(optiune).not.toBeDisabled();
    }
  });

  /**
   * O grilă retrasă între alegerea capitolului și rezolvare golește bazinul, iar
   * ecranul rămânea alb: `GrileRun` se întorcea `null` fiindcă nu avea grilă.
   */
  it('spune când capitolul ales n-are nicio grilă, în loc să nu arate nimic', async () => {
    deschide();
    await userEvent.click(buton('capitol gol'));

    expect(screen.getByText('Capitolul ales nu are nicio grilă publicată')).toBeInTheDocument();
    expect(screen.queryByText(/Grila 1 din/)).not.toBeInTheDocument();
    expect(buton('Alege alt capitol')).toBeInTheDocument();
  });

  it('„Sesiune nouă" deschide iar configurarea, fără să piardă sesiunea în curs', async () => {
    deschide();
    await raspundeCorect(0);
    await userEvent.click(buton('Sesiune nouă'));

    expect(screen.getByText('Sesiune nouă')).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Scopul sesiunii' })).toBeInTheDocument();

    // Renunțarea la configurare întoarce la sesiunea neterminată, nu la una goală.
    await userEvent.click(buton('← Renunță'));
    expect(screen.getByText(`Grila 1 din ${QUESTIONS.length}`)).toBeInTheDocument();
  });

  it('nu afișează statistici inventate înainte să existe răspunsuri', async () => {
    deschide();
    await userEvent.click(screen.getByRole('tab', { name: 'Cu context' }));

    expect(screen.getByText('Statisticile apar după primele răspunsuri')).toBeInTheDocument();
    expect(screen.queryByText('68%')).not.toBeInTheDocument();
    expect(screen.queryByText('74%')).not.toBeInTheDocument();
    expect(screen.queryByText('41s')).not.toBeInTheDocument();
  });

  /**
   * Perechea testului de mai sus. Panoul era un `EmptyState` scris fix, deci
   * rămânea pe „apar după primele răspunsuri" și pentru un elev cu sute de
   * răspunsuri — o promisiune care nu se împlinea niciodată. Acum se derivă din
   * același jurnal ca cifrele de pe Acasă.
   */
  it('arată cifrele reale ale capitolului odată ce există răspunsuri', async () => {
    jurnal.attempts = [raspuns(true), raspuns(true), raspuns(false)];
    deschide();
    await userEvent.click(screen.getByRole('tab', { name: 'Cu context' }));

    const panou = screen.getByText('Capitolul tău în cifre').parentElement!;
    expect(within(panou).getByText('67%')).toBeInTheDocument();
    expect(
      within(panou).getByText('2 grile corecte din 3 răspunsuri date · ai atins 1 grilă distinctă'),
    ).toBeInTheDocument();
    expect(within(panou).queryByText('Statisticile apar după primele răspunsuri')).not.toBeInTheDocument();

    jurnal.attempts = [];
  });
});

describe('sesiunea supraviețuiește reîncărcării', () => {
  /**
   * Sesiunea trăia doar în `useState`: un refresh ștergea răspunsurile,
   * cronometrul și rezultatul — deși „Reia sesiunea" de pe Acasă promitea
   * contrariul. Din 18 sesiuni înregistrate, 8 n-au scris niciun răspuns.
   */
  it('păstrează răspunsurile și poziția după o remontare', async () => {
    const { unmount } = deschide();
    await raspundeCorect(0);
    await userEvent.click(buton('Verifică răspunsul'));
    await userEvent.click(buton(/Grila 2/));
    unmount();

    reincarca();

    // Nu s-a revenit la configurare: „Scopul sesiunii" e al formularului.
    expect(screen.queryByRole('tablist', { name: 'Scopul sesiunii' })).not.toBeInTheDocument();
    expect(screen.getByText(`Grila 2 din ${QUESTIONS.length}`)).toBeInTheDocument();

    // Prima grilă e în continuare verificată, cu răspunsul dat.
    await userEvent.click(buton(/Grila 1/));
    for (const optiune of screen.getAllByRole('radio')) {
      expect(optiune).toBeDisabled();
    }
  });

  /**
   * Miezul reparației de integritate: `order` ține id-uri, nu poziții. Banca se
   * recalcula din biblioteca vie, deci o grilă adăugată sau retrasă muta
   * răspunsurile pe alte grile — iar `attemptsFromSession` scria apoi în
   * jurnalul *imuabil* id-ul grilei aflate acum pe poziția aceea.
   */
  it('rămâne pe aceleași grile chiar dacă biblioteca s-a schimbat între timp', async () => {
    const { unmount } = deschide();
    expect(screen.getByText(QUESTIONS[0]!.text)).toBeInTheDocument();
    unmount();

    // Biblioteca revine cu altă ordine: poziția 0 e acum altă grilă.
    reincarca([...QUESTIONS].reverse());

    expect(screen.getByText(QUESTIONS[0]!.text)).toBeInTheDocument();
    expect(screen.queryByText(QUESTIONS.at(-1)!.text)).not.toBeInTheDocument();
  });
});
