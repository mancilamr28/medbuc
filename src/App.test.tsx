import { render, screen, waitFor } from '@testing-library/react';
import { QUESTIONS } from './data/questions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AppProvider } from './state/AppState';
import { AuthProvider } from './state/AuthContext';
import { ToastProvider } from './state/ToastContext';

/**
 * Poarta de acces a aplicației.
 *
 * Până acum n-o fixa niciun test, deși e locul cu cele mai neplăcute moduri de
 * eșec: un vizitator care vede formularul de login în loc de pagina de
 * prezentare, un elev autentificat aruncat înapoi pe marketing, sau un link de
 * resetare a parolei care aterizează oriunde altundeva decât pe formularul de
 * parolă nouă.
 *
 * Se mimează `lib/supabase` (aruncă la import fără variabile de mediu), nu
 * `useAuth` — așa trece prin `AuthProvider`-ul adevărat.
 */
let sesiune: { user: { id: string; email: string } } | null = null;
let asculta: ((eveniment: string, sesiune: unknown) => void) | null = null;


vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: sesiune } }),
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => {
        asculta = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { id: 'u1', full_name: 'Ana Ionescu', role: 'elev' }, error: null }),
        }),
      }),
    }),
  },
}));

/**
 * Pagina de prezentare e înlocuită cu un marcaj: aici contează *care* ecran
 * apare, nu cum arată el, iar modulul real ar aduce cu sine tot fișierul de
 * stiluri fără niciun câștig pentru test.
 *
 * Că nu ajunge în bundle-ul principal se verifică pe fișiere, în
 * `screens/Landing/Landing.test.ts`: aici n-ar fi de încredere, pentru că atât
 * un import static cât și preîncărcarea din `App.tsx` se consumă la încărcarea
 * modulului, înaintea oricărui test.
 */
vi.mock('./screens/Landing/Landing', () => ({
  Landing: () => <div>PAGINA DE PREZENTARE</div>,
}));

function monteaza() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <AppProvider questions={QUESTIONS}>
          <App />
        </AppProvider>
      </AuthProvider>
    </ToastProvider>,
  );
}

beforeEach(() => {
  sesiune = null;
  asculta = null;
  vi.clearAllMocks();
  window.location.hash = '';
});

afterEach(() => {
  window.location.hash = '';
});

describe('poarta de acces', () => {
  it('arată pagina de prezentare unui vizitator fără sesiune', async () => {
    monteaza();
    expect(await screen.findByText('PAGINA DE PREZENTARE')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bine ai revenit' })).not.toBeInTheDocument();
  });

  /** Cazul invers: cine are sesiune primește aplicația, nu pagina de prezentare. */
  it('arată aplicația unui utilizator autentificat', async () => {
    sesiune = { user: { id: 'u1', email: 'ana@exemplu.ro' } };
    monteaza();

    expect(await screen.findByRole('heading', { name: /Bună/ })).toBeInTheDocument();
    expect(screen.queryByText('PAGINA DE PREZENTARE')).not.toBeInTheDocument();
  });

  /**
   * Link-ul de resetare a parolei bate tot. Fără asta, cine dă clic pe el ar
   * ajunge pe pagina de prezentare cu o sesiune temporară în buzunar și fără
   * nicio cale de a-și schimba parola.
   */
  it('cere parola nouă când sesiunea vine dintr-un link de resetare', async () => {
    sesiune = { user: { id: 'u1', email: 'ana@exemplu.ro' } };
    monteaza();
    await screen.findByRole('heading', { name: /Bună/ });

    asculta?.('PASSWORD_RECOVERY', sesiune);

    await waitFor(() => expect(screen.getByRole('heading', { name: /parolă nouă/i })).toBeInTheDocument());
    expect(screen.queryByText('PAGINA DE PREZENTARE')).not.toBeInTheDocument();
  });

  /**
   * Un link direct într-o pagină a aplicației duce la autentificare, **iar
   * hash-ul rămâne neatins** — asta e partea care contează: după login,
   * `useHashRoute` regăsește exact ecranul cerut, fără logică de redirect.
   */
  it('duce un link direct spre autentificare și păstrează adresa cerută', async () => {
    window.location.hash = '#/grile';
    monteaza();

    expect(await screen.findByRole('heading', { name: 'Bine ai revenit' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/grile');
  });

  it('păstrează adresa unui ecran intern după autentificare', async () => {
    sesiune = { user: { id: 'u1', email: 'ana@exemplu.ro' } };
    window.location.hash = '#/recapitulare';
    monteaza();

    expect(await screen.findByRole('heading', { name: 'Recapitulare' })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe('#/recapitulare'));
  });

  /** „Creează cont" trebuie să deschidă înregistrarea, nu autentificarea. */
  it('deschide formularul de înregistrare pe ruta lui', async () => {
    window.location.hash = '#/inregistrare';
    monteaza();

    expect(await screen.findByRole('heading', { name: 'Creează-ți contul' })).toBeInTheDocument();
  });
});
