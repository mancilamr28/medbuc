import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MigrareSimulareVeche } from './MigrareSimulareVeche';

const stare = vi.hoisted(() => ({
  importa: vi.fn(),
  reset: vi.fn(),
  raporteaza: vi.fn(),
  sim: null as unknown as { run: unknown; reset: () => void },
  run: {
    id: '00000000-0000-4000-8000-000000000001',
    startedAt: 1_000,
    endsAt: 11_000,
    finishedAt: null,
    config: { model: 'UMFCD · Medicină', nr: '1', durata: '180 minute', ordine: 'Amestecate' },
    order: ['bio-nervos-01'],
    qi: 0,
    answers: { 0: 'A' as const },
    marks: { 0: true },
  },
}));

vi.mock('../lib/lucrari', () => ({ importaSimulareVeche: (...args: unknown[]) => stare.importa(...args) }));
vi.mock('../lib/sentry', () => ({ reportError: (...args: unknown[]) => stare.raporteaza(...args) }));
vi.mock('../state/appContextValue', () => ({
  useApp: () => ({ simulareVeche: { run: stare.sim.run, sterge: stare.sim.reset } }),
}));

beforeEach(() => {
  window.location.hash = '#/simulari';
  stare.importa.mockReset().mockResolvedValue({ run_id: stare.run.id });
  stare.reset.mockReset();
  stare.raporteaza.mockReset();
  stare.sim = { run: stare.run, reset: stare.reset };
});

describe('mutarea unei simulări vechi', () => {
  it('o șterge de pe dispozitiv numai după ce serverul a păstrat-o', async () => {
    render(<MigrareSimulareVeche />);

    await waitFor(() => expect(window.location.hash).toBe(`#/lucrare/${stare.run.id}`));
    expect(stare.importa).toHaveBeenCalledWith(stare.run);
    expect(stare.reset).toHaveBeenCalledOnce();
  });

  it('o păstrează pe dispozitiv după un eșec și permite reîncercarea', async () => {
    const user = userEvent.setup();
    stare.importa.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ run_id: stare.run.id });
    render(<MigrareSimulareVeche />);

    expect(await screen.findByText('Simularea ta este încă în siguranță pe acest dispozitiv')).toBeInTheDocument();
    expect(stare.reset).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Încearcă din nou' }));

    await waitFor(() => expect(stare.importa).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(window.location.hash).toBe(`#/lucrare/${stare.run.id}`));
    expect(stare.reset).toHaveBeenCalledOnce();
  });
});
