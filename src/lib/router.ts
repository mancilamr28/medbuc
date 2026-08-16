import { useCallback, useEffect, useState } from 'react';

export const SCREENS = [
  'acasa',
  'materii',
  'grile',
  'recapitulare',
  'simulari',
  'statistici',
  'plan',
  'notite',
  'setari',
  'admin',
] as const;

export type Screen = (typeof SCREENS)[number];

/** Ecranele care au deja o implementare; restul cad pe pagina „în lucru”. */
export const BUILT_SCREENS: Screen[] = ['acasa', 'materii', 'grile', 'recapitulare', 'simulari', 'statistici', 'setari', 'admin'];

export const SCREEN_TITLES: Partial<Record<Screen, string>> = {
  recapitulare: 'Repetare inteligentă',
  statistici: 'Statistici și progres',
  // Planul era desenat integral din date fixe — săptămâni pe august–septembrie
  // și „ai rămas în urmă cu 1 zi", deși examenul e în iulie 2027. Până când
  // poate fi generat din ritmul real, e mai onest ca ecran în lucru.
  plan: 'Planul meu de învățare',
  notite: 'Notițele mele',
};

const isScreen = (value: string): value is Screen => (SCREENS as readonly string[]).includes(value);

/** Hash-ul curățat de `#/` și de eventualul query, o singură dată, pentru ambele rutări. */
const rawHash = (): string => window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';

/** Pură, ca să poată fi testată fără DOM. */
export const screenFor = (raw: string): Screen => (isScreen(raw) ? raw : 'acasa');

const readHash = (): Screen => screenFor(rawHash());

/**
 * Rutare pe hash: ecranele au adrese proprii, butonul „înapoi” funcționează și
 * un link către #/materii deschide direct materiile — fără dependințe externe.
 */
export function useHashRoute(): [Screen, (screen: Screen) => void] {
  const [screen, setScreen] = useState<Screen>(readHash);

  useEffect(() => {
    const onHashChange = () => setScreen(readHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = useCallback((next: Screen) => {
    window.location.hash = `/${next}`;
    window.scrollTo(0, 0);
  }, []);

  return [screen, go];
}

// ---------------------------------------------------------------------------
// Rutele vizibile doar fără sesiune.
//
// Nu fac parte din `Screen` intenționat. `Screen` e spațiul de rute al shell-ului
// autentificat — îl consumă `BUILT_SCREENS`, `Content()`, `Sidebar`, `MobileNav`
// și `go()`. Dacă `landing` ar intra acolo, `go('landing')` ar deveni apelabil
// din orice componentă internă, iar cerința „cine e autentificat nu vede pagina
// de prezentare" ar ține de disciplină, nu de tipuri. În plus fallback-urile
// sunt opuse: hash necunoscut → `acasa` acolo, → `landing` aici.
// ---------------------------------------------------------------------------

export const PUBLIC_ROUTES = ['autentificare', 'inregistrare', 'parola-uitata'] as const;

export type PublicRoute = (typeof PUBLIC_ROUTES)[number];

/** Ce poate vedea un vizitator fără sesiune. */
export type PublicView = 'landing' | PublicRoute;

const isPublicRoute = (value: string): value is PublicRoute =>
  (PUBLIC_ROUTES as readonly string[]).includes(value);

/** Spune dacă bara de adrese arată chiar o rută publică, nu un ecran care cere autentificare. */
export const isPublicRouteHash = (): boolean => isPublicRoute(rawHash());

/**
 * Pură, ca `screenFor`. `raw` e hash-ul deja curățat de `#/`.
 *
 * Un link direct într-o pagină a aplicației cere autentificare, nu prezentare —
 * iar hash-ul rămâne neatins, deci după login `readHash()` regăsește exact
 * ecranul cerut și elevul aterizează acolo, fără logică de redirect.
 */
export const publicViewFor = (raw: string): PublicView => {
  if (isPublicRoute(raw)) return raw;
  if (isScreen(raw)) return 'autentificare';
  return 'landing';
};

/** Perechea publică a lui `useHashRoute`. Nu atinge `Screen`. */
export function usePublicView(): PublicView {
  const [view, setView] = useState<PublicView>(() => publicViewFor(rawHash()));

  useEffect(() => {
    const onHashChange = () => setView(publicViewFor(rawHash()));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return view;
}

/**
 * Navigarea între rutele publice. `scrollTo` e obligatoriu, ca la `go()`: un
 * buton din josul unei pagini lungi ar deschide altfel formularul derulat pe
 * la jumătate.
 */
export const goPublic = (route: PublicRoute): void => {
  window.location.hash = `/${route}`;
  window.scrollTo(0, 0);
};
