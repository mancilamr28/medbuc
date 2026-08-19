import { useCallback, useEffect, useRef, useState } from 'react';

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

/** Verifică forma unei valori venite din localStorage; ce nu trece e aruncat. */
export type Validator<T> = (value: unknown) => value is T;

function readStored<T>(key: string, fallback: T, isValid?: Validator<T>): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (isValid && !isValid(parsed)) {
      // Valoare dintr-o versiune veche sau stricată de mână: o ștergem, ca
      // reîncărcarea următoare să nu cadă din nou pe aceeași dată.
      console.warn(`[medbuc] Valoare invalidă în localStorage pentru "${key}" — am resetat-o.`);
      localStorage.removeItem(key);
      return fallback;
    }
    return parsed as T;
  } catch {
    if (raw !== null) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* storage indisponibil — nu avem ce curăța */
      }
    }
    return fallback;
  }
}

/** Stare persistată în localStorage, tolerantă la storage indisponibil. */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid?: Validator<T>,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const initialRef = useRef(initial);
  const validRef = useRef(isValid);
  const [state, setState] = useState<{ key: string; value: T }>(() => ({
    key,
    value: readStored(key, initialRef.current, validRef.current),
  }));

  // Cheia poate să se schimbe cât timp componenta e montată (ex. notița pe capitol,
  // `medbuc.note.${cap}`). Recitim sincron: altfel valoarea cheii vechi ar rămâne
  // afișată și prima scriere ar suprascrie ce era salvat sub cheia nouă.
  if (state.key !== key) {
    setState({ key, value: readStored(key, initialRef.current, validRef.current) });
  }

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev.value) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          /* modul privat sau storage plin — rămânem doar cu starea din memorie */
        }
        return { key, value: resolved };
      });
    },
    [key],
  );

  /**
   * Șterge cheia și revine la valoarea inițială.
   *
   * `removeItem` se face aici, direct, nu în updater-ul lui `setState` ca la
   * `set`: dacă apelantul demontează componenta în același handler (cardul de
   * notiță se scoate din listă imediat după ștergere), React aruncă
   * actualizarea în așteptare odată cu ea și un efect ascuns în updater n-ar
   * mai rula niciodată. Golirea prin `set('')` chiar așa pica — notița dispărea
   * de pe ecran, dar rămânea în storage și reapărea la următoarea deschidere.
   */
  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* modul privat sau storage indisponibil — rămânem doar cu starea din memorie */
    }
    setState({ key, value: initialRef.current });
  }, [key]);

  return [state.value, set, remove];
}
