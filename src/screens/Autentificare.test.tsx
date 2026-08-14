import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Autentificare } from './Autentificare';
import { AuthProvider } from '../state/AuthContext';
import { ToastProvider } from '../state/ToastContext';

/**
 * Modul de pornire al formularului.
 *
 * Eșecul pe care îl fixează e concret: un buton pe care scrie „Creează cont"
 * care deschide formularul de autentificare. Se întâmplă imediat ce cineva
 * adaugă o rută publică nouă și uită să o lege în `MOD_PENTRU_RUTA`.
 */
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

const monteaza = (ui: React.ReactNode) =>
  render(
    <ToastProvider>
      <AuthProvider>{ui}</AuthProvider>
    </ToastProvider>,
  );

describe('Autentificare', () => {
  it('pornește pe autentificare când nu i se cere altceva', () => {
    monteaza(<Autentificare />);
    expect(screen.getByRole('heading', { name: 'Bine ai revenit' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nume complet/i)).not.toBeInTheDocument();
  });

  it('pornește pe înregistrare când i se cere', () => {
    monteaza(<Autentificare modInitial="inregistrare" />);
    expect(screen.getByRole('heading', { name: 'Creează-ți contul' })).toBeInTheDocument();
    // Câmpul de nume există doar la înregistrare — dovada că e chiar formularul.
    expect(screen.getByText('Nume complet')).toBeInTheDocument();
  });

  it('pornește pe recuperarea parolei când i se cere', () => {
    monteaza(<Autentificare modInitial="uitat" />);
    expect(screen.getByRole('heading', { name: 'Recuperează parola' })).toBeInTheDocument();
  });

  /**
   * Marca duce înapoi la prezentare: fără linkul ăsta cardul e o fundătură
   * pentru cine a intrat aici dintr-un buton și vrea să se mai uite o dată.
   */
  it('lasă o cale înapoi spre pagina de prezentare', () => {
    monteaza(<Autentificare />);
    expect(screen.getByRole('link', { name: /MedBuc/ })).toHaveAttribute('href', '#/');
  });
});
