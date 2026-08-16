import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileNav } from './MobileNav';

const stare = vi.hoisted(() => ({
  ecran: 'acasa',
  rol: 'elev',
  go: vi.fn(),
}));

vi.mock('../state/appContextValue', () => ({
  useApp: () => ({ screen: stare.ecran, go: stare.go }),
}));

vi.mock('../state/authState', () => ({
  useAuth: () => ({ role: stare.rol }),
}));

describe('Navigarea mobilă', () => {
  beforeEach(() => {
    stare.ecran = 'acasa';
    stare.rol = 'elev';
    stare.go.mockReset();
  });

  it('ține destinațiile principale la îndemână și deschide direct simulările', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    const navigare = screen.getByRole('navigation', { name: 'Navigare principală' });
    expect(within(navigare).getAllByRole('button').map((buton) => buton.textContent)).toEqual([
      'Acasă',
      'Materii',
      'Grile',
      'Simulări',
      'Mai multe',
    ]);

    await user.click(within(navigare).getByRole('button', { name: 'Simulări' }));
    expect(stare.go).toHaveBeenCalledWith('simulari');
  });

  it('separă opțiunile reale de funcțiile care sunt încă în lucru', async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole('button', { name: 'Mai multe' }));
    const meniu = screen.getByRole('dialog', { name: 'Mai multe' });

    expect(within(meniu).getByRole('button', { name: 'Profil și setări' })).toBeInTheDocument();
    expect(within(meniu).getByRole('button', { name: 'Recapitulare' })).toBeInTheDocument();
    expect(within(meniu).getByText('Statistici și progres')).toBeInTheDocument();
    expect(within(meniu).getAllByText('În curând')).toHaveLength(4);

    await user.click(within(meniu).getByRole('button', { name: 'Recapitulare' }));
    expect(stare.go).toHaveBeenCalledWith('recapitulare');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

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
