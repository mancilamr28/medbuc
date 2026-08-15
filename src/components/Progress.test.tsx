import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from './Progress';

describe('Progress', () => {
  it('folosește un track dimensional, nu un span inline de 0 × 0', () => {
    render(<Progress pct={50} height={5} label="Progres capitol" />);

    const track = screen.getByRole('progressbar', { name: 'Progres capitol' });
    expect(track).toHaveStyle({ display: 'block', width: '100%', height: '5px' });
    expect(track.firstElementChild).toHaveStyle({ width: '50%' });
  });
});
