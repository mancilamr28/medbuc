import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { MaterieId } from '../data/chapters';
import type { Question } from '../data/questions';
import { useNow, usePersistentState } from '../lib/hooks';
import { useHashRoute, type Screen } from '../lib/router';
import { useSession, type Session } from './useSession';
import { useSimulare, type Simulare } from './useSimulare';

export type Theme = 'light' | 'dark';



interface AppValue {
  theme: Theme;
  toggleTheme: () => void;
  screen: Screen;
  go: (screen: Screen) => void;
  materie: MaterieId;
  setMaterie: (id: MaterieId) => void;
  /**
   * Biblioteca întreagă. `session.banca` e doar bucata din care se rezolvă
   * acum, deci orice ecran care numără grile pe capitol are nevoie de asta:
   * altfel o sesiune pe un capitol face restul bibliotecii să pară goală.
   */
  questions: Question[];
  session: Session;
  sim: Simulare;
}

const AppContext = createContext<AppValue | null>(null);

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
export function AppProvider({ questions, children }: { questions: Question[]; children: ReactNode }) {
  const [screen, go] = useHashRoute();
  const [theme, setTheme] = usePersistentState<Theme>('medbuc.theme', readInitialTheme());
  const [materie, setMaterie] = useState<MaterieId>('bio');

  const session = useSession(questions);
  // Ceasul simulării bate doar cât timp ecranul de simulare este deschis.
  const now = useNow(screen === 'simulari');
  const sim = useSimulare(now, questions);

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
      session,
      sim,
    }),
    [go, materie, questions, screen, session, sim, theme, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp trebuie folosit în interiorul <AppProvider>');
  return ctx;
}
