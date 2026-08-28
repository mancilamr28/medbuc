import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import type { AttemptRow } from '../lib/progres';
import { Acasa } from './Acasa';

const go = vi.fn();
const router = vi.hoisted(() => ({ goTestNou: vi.fn() }));

vi.mock('../lib/router', async (original) => ({
  ...(await original<typeof import('../lib/router')>()),
  goTestNou: router.goTestNou,
}));

const stare = vi.hoisted(() => ({ attempts: [] as AttemptRow[] }));

vi.mock('../data/taxonomieSeed', async (original) => original());

vi.mock('../state/appContextValue', async () => {
  const { TAXONOMIE_SEED } = await import('../data/taxonomieSeed');
  return {
    useApp: () => ({
      go,
      questions: QUESTIONS,
      catalog: QUESTIONS.map((q) => ({ id: q.id, capId: q.capId })),
      taxonomie: TAXONOMIE_SEED,
      session: {
        answers: {},
        finished: false,
        total: 5,
        start: vi.fn(),
        cereConfigurare: vi.fn(),
      },
      recapitulare: { items: [], scadente: [] },
    }),
  };
});

/** Un răspuns pe o grilă din fixtură, ca progresul să aibă din ce deriva. */
const raspuns = (question_id: string, is_correct: boolean): AttemptRow => ({
  question_id,
  is_correct,
  source: 'sesiune',
  session_id: 's1',
  sim_run_id: null,
  answered_at: '2026-08-20T10:00:00.000Z',
});

vi.mock('../state/authState', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'mihai@exemplu.ro' },
    profile: { fullName: 'Mihai Popescu' },
  }),
}));

vi.mock('../state/contentState', () => ({ useContentOptional: () => null }));
vi.mock('../state/progressState', () => ({
  useProgressOptional: () => ({ attempts: stare.attempts, loading: false, error: null, reload: vi.fn() }),
}));

beforeEach(() => {
  stare.attempts = [];
  go.mockReset();
  router.goTestNou.mockReset();
});

describe('Acasă', () => {
  it('pornește o sesiune nouă prin asistentul nou', async () => {
    const user = userEvent.setup();
    render(<Acasa />);

    await user.click(screen.getByRole('button', { name: 'Începe o sesiune →' }));
    expect(router.goTestNou).toHaveBeenCalledWith('exersare');
    expect(go).not.toHaveBeenCalledWith('grile');
  });

  it('afișează acțiunea de recapitulare ca buton secundar complet', () => {
    render(<Acasa />);

    const buton = screen.getByRole('button', { name: 'Vezi recapitularea' });
    expect(buton).toHaveClass('btn-ghost', 'tinta-tactila');
    expect(buton).toHaveStyle({ padding: '11px 16px' });
    expect(buton.style.font).toContain('system-ui');
  });

  /**
   * Capitolele slabe se numesc din taxonomie, iar taxonomia vine acum din bază.
   *
   * Regresia pe care o pinează: dacă ecranul cheamă `calculeazaProgres` fără
   * taxonomie, derivarea nu mai poate atribui niciun răspuns unui capitol —
   * `progres.capitole` iese gol și cardul arată „Nu avem încă greșeli
   * înregistrate" unui elev care are jumătate din răspunsuri greșite. Tăcut, și
   * exact pe ecranul care ar trebui să-i spună unde pierde puncte.
   */
  it('numește capitolele slabe din taxonomie, nu le declară inexistente', () => {
    stare.attempts = [
      raspuns('bio-nervos-01', false),
      raspuns('bio-nervos-01', false),
      raspuns('bio-osos-01', true),
    ];

    render(<Acasa />);

    expect(screen.getByText('03. Sistemul nervos')).toBeInTheDocument();
    expect(screen.queryByText('Nu avem încă greșeli înregistrate')).not.toBeInTheDocument();
  });

  it('trimite capitolul slab ales în asistent, fără să pornească motorul vechi', async () => {
    const user = userEvent.setup();
    stare.attempts = [raspuns('bio-nervos-01', false)];
    render(<Acasa />);

    await user.click(screen.getByRole('button', { name: /Sistemul nervos/ }));
    expect(router.goTestNou).toHaveBeenCalledWith('exersare', 'bio-nervos');
  });

});
