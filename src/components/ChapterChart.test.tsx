import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ChapterChart } from './ChapterChart';
import { PRAG_RELUARE } from './chartTokens';

const CAPITOLE = [
  { id: 'bio-nervos', name: 'Sistemul nervos', pct: PRAG_RELUARE + 1 },
  { id: 'bio-osos', name: 'Sistemul osos și articulațiile lui, cu titlu lung', pct: PRAG_RELUARE - 1 },
];

describe('ChapterChart', () => {
  /**
   * Poziția față de prag era spusă doar prin culoarea barei — roșu față de
   * albastru, adică nimic pentru cine nu distinge cele două, și nimic pentru un
   * cititor de ecran. Coloana o scrie în cuvinte.
   */
  it('spune starea față de prag în cuvinte, nu doar prin culoare', async () => {
    const user = userEvent.setup();
    render(<ChapterChart rows={CAPITOLE} />);

    await user.click(screen.getByText('Datele în tabel'));

    expect(within(screen.getByRole('row', { name: /Sistemul nervos/ })).getByText('peste prag')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Sistemul osos/ })).getByText('sub prag')).toBeInTheDocument();
  });

  /** În grafic numele stă într-o coloană de 168px și se taie; în tabel e întreg. */
  it('arată numele întreg al capitolului, pe care graficul îl taie', async () => {
    const user = userEvent.setup();
    render(<ChapterChart rows={CAPITOLE} />);

    await user.click(screen.getByText('Datele în tabel'));

    const rand = screen.getByRole('row', { name: /Sistemul osos/ });
    expect(within(rand).getByText('Sistemul osos și articulațiile lui, cu titlu lung')).toBeInTheDocument();
    expect(within(rand).getByText(`${PRAG_RELUARE - 1}%`)).toBeInTheDocument();
  });

  /**
   * Ambele ecrane taie lista, dar altfel — „Acasă" după numărul de răspunsuri,
   * „Statistici" de la cel mai slab. Netrecut în UI, graficul arată ca un
   * clasament complet după procent, ceea ce nu e în niciunul dintre cazuri.
   */
  it('spune din câte capitole sunt alese cele afișate și după ce criteriu', () => {
    render(<ChapterChart rows={CAPITOLE} selectie={{ total: 20, criteriu: 'după numărul de răspunsuri' }} />);

    expect(
      screen.getByText('Primele 2 din 20 de capitole începute, după numărul de răspunsuri.'),
    ).toBeInTheDocument();
  });

  /** Regula lui `de`: „3 capitole", dar „20 de capitole". */
  it('acordă numeralul cu substantivul', () => {
    render(<ChapterChart rows={CAPITOLE} selectie={{ total: 3, criteriu: 'de la cel mai slab' }} />);

    expect(screen.getByText('Primele 2 din 3 capitole începute, de la cel mai slab.')).toBeInTheDocument();
  });

  it('nu spune nimic despre selecție când le arată pe toate', () => {
    render(
      <ChapterChart rows={CAPITOLE} selectie={{ total: CAPITOLE.length, criteriu: 'de la cel mai slab' }} />,
    );

    expect(screen.queryByText(/^Primele/)).not.toBeInTheDocument();
  });

  it('nu desenează tabel când nu există capitole începute', () => {
    render(<ChapterChart rows={[]} />);

    expect(screen.queryByText('Datele în tabel')).not.toBeInTheDocument();
    expect(screen.getByText('Încă nu ai capitole începute')).toBeInTheDocument();
  });
});
