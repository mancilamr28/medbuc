import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Grile } from './Grile';
import { QUESTIONS } from '../data/questions';
import { AppProvider } from '../state/AppState';

const deschide = () =>
  render(
    <AppProvider questions={QUESTIONS}>
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
    expect(screen.getByText(/din \d+ grile corecte/)).toBeInTheDocument();
  });

  it('socotește grilele fără răspuns împotriva ta', async () => {
    deschide();
    await raspundeCorect(0);
    await userEvent.click(buton('Verifică răspunsul'));
    await userEvent.click(buton('Încheie sesiunea'));

    const total = QUESTIONS.length;
    const asteptat = Math.round((1 / total) * 100);
    expect(screen.getByText(`${asteptat}%`)).toBeInTheDocument();
    expect(screen.getByText(`1 din ${total} grile corecte`)).toBeInTheDocument();

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
    await userEvent.click(buton(/Reia sesiunea|Începe din nou|Sesiune nouă/));

    expect(screen.getByText(`Grila 1 din ${QUESTIONS.length}`)).toBeInTheDocument();
    for (const optiune of screen.getAllByRole('radio')) {
      expect(optiune).not.toBeDisabled();
    }
  });

  it('nu afișează statistici inventate înainte să existe răspunsuri', async () => {
    deschide();
    await userEvent.click(screen.getByRole('tab', { name: 'Cu context' }));

    expect(screen.getByText('Statisticile apar după primele răspunsuri')).toBeInTheDocument();
    expect(screen.queryByText('68%')).not.toBeInTheDocument();
    expect(screen.queryByText('74%')).not.toBeInTheDocument();
    expect(screen.queryByText('41s')).not.toBeInTheDocument();
  });
});
