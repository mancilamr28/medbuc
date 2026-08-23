import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { MaterieId } from '../data/chapters';
import type { Question } from '../data/questions';
import type { AttemptRow } from '../lib/progres';
import { TAXONOMIE_GOALA, type Taxonomie } from '../lib/taxonomie';
import { TIPURI_GOALE, type TipuriGrile } from '../lib/tipuriGrile';
import { useNow, usePersistentState } from '../lib/hooks';
import { useHashRoute } from '../lib/router';
import { AppContext, type AppValue, type Theme } from './appContextValue';
import { useSession } from './useSession';
import { useRecapitulare } from './useRecapitulare';
import { useSimulare } from './useSimulare';

const readInitialTheme = (): Theme => {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') return 'dark';
  return 'light';
};

/**
 * Banca vine ca prop, nu din `useContent()`.
 *
 * `AppProvider` nu are voie să depindă de un provider care face rețea: e ce ține
 * `AppState.test.tsx` capabil să-l randeze singur, fără `AuthProvider` și fără
 * `ContentProvider`. Cine îl montează în aplicație îi dă banca încărcată; cine îl
 * montează într-un test îi dă o fixtură.
 */
export function AppProvider({
  questions,
  attempts = [],
  taxonomie = TAXONOMIE_GOALA,
  tipuri = TIPURI_GOALE,
  children,
}: {
  questions: Question[];
  attempts?: readonly AttemptRow[];
  taxonomie?: Taxonomie;
  tipuri?: TipuriGrile;
  children: ReactNode;
}) {
  const [screen, go] = useHashRoute();
  const [theme, setTheme] = usePersistentState<Theme>('medbuc.theme', readInitialTheme());
  const [materie, setMaterie] = useState<MaterieId>('bio');

  const session = useSession(questions);
  // Recalculează scadențele rar și numai cât timp ecranul lor este deschis.
  const recapNow = useNow(screen === 'recapitulare' || screen === 'acasa', 60_000);
  const recapitulare = useRecapitulare(recapNow, questions, attempts);
  // Ceasul simulării bate doar cât timp ecranul de simulare este deschis.
  const now = useNow(screen === 'simulari');
  const sim = useSimulare(now, questions, taxonomie);

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
      questions,
      taxonomie,
      tipuri,
      session,
      recapitulare,
      sim,
    }),
    [go, materie, questions, recapitulare, screen, session, sim, taxonomie, theme, tipuri, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
