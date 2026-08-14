import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Setari } from './Setari';
import { AppProvider } from '../state/AppState';
import { AuthProvider } from '../state/AuthContext';
import { ToastProvider } from '../state/ToastContext';

/**
 * Ecranul „Profil și setări" avea unsprezece controale, dintre care nouă nu
 * făceau nimic: șapte butoane „Modifică" — inclusiv pe rânduri care n-au ce
 * schimba, ca facultatea — plus „Descarcă datele" și „Șterge contul", adică
 * exact cele două drepturi GDPR.
 *
 * Se mimează `lib/supabase`, nu `useAuth`: așa trece prin `AuthProvider`-ul
 * adevărat și se verifică și legătura, nu doar desenul.
 */
const PROFIL = { id: 'u1', full_name: 'Mihai Popescu', role: 'elev' };

const updateProfil = vi.fn(async () => ({ error: null }));
const updateUser = vi.fn(async () => ({ error: null }));
const rpc = vi.fn(async () => ({ error: null }));
const signOut = vi.fn(async () => ({ error: null }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'mihai@exemplu.ro' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      updateUser: (...a: unknown[]) => updateUser(...(a as [])),
      signOut: () => signOut(),
    },
    rpc: (...a: unknown[]) => rpc(...(a as [])),
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: PROFIL, error: null }),
          maybeSingle: async () => ({ data: PROFIL, error: null }),
        }),
        then: (r: (v: { data: unknown[]; error: null }) => unknown) => r({ data: [], error: null }),
      }),
      update: () => ({ eq: () => updateProfil() }),
    }),
  },
}));

function monteaza() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <Setari />
        </AppProvider>
      </AuthProvider>
    </ToastProvider>,
  );
}

/**
 * Așteaptă încărcarea profilului, altfel se testează starea goală de dinainte.
 * Numele apare de două ori — în antet și pe rândul lui — deci se numără, nu se
 * caută unul singur.
 */
async function gata() {
  await waitFor(() => expect(screen.getAllByText('Mihai Popescu').length).toBeGreaterThan(0));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Profil și setări', () => {
  /**
   * Miezul reparației: „Modifică" apare doar unde chiar se poate modifica ceva.
   * Facultatea, specializarea și probele sunt fixe pentru produs — aveau buton
   * și n-aveau ce face cu el.
   */
  it('nu mai pune „Modifică" pe rândurile care nu se pot schimba', async () => {
    monteaza();
    await gata();

    const butoane = screen.getAllByRole('button', { name: 'Modifică' });
    expect(butoane).toHaveLength(2);

    expect(screen.getByText('Facultate')).toBeInTheDocument();
    expect(screen.getByText('UMFCD „Carol Davila”, București')).toBeInTheDocument();
  });

  it('salvează numele în profil', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(screen.getAllByRole('button', { name: 'Modifică' })[0]!);
    const camp = screen.getByLabelText('Nume');
    await user.clear(camp);
    await user.type(camp, 'Mihai Mancila');
    await user.click(screen.getByRole('button', { name: 'Salvează' }));

    await waitFor(() => expect(updateProfil).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Numele a fost salvat.')).toBeInTheDocument();
  });

  it('renunțarea la editare nu salvează nimic', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(screen.getAllByRole('button', { name: 'Modifică' })[0]!);
    await user.type(screen.getByLabelText('Nume'), 'ceva');
    await user.click(screen.getByRole('button', { name: 'Renunță' }));

    expect(updateProfil).not.toHaveBeenCalled();
  });

  /**
   * Ștergerea contului e ireversibilă și cascadează peste tot ce a lucrat elevul.
   * Un singur clic nu are voie să o pornească — aceeași lecție ca la „Predă
   * lucrarea", care ștergea examenul fără să întrebe.
   */
  it('nu șterge contul de la primul clic', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(screen.getByRole('button', { name: 'Șterge contul' }));

    expect(rpc).not.toHaveBeenCalled();
    expect(screen.getByText('Ștergem contul și tot ce ai lucrat?')).toBeInTheDocument();
  });

  it('șterge contul după confirmare, apoi deconectează', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(screen.getByRole('button', { name: 'Șterge contul' }));
    await user.click(screen.getByRole('button', { name: 'Da, șterge definitiv' }));

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('sterge_contul'));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });

  /**
   * Cheile `medbuc.*` sunt indexate pe conținut, nu pe utilizator. Rămase pe
   * dispozitiv după ce contul a dispărut din bază, următorul cont făcut pe
   * același browser le citește ca pe ale lui — pe un laptop de familie, notițele
   * și lucrarea altcuiva. Ecranul promite „cu tot cu răspunsuri, simulări și
   * notițe", deci promisiunea are și o parte locală.
   */
  it('nu lasă notițele și lucrarea pe dispozitiv', async () => {
    const user = userEvent.setup();
    localStorage.setItem('medbuc.note.bio-nervos', '"mnemonicul meu"');
    localStorage.setItem('medbuc.sim.run', '{"order":[]}');
    localStorage.setItem('alt-site.token', 'nu se atinge');

    monteaza();
    await gata();
    await user.click(screen.getByRole('button', { name: 'Șterge contul' }));
    await user.click(screen.getByRole('button', { name: 'Da, șterge definitiv' }));

    await waitFor(() => expect(localStorage.getItem('medbuc.note.bio-nervos')).toBeNull());
    expect(localStorage.getItem('medbuc.sim.run')).toBeNull();
    expect(localStorage.getItem('alt-site.token')).toBe('nu se atinge');
  });

  it('se poate renunța la ștergere', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(screen.getByRole('button', { name: 'Șterge contul' }));
    await user.click(screen.getByRole('button', { name: 'Nu, renunț' }));

    expect(rpc).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Descarcă datele' })).toBeInTheDocument();
  });

  it('descarcă datele contului', async () => {
    const user = userEvent.setup();
    URL.createObjectURL = vi.fn(() => 'blob:fals');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    monteaza();
    await gata();
    await user.click(screen.getByRole('button', { name: 'Descarcă datele' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(await screen.findByText('Datele tale au fost descărcate.')).toBeInTheDocument();
    click.mockRestore();
  });
});
