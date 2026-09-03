import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { construiesteColectii } from '../lib/colectii';
import { ToastProvider } from '../state/ToastContext';
import { AdminColectii } from './AdminColectii';

const salveaza = vi.hoisted(() => vi.fn());
vi.mock('../lib/continut', () => ({ salveazaColectie: salveaza }));
vi.mock('../lib/sentry', () => ({ reportError: vi.fn() }));

const colectii = construiesteColectii([
  {
    id: 'corint-nervos',
    centru_id: null,
    nume: 'Corint – Sistemul nervos',
    tip: 'culegere',
    an: null,
    sursa_bibliografica: 'Corint',
    acces: 'liber',
    publicat: true,
    position: 0,
  },
]);

beforeEach(() => salveaza.mockReset().mockResolvedValue(undefined));

describe('accesul colecțiilor în Administrare', () => {
  it('salvează nivelul ales pentru o colecție nouă', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <AdminColectii colectii={colectii} dupaSalvare={vi.fn()} />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText('Identificator'), 'corint-endocrin');
    await user.type(screen.getByLabelText('Nume'), 'Corint – Sistemul endocrin');
    await user.selectOptions(screen.getByLabelText('Accesul colecției'), 'premium');
    await user.click(screen.getByRole('button', { name: 'Adaugă colecția' }));

    await waitFor(() => expect(salveaza).toHaveBeenCalledTimes(1));
    expect(salveaza.mock.calls[0]![0]).toMatchObject({
      id: 'corint-endocrin',
      acces: 'premium',
    });
  });

  it('poate schimba rapid o colecție existentă în premium', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <AdminColectii colectii={colectii} dupaSalvare={vi.fn()} />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Fă premium' }));
    await waitFor(() => expect(salveaza).toHaveBeenCalledTimes(1));
    expect(salveaza.mock.calls[0]![0]).toMatchObject({
      id: 'corint-nervos',
      acces: 'premium',
    });
  });
});
