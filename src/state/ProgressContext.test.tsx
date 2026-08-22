import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttemptRow } from '../lib/progres';
import { ProgressProvider } from './ProgressContext';
import { useProgressOptional } from './progressState';

const stare = vi.hoisted(() => ({
  user: { id: 'elev-1' } as { id: string } | null,
  randuri: {} as Record<string, AttemptRow[]>,
}));

vi.mock('./authState', () => ({
  useAuth: () => ({ user: stare.user, loading: false }),
}));

// Lanțul e cel real — `select(...).order(...).range(...)` — fiindcă citirile trec
// acum prin `citesteTot`, care paginează. Un fals oprit la `order` ar trece
// verde peste tocmai bucata care s-a schimbat.
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => ({
          range: async () => {
            const randuri = stare.randuri[stare.user?.id ?? ''] ?? [];
            return { data: randuri, error: null, count: randuri.length };
          },
        }),
      }),
    }),
  },
}));

function Cititor() {
  const progres = useProgressOptional()!;
  return <div data-testid="numar-raspunsuri">{progres.loading ? 'se încarcă' : progres.attempts.length}</div>;
}

const attempt = (questionId: string): AttemptRow => ({
  question_id: questionId,
  is_correct: true,
  source: 'sesiune',
  session_id: 's1',
  sim_run_id: null,
  answered_at: '2026-08-16T10:00:00.000Z',
});

beforeEach(() => {
  stare.user = { id: 'elev-1' };
  stare.randuri = { 'elev-1': [attempt('grila-elevului-1')], 'elev-2': [] };
});

describe('ProgressProvider', () => {
  it('ascunde imediat istoricul vechi când se schimbă contul', async () => {
    const { rerender } = render(<ProgressProvider><Cititor /></ProgressProvider>);
    await waitFor(() => expect(screen.getByTestId('numar-raspunsuri')).toHaveTextContent('1'));

    stare.user = { id: 'elev-2' };
    rerender(<ProgressProvider><Cititor /></ProgressProvider>);

    expect(screen.getByTestId('numar-raspunsuri')).not.toHaveTextContent('1');
    await waitFor(() => expect(screen.getByTestId('numar-raspunsuri')).toHaveTextContent('0'));
  });
});
