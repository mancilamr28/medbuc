import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { NOTE_PREFIX } from '../lib/migrations';
import { AppProvider } from '../state/AppState';
import { Notite } from './Notite';

/**
 * Fără sesiune, ecranul se poartă exact ca înainte: totul din `localStorage` și
 * nicio cerere. Testele vechi rămân așa; cel nou pornește o sesiune.
 */
const sesiune = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock('../state/authState', () => ({ useAuthOptional: () => ({ user: sesiune.user }) }));

const cont = vi.hoisted(() => ({
  notite: [] as { chapter_id: string; body: string; updated_at: string }[],
}));
vi.mock('../lib/notiteBaza', () => ({
  citesteNotite: async () => cont.notite,
  citesteNotita: async (capId: string) => cont.notite.find((n) => n.chapter_id === capId) ?? null,
  salveazaNotita: async () => {},
  stergeNotitaDinBaza: async (capId: string) => {
    cont.notite = cont.notite.filter((n) => n.chapter_id !== capId);
  },
}));

beforeEach(() => {
  sesiune.user = null;
  cont.notite = [];
});

const CHEIE = `${NOTE_PREFIX}bio-nervos`;
const CAPITOL = '03. Sistemul nervos';

/**
 * `Notite` cere doar `useApp()` pentru `go`, deci merge montat cu `AppProvider`
 * singur — fără `AuthProvider` și fără rețea, la fel ca în `AppState.test.tsx`.
 */
const monteaza = () =>
  render(
    <AppProvider questions={QUESTIONS}>
      <Notite />
    </AppProvider>,
  );

describe('Notițele mele', () => {
  /**
   * „Șterge" golea notița prin `setNote('')`, iar `onSters()` scotea cardul din
   * listă în același handler. `usePersistentState` scria în `localStorage`
   * *înăuntrul* updater-ului lui `setState`, așa că React arunca actualizarea în
   * așteptare odată cu componenta demontată și scrierea nu mai rula niciodată:
   * notița dispărea de pe ecran, dar rămânea salvată și reapărea la reîncărcare.
   *
   * De aceea nu e destul să se verifice că a dispărut cardul — exact asta
   * funcționa și înainte. Verificarea care contează e storage-ul, plus o
   * remontare, care e ce pățea elevul.
   */
  it('„Șterge" scoate notița din localStorage, nu doar de pe ecran', async () => {
    const user = userEvent.setup();
    localStorage.setItem(CHEIE, JSON.stringify('sinapsa e joncțiunea dintre doi neuroni'));

    const { unmount } = monteaza();
    expect(screen.getByText(CAPITOL)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Șterge' }));
    expect(screen.queryByText(CAPITOL)).not.toBeInTheDocument();

    expect(localStorage.getItem(CHEIE)).toBeNull();

    unmount();
    monteaza();
    expect(screen.queryByText(CAPITOL)).not.toBeInTheDocument();
    expect(screen.getByText('Nicio notiță încă')).toBeInTheDocument();
  });

  /**
   * Aceeași defecțiune, pe drumul pe care chiar îl parcurge elevul — și singurul
   * pe care se vedea paguba. Cât timp cardul n-are nicio actualizare în
   * așteptare, React evaluează updater-ul pe loc și apucă să scrie `""`, iar
   * `capitoleCuNotita` oricum sare peste notițele goale, deci nimic nu reapare.
   * După o editare există lucru în așteptare pe fibră, evaluarea imediată nu mai
   * are loc, iar scrierea se pierde complet la demontare: în storage rămâne
   * textul întreg și notița „ștearsă" se întoarce la următoarea deschidere.
   */
  it('nu readuce notița ștearsă după ce a fost editată', async () => {
    const user = userEvent.setup();
    localStorage.setItem(CHEIE, JSON.stringify('sinapsa e joncțiunea dintre doi neuroni'));

    const { unmount } = monteaza();

    await user.click(screen.getByRole('button', { name: 'Editează' }));
    await user.type(screen.getByRole('textbox'), ' — și e unidirecțională');
    await user.click(screen.getByRole('button', { name: 'Gata' }));

    await user.click(screen.getByRole('button', { name: 'Șterge' }));
    expect(screen.queryByText(CAPITOL)).not.toBeInTheDocument();

    unmount();
    monteaza();
    expect(screen.queryByText(CAPITOL)).not.toBeInTheDocument();
    expect(screen.getByText('Nicio notiță încă')).toBeInTheDocument();
  });
  /**
   * Notițele stăteau pe un singur dispozitiv. Cine scria pe telefon și deschidea
   * laptopul nu-și găsea nimic — și nici exportul GDPR nu le cuprindea, deși
   * sunt singurul lucru din aplicație pe care nu-l poate reface nimeni.
   */
  it('arată și notițele scrise pe alt dispozitiv, aduse de pe cont', async () => {
    sesiune.user = { id: 'elev-1' };
    cont.notite = [
      { chapter_id: 'bio-celula', body: 'scrisă pe telefon', updated_at: new Date().toISOString() },
    ];

    monteaza();
    expect(screen.getByText('Nicio notiță încă')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('01. Celula. Țesuturile')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('scrisă pe telefon')).toBeInTheDocument());
  });

  it('ștergerea unei notițe o scoate și de pe cont', async () => {
    const user = userEvent.setup();
    sesiune.user = { id: 'elev-1' };
    cont.notite = [
      { chapter_id: 'bio-celula', body: 'scrisă pe telefon', updated_at: new Date().toISOString() },
    ];

    monteaza();
    await waitFor(() => expect(screen.getByText('01. Celula. Țesuturile')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Șterge' }));

    await waitFor(() => expect(cont.notite).toEqual([]));
    expect(screen.queryByText('01. Celula. Țesuturile')).not.toBeInTheDocument();
  });
});
