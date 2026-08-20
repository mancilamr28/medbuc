import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PunctEvolutie } from '../lib/progres';
import { ScoreChart } from './ScoreChart';

const punct = (id: string, pct: number, grile: number): PunctEvolutie => ({
  id,
  pct,
  grile,
  eticheta: id === '2026-08-15' ? '15 aug.' : '16 aug.',
  answeredAt: `${id}T10:00:00Z`,
});

describe('ScoreChart', () => {
  it('explică de câte grile distincte este nevoie înainte să afișeze un procent', () => {
    render(<ScoreChart points={[]} grileDistincte={2} />);

    const titlu = screen.getByText('Avem nevoie de 5 grile distincte');
    const explicatie = screen.getByText('Ai 2 din 5; mai lipsesc 3 grile.');
    expect(titlu).toBeInTheDocument();
    expect(explicatie).toBeInTheDocument();
    expect(titlu.style.font).toContain('system-ui');
    expect(explicatie.style.font).toContain('system-ui');
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('arată scara completă, dovezile și regula care împiedică repetările imediate să umfle scorul', () => {
    render(<ScoreChart points={[punct('2026-08-15', 60, 5), punct('2026-08-16', 80, 6)]} grileDistincte={6} />);

    // `<details>`-ul tabelului e tot un `group`, deci desenul se cere pe nume.
    expect(screen.getByRole('group', { name: /^Stăpânirea grilelor/ })).toHaveAccessibleName(
      'Stăpânirea grilelor a ajuns la 80% pe baza a 6 grile distincte.',
    );
    expect(screen.getByText('6 grile distincte · 2 zile măsurate')).toBeInTheDocument();
    expect(screen.getByText(/repetările imediate nu schimbă procentul/)).toBeInTheDocument();
    expect(screen.getAllByText('0%')).not.toHaveLength(0);
    expect(screen.getAllByText('100%')).not.toHaveLength(0);
  });

  /**
   * Valorile zilelor din mijloc erau ajunse doar prin `<title>`-ul unui punct de
   * 3.5 unități rază — un tooltip de browser, cu întârziere, pe o țintă pe care
   * mouse-ul trebuia s-o nimerească din prima și pe care tastatura n-o atingea
   * niciodată. Fiecare zi are acum o bandă proprie, pe toată înălțimea.
   */
  it('dă fiecărei zile o bandă de nimerire care descoperă valoarea la hover', async () => {
    const user = userEvent.setup();
    render(<ScoreChart points={[punct('2026-08-15', 60, 5), punct('2026-08-16', 80, 6)]} grileDistincte={6} />);

    expect(screen.queryByText('15 aug. · 5 grile distincte')).not.toBeInTheDocument();

    await user.hover(screen.getByLabelText('15 aug.: 60% din 5 grile distincte.'));

    // Valorile apar și în tabel, deci căutarea se face în casetă, nu global.
    const caseta = screen.getByText('15 aug. · 5 grile distincte').parentElement!;
    expect(within(caseta).getByText('60%')).toBeInTheDocument();
  });

  /** „Aceleași detalii la focus ca la hover" — altfel tastatura rămâne fără valori. */
  it('arată aceleași detalii la focus din tastatură', async () => {
    const user = userEvent.setup();
    render(<ScoreChart points={[punct('2026-08-15', 60, 5), punct('2026-08-16', 80, 6)]} grileDistincte={6} />);

    await user.tab();

    expect(screen.getByLabelText('15 aug.: 60% din 5 grile distincte.')).toHaveFocus();
    const caseta = screen.getByText('15 aug. · 5 grile distincte').parentElement!;
    expect(within(caseta).getByText('60%')).toBeInTheDocument();
  });

  /**
   * Perechea tabelară: aceleași valori, fără să fie nevoie de hover, de focus
   * sau de vederea desenului. Un tooltip ajută, dar nu poate fi singurul drum
   * către un număr.
   */
  it('pune aceleași valori într-un tabel, ajuns fără hover', async () => {
    const user = userEvent.setup();
    render(<ScoreChart points={[punct('2026-08-15', 60, 5), punct('2026-08-16', 80, 6)]} grileDistincte={6} />);

    await user.click(screen.getByText('Datele în tabel'));

    const rand = screen.getByRole('row', { name: /15 aug\./ });
    expect(within(rand).getByText('60%')).toBeInTheDocument();
    expect(within(rand).getByText('5')).toBeInTheDocument();
  });

  it('nu desenează tabel când n-are încă niciun punct', () => {
    render(<ScoreChart points={[]} grileDistincte={2} />);

    expect(screen.queryByText('Datele în tabel')).not.toBeInTheDocument();
  });
});
