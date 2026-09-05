import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { MaterieId } from '../data/chapters';
import type { GrilaCatalog } from '../lib/continut';
import type { AttemptRow } from '../lib/progres';
import { TAXONOMIE_GOALA, type Taxonomie } from '../lib/taxonomie';
import { TIPURI_GOALE, type TipuriGrile } from '../lib/tipuriGrile';
import { COLECTII_GOALE, type Colectii } from '../lib/colectii';
import { useNow, usePersistentState } from '../lib/hooks';
import { useHashRoute } from '../lib/router';
import { AppContext, type AppValue, type Theme } from './appContextValue';
import { useCoadaRecapitulare } from './useCoadaRecapitulare';
import { useSimulareVeche } from './useSimulareVeche';

const readInitialTheme = (): Theme => {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') return 'dark';
  return 'light';
};

/**
 * Catalogul vine ca prop, nu din `useContent()`.
 *
 * `AppProvider` nu are voie să depindă de un provider care face rețea: e ce ține
 * `AppState.test.tsx` capabil să-l randeze singur, fără `AuthProvider` și fără
 * `ContentProvider`. Aplicația și testele îi dau doar catalogul sigur.
 */
export function AppProvider({
  catalog = [],
  attempts = [],
  taxonomie = TAXONOMIE_GOALA,
  tipuri = TIPURI_GOALE,
  colectii = COLECTII_GOALE,
  children,
}: {
  /** Indexul sigur folosit în aplicația reală. */
  catalog?: GrilaCatalog[];
  attempts?: readonly AttemptRow[];
  taxonomie?: Taxonomie;
  tipuri?: TipuriGrile;
  colectii?: Colectii;
  children: ReactNode;
}) {
  const [screen, go] = useHashRoute();
  const [theme, setTheme] = usePersistentState<Theme>('medbuc.theme', readInitialTheme());
  const [materie, setMaterie] = useState<MaterieId>('bio');

  // Recalculează scadențele rar și numai cât timp ecranul lor este deschis.
  const recapNow = useNow(screen === 'recapitulare' || screen === 'acasa', 60_000);
  const recapitulare = useCoadaRecapitulare(recapNow, catalog, attempts);
  const simulareVeche = useSimulareVeche();

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      return next;
    });
  }, [setTheme]);



  const value = useMemo<AppValue>(
    () => ({
      theme,
      toggleTheme,
      screen,
      go,
      materie,
      setMaterie,
      catalog,
      taxonomie,
      tipuri,
      colectii,
      recapitulare,
      simulareVeche,
    }),
    [catalog, colectii, go, materie, recapitulare, screen, simulareVeche, taxonomie, theme, tipuri, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
