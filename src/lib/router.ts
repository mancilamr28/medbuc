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
export const BUILT_SCREENS: Screen[] = ['acasa', 'materii', 'grile', 'plan', 'simulari', 'setari', 'admin'];

export const SCREEN_TITLES: Partial<Record<Screen, string>> = {
  recapitulare: 'Repetare inteligentă',
  statistici: 'Statistici și progres',
  notite: 'Notițele mele',
};

const isScreen = (value: string): value is Screen => (SCREENS as readonly string[]).includes(value);

const readHash = (): Screen => {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return isScreen(raw) ? raw : 'acasa';
};

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
