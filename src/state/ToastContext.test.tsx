import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

function Declansator() {
  const { notify } = useToast();
  return (
    <>
      <button type="button" onClick={() => notify('succes', 'Grilă salvată')}>
        succes
      </button>
      <button type="button" onClick={() => notify('eroare', 'Nu s-a putut salva')}>
        eroare
      </button>
    </>
  );
}

const deschide = () =>
  render(
    <ToastProvider>
      <Declansator />
    </ToastProvider>,
  );

/**
 * Singurul mecanism prin care aplicația poate spune azi că o acțiune a reușit
 * sau a eșuat. Testele verifică exact ce va conta când primele acțiuni async
 * (Faza 3) îl vor folosi: apare, dispare singur, poate fi închis manual, și mai
 * multe notificări nu se acoperă una pe alta.
 */
describe('toast', () => {
  it('arată mesajul la apel', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: 'succes' }));

    expect(screen.getByText('Grilă salvată')).toBeInTheDocument();
  });

  it('marchează o eroare cu rol de alertă, nu de status', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: 'eroare' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nu s-a putut salva');
  });

  it('un succes e status, nu alertă — nu întrerupe cititorul de ecran', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: 'succes' }));

    expect(screen.getByRole('status')).toHaveTextContent('Grilă salvată');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('se poate închide manual', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: 'succes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Închide' }));

    expect(screen.queryByText('Grilă salvată')).not.toBeInTheDocument();
  });

  it('mai multe notificări se acumulează, nu se înlocuiesc', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: 'succes' }));
    await userEvent.click(screen.getByRole('button', { name: 'eroare' }));

    expect(screen.getByText('Grilă salvată')).toBeInTheDocument();
    expect(screen.getByText('Nu s-a putut salva')).toBeInTheDocument();
  });
});

describe('toast — dispariția automată', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispare singur după câteva secunde', async () => {
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    deschide();
    await user.click(screen.getByRole('button', { name: 'succes' }));
    expect(screen.getByText('Grilă salvată')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await waitFor(() => expect(screen.queryByText('Grilă salvată')).not.toBeInTheDocument());
  });
});

describe('useToast în afara providerului', () => {
  it('aruncă din start, nu la primul `notify`', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Declansator />)).toThrow(/ToastProvider/);
    consoleError.mockRestore();
  });
});
