import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { MATERII, MATERIE_BY_NAME, chapterLabel, type MaterieId } from '../data/chapters';
import type { OptionKey } from '../data/questions';
import { useNow, usePersistentState } from '../lib/hooks';
import { useHashRoute, type Screen } from '../lib/router';
import { useSession, type Session } from './useSession';
import { useSimulare, type Simulare } from './useSimulare';

export type Theme = 'light' | 'dark';
export type Role = 'elev' | 'admin';

export type FilterId = 'neterminate' | 'greseli' | 'bookmark' | 'verificate';
export type SetareId = 'remindere' | 'recap' | 'simulari' | 'email';

export interface AdminDraft {
  materie: string;
  capitol: string;
  tip: 'Complement simplu' | 'Complement grupat' | 'Flashcard';
  dificultate: string;
  sursa: string;
  an: string;
  corect: OptionKey;
  publica: boolean;
}

const DEFAULT_ADMIN_DRAFT: AdminDraft = {
  materie: 'Biologie',
  capitol: '04. Glandele endocrine',
  tip: 'Complement simplu',
  dificultate: 'Medie',
  sursa: 'Redactată intern',
  an: '2027',
  corect: 'C',
  publica: false,
};

interface AppValue {
  theme: Theme;
  toggleTheme: () => void;
  screen: Screen;
  go: (screen: Screen) => void;
  role: Role;
  setRole: (role: Role) => void;
  materie: MaterieId;
  setMaterie: (id: MaterieId) => void;
  filters: Record<FilterId, boolean>;
  toggleFilter: (id: FilterId) => void;
  setari: Record<SetareId, boolean>;
  toggleSetare: (id: SetareId) => void;
  admin: AdminDraft;
  setAdmin: <K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) => void;
  session: Session;
  sim: Simulare;
}

const AppContext = createContext<AppValue | null>(null);

const readInitialTheme = (): Theme => {
  if (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') return 'dark';
  return 'light';
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, go] = useHashRoute();
  const [theme, setTheme] = usePersistentState<Theme>('medbuc.theme', readInitialTheme());
  const [role, setRole] = useState<Role>('admin');
  const [materie, setMaterie] = useState<MaterieId>('bio');
  const [filters, setFilters] = useState<Record<FilterId, boolean>>({
    neterminate: true,
    greseli: false,
    bookmark: false,
    verificate: false,
  });
  const [setari, setSetari] = usePersistentState<Record<SetareId, boolean>>('medbuc.setari', {
    remindere: true,
    recap: true,
    simulari: false,
    email: false,
  });
  const [admin, setAdminState] = useState<AdminDraft>(DEFAULT_ADMIN_DRAFT);

  const session = useSession();
  // Ceasul simulării bate doar cât timp ecranul de simulare este deschis.
  const now = useNow(screen === 'simulari');
  const sim = useSimulare(now);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      return next;
    });
  }, [setTheme]);

  const toggleFilter = useCallback(
    (id: FilterId) => setFilters((prev) => ({ ...prev, [id]: !prev[id] })),
    [],
  );

  const toggleSetare = useCallback(
    (id: SetareId) => setSetari((prev) => ({ ...prev, [id]: !prev[id] })),
    [setSetari],
  );

  /** Schimbarea materiei duce capitolul pe prima poziție din noua listă. */
  const setAdmin = useCallback(<K extends keyof AdminDraft>(key: K, value: AdminDraft[K]) => {
    setAdminState((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'materie') {
        const id = MATERIE_BY_NAME[String(value)] ?? 'bio';
        const first = MATERII[id].list[0];
        if (first) next.capitol = chapterLabel(first);
      }
      return next;
    });
  }, []);

  const value = useMemo<AppValue>(
    () => ({
      theme,
      toggleTheme,
      screen,
      go,
      role,
      setRole,
      materie,
      setMaterie,
      filters,
      toggleFilter,
      setari,
      toggleSetare,
      admin,
      setAdmin,
      session,
      sim,
    }),
    [admin, filters, go, materie, role, screen, session, setAdmin, setari, sim, theme, toggleFilter, toggleSetare, toggleTheme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp trebuie folosit în interiorul <AppProvider>');
  return ctx;
}
