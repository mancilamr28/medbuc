import { render, screen } from '@testing-library/react';
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

    expect(screen.getByText('Avem nevoie de 5 grile distincte')).toBeInTheDocument();
    expect(screen.getByText('Ai 2 din 5; mai lipsesc 3 grile.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('arată scara completă, dovezile și regula care împiedică repetările imediate să umfle scorul', () => {
    render(<ScoreChart points={[punct('2026-08-15', 60, 5), punct('2026-08-16', 80, 6)]} grileDistincte={6} />);

    expect(screen.getByRole('img')).toHaveAccessibleName('Stăpânirea grilelor a ajuns la 80% pe baza a 6 grile distincte.');
    expect(screen.getByText('6 grile distincte · 2 zile măsurate')).toBeInTheDocument();
    expect(screen.getByText(/repetările imediate nu schimbă procentul/)).toBeInTheDocument();
    expect(screen.getAllByText('0%')).not.toHaveLength(0);
    expect(screen.getAllByText('100%')).not.toHaveLength(0);
  });
});
