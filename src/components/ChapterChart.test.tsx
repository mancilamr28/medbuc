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

  it('nu desenează tabel când nu există capitole începute', () => {
    render(<ChapterChart rows={[]} />);

    expect(screen.queryByText('Datele în tabel')).not.toBeInTheDocument();
    expect(screen.getByText('Încă nu ai capitole începute')).toBeInTheDocument();
  });
});
