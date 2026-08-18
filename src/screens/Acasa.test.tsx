import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { Acasa } from './Acasa';

const go = vi.fn();

vi.mock('../state/appContextValue', () => ({
  useApp: () => ({
    go,
    questions: QUESTIONS,
    session: { answers: {}, finished: false, total: 5, start: vi.fn() },
    recapitulare: { items: [], scadente: [] },
  }),
}));

vi.mock('../state/authState', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'mihai@exemplu.ro' },
    profile: { fullName: 'Mihai Popescu' },
  }),
}));

vi.mock('../state/contentState', () => ({ useContentOptional: () => null }));
vi.mock('../state/progressState', () => ({
  useProgressOptional: () => ({ attempts: [], loading: false, error: null, reload: vi.fn() }),
}));

describe('Acasă', () => {
  it('afișează acțiunea de recapitulare ca buton secundar complet', () => {
    render(<Acasa />);

    const buton = screen.getByRole('button', { name: 'Vezi recapitularea' });
    expect(buton).toHaveClass('btn-ghost', 'tinta-tactila');
    expect(buton).toHaveStyle({ padding: '11px 16px' });
    expect(buton.style.font).toContain('system-ui');
  });
});
