import { useCallback, useMemo, useState, type ReactNode } from 'react';
import type { MaterieId } from '../data/chapters';
import type { Question } from '../data/questions';
import type { GrilaCatalog } from '../lib/continut';
import type { AttemptRow } from '../lib/progres';
import { TAXONOMIE_GOALA, type Taxonomie } from '../lib/taxonomie';
import { TIPURI_GOALE, type TipuriGrile } from '../lib/tipuriGrile';
import { useNow, usePersistentState } from '../lib/hooks';
import { useHashRoute } from '../lib/router';
import { AppContext, type AppValue, type Theme } from './appContextValue';
import { useSession } from './useSession';
import { useCoadaRecapitulare } from './useCoadaRecapitulare';
import { useSimulare } from './useSimulare';

const readInitialTheme = (): Theme => {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') return 'dark';
  return 'light';
};

/**
 * Catalogul vine ca prop, nu din `useContent()`.
 *
 * `AppProvider` nu are voie să depindă de un provider care face rețea: e ce ține
 * `AppState.test.tsx` capabil să-l randeze singur, fără `AuthProvider` și fără
 * `ContentProvider`. Aplicația îi dă doar catalogul sigur; testele vechi pot da
 * încă o bancă-fixtură pentru hook-urile de compatibilitate.
 */
export function AppProvider({
  questions = [],
  catalog = questions.map((q) => ({ id: q.id, capId: q.capId })),
  attempts = [],
  taxonomie = TAXONOMIE_GOALA,
  tipuri = TIPURI_GOALE,
  children,
}: {
  /** Banca completă mai există numai în testele drumului vechi. */
  questions?: Question[];
  /** Indexul sigur folosit în aplicația reală. */
  catalog?: GrilaCatalog[];
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
  const recapitulare = useCoadaRecapitulare(recapNow, catalog, attempts);
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
      catalog,
      taxonomie,
      tipuri,
      session,
      recapitulare,
      sim,
    }),
    [catalog, go, materie, questions, recapitulare, screen, session, sim, taxonomie, theme, tipuri, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
