import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TAXONOMIE_SEED } from '../data/taxonomieSeed';
import { construiesteColectii } from '../lib/colectii';
import { AdminTestePredefinite } from './AdminTestePredefinite';

const api = vi.hoisted(() => ({
  citeste: vi.fn(),
  salveaza: vi.fn(),
}));
const notifica = vi.hoisted(() => vi.fn());

vi.mock('../lib/testePredefinite', async (original) => ({
  ...(await original<typeof import('../lib/testePredefinite')>()),
  citesteTestePredefiniteAdmin: api.citeste,
  salveazaTestPredefinit: api.salveaza,
}));

vi.mock('../state/toastState', () => ({ useToast: () => ({ notify: notifica }) }));

const colectii = construiesteColectii([
  {
    id: 'umfcd-2026',
    centru_id: 'umfcd',
    nume: 'Admitere UMFCD 2026',
    tip: 'subiect_oficial',
    an: 2026,
    sursa_bibliografica: '',
    acces: 'liber',
    publicat: true,
    position: 0,
  },
]);

beforeEach(() => {
  api.citeste.mockReset().mockResolvedValue([]);
  api.salveaza.mockReset().mockResolvedValue('test-nou');
});

describe('constructorul testelor predefinite', () => {
  it('arată definițiile existente și starea lor', async () => {
    api.citeste.mockResolvedValue([
      {
        id: 'admitere-2026',
        centru_id: 'umfcd',
        colectie_id: 'umfcd-2026',
        nume: 'Admitere 2026',
        descriere: '',
        mod_selectie: 'fix',
        regula: {},
        nr_grile: 2,
        durata_minute: 180,
        acces: 'liber',
        publicat: true,
        position: 0,
        grile: ['bio-nervos-01', 'chim-alcooli-01'],
      },
    ]);

    render(<AdminTestePredefinite taxonomie={TAXONOMIE_SEED} colectii={colectii} />);

    expect(await screen.findByText('Admitere 2026')).toBeInTheDocument();
    expect(screen.getByText('Publicat')).toBeInTheDocument();
    expect(screen.getByText('2 grile')).toBeInTheDocument();
  });

  it('păstrează ordinea scrisă pentru un test fix', async () => {
    const user = userEvent.setup();
    render(<AdminTestePredefinite taxonomie={TAXONOMIE_SEED} colectii={colectii} />);

    await user.type(screen.getByLabelText('Identificatorul testului'), 'admitere-2026');
    await user.type(screen.getByLabelText('Numele testului'), 'Admitere 2026');
    await user.type(
      screen.getByLabelText('Grilele în ordinea testului'),
      'bio-nervos-01\nchim-alcooli-01',
    );
    await user.click(screen.getByRole('button', { name: 'Salvează testul' }));

    await waitFor(() => expect(api.salveaza).toHaveBeenCalledTimes(1));
    expect(api.salveaza.mock.calls[0]![0]).toMatchObject({
      id: 'admitere-2026',
      mod_selectie: 'fix',
      grile: ['bio-nervos-01', 'chim-alcooli-01'],
    });
  });

  it('compune dinamic cotele pe materii pentru o simulare', async () => {
    const user = userEvent.setup();
    render(<AdminTestePredefinite taxonomie={TAXONOMIE_SEED} colectii={colectii} />);

    await user.selectOptions(screen.getByLabelText('Cum se aleg grilele'), 'dupa_regula');
    await user.type(screen.getByLabelText('Identificatorul testului'), 'simulare-2027');
    await user.type(screen.getByLabelText('Numele testului'), 'Simulare 2027');
    await user.clear(screen.getByLabelText('Număr pentru Biologie'));
    await user.type(screen.getByLabelText('Număr pentru Biologie'), '60');
    await user.clear(screen.getByLabelText('Număr pentru Chimie organică'));
    await user.type(screen.getByLabelText('Număr pentru Chimie organică'), '40');
    await user.click(screen.getByRole('button', { name: 'Salvează testul' }));

    await waitFor(() => expect(api.salveaza).toHaveBeenCalledTimes(1));
    expect(api.salveaza.mock.calls[0]![0]).toMatchObject({
      mod_selectie: 'dupa_regula',
      regula: {
        cote: [
          { materie_id: 'bio', nr: 60 },
          { materie_id: 'chim', nr: 40 },
        ],
        strict: true,
      },
    });
  });
});
