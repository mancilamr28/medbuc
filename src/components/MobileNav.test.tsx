import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileNav } from './MobileNav';

const stare = vi.hoisted(() => ({
  ecran: 'acasa',
  rol: 'elev',
  go: vi.fn(),
  sesiuneInCurs: false,
  simulareInCurs: false,
}));

vi.mock('../state/appContextValue', () => ({
  useApp: () => ({
    screen: stare.ecran,
    go: stare.go,
    session: { hasStarted: stare.sesiuneInCurs, finished: false },
    sim: { phase: stare.simulareInCurs ? 'rulare' : 'config' },
  }),
}));

vi.mock('../state/authState', () => ({
  useAuth: () => ({ role: stare.rol }),
}));

describe('Navigarea mobilă', () => {
  beforeEach(() => {
    stare.ecran = 'acasa';
    stare.rol = 'elev';
    stare.sesiuneInCurs = false;
    stare.simulareInCurs = false;
    stare.go.mockReset();
  });

  it('ține un singur drum pentru testele noi în navigarea principală', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    const navigare = screen.getByRole('navigation', { name: 'Navigare principală' });
    expect(within(navigare).getAllByRole('button').map((buton) => buton.textContent)).toEqual([
      'Acasă',
      'Test nou',
      'Recapitulare',
      'Statistici',
      'Mai multe',
    ]);

    await user.click(within(navigare).getByRole('button', { name: 'Test nou' }));
    expect(stare.go).toHaveBeenCalledWith('test-nou');
  });

  it('ține în meniul secundar lucrările vechi care încă sunt în curs', async () => {
    stare.sesiuneInCurs = true;
    stare.simulareInCurs = true;
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: 'Mai multe' }));
    const meniu = screen.getByRole('dialog', { name: 'Mai multe' });
    expect(within(meniu).getByRole('button', { name: 'Continuă sesiunea' })).toBeInTheDocument();
    expect(within(meniu).getByRole('button', { name: 'Continuă simularea' })).toBeInTheDocument();
  });

  it('separă opțiunile reale de funcțiile care sunt încă în lucru', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: 'Mai multe' }));
    const meniu = screen.getByRole('dialog', { name: 'Mai multe' });

    expect(within(meniu).getByRole('button', { name: 'Profil și setări' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navigare principală' })).toHaveTextContent('Recapitulare');
    expect(screen.getByRole('navigation', { name: 'Navigare principală' })).toHaveTextContent('Statistici');
    expect(within(meniu).getByRole('button', { name: 'Notițe' })).toBeInTheDocument();
    // Un singur ecran mai e „în lucru" acum (Planul meu): un antet + o pastilă.
    expect(within(meniu).getAllByText('În curând')).toHaveLength(2);

    await user.click(within(meniu).getByRole('button', { name: 'Notițe' }));
    expect(stare.go).toHaveBeenCalledWith('notite');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Recapitulare' }));
    expect(stare.go).toHaveBeenCalledWith('recapitulare');

    await user.click(screen.getByRole('button', { name: 'Statistici' }));
    expect(stare.go).toHaveBeenCalledWith('statistici');

    await user.click(screen.getByRole('button', { name: 'Mai multe' }));

    await user.click(screen.getByRole('button', { name: 'Profil și setări' }));
    expect(stare.go).toHaveBeenCalledWith('setari');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('arată administrarea doar contului cu rol de administrator', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: 'Mai multe' }));
    expect(screen.queryByRole('button', { name: 'Administrare' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Închide meniul' }));
    stare.rol = 'admin';
    rerender(<MobileNav />);
    await user.click(screen.getByRole('button', { name: 'Mai multe' }));
    expect(screen.getByRole('button', { name: 'Administrare' })).toBeInTheDocument();
  });

  it('se închide cu Escape și întoarce focusul la butonul care l-a deschis', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    const declansator = screen.getByRole('button', { name: 'Mai multe' });
    await user.click(declansator);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Închide meniul' })).toHaveFocus());

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(declansator).toHaveFocus();
  });
});
