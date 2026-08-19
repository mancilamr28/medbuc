import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { NOTE_PREFIX } from '../lib/migrations';
import { AppProvider } from '../state/AppState';
import { Notite } from './Notite';

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
});
