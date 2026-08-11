import { useCallback, useEffect, useState } from 'react';

/** Urmărește un media query — pentru layout-urile care nu se pot exprima doar în CSS. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Peste acest prag afișăm bara laterală; sub el, navigația de jos. */
export const DESKTOP_QUERY = '(min-width: 960px)';

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}

/**
 * Ceas care se actualizează cât timp componenta e montată — pentru cronometrele
 * din sesiune și din simulare.
 */
export function useNow(active = true, intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);

  return now;
}

/** Stare persistată în localStorage, tolerantă la storage indisponibil. */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* modul privat sau storage plin — rămânem doar cu starea din memorie */
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
