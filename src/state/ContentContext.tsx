import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { chapterById, type ChapterId, type MaterieId } from '../data/chapters';
import type { Question } from '../data/questions';
import { incarcaGrile, type GrilaCuStare } from '../lib/continut';

/**
 * Biblioteca de grile, la runtime.
 *
 * `src/data/questions.ts` a încetat să fie adevărul: e sursa pentru `npm run seed`
 * și fixtura testelor. Aici se încarcă ce e în bază, o dată, iar `reload()` e ce
 * cheamă Admin după o salvare.
 *
 * Se montează între `AuthProvider` și `AppProvider`: are nevoie de sesiune,
 * fiindcă politica de citire pe `questions` e dată lui `authenticated`. Dar
 * `AppProvider` **nu** cheamă `useContent()` — primește banca prin prop, ca să
 * rămână montabil singur, fără provider și fără rețea, exact cum se bazează
 * `AppState.test.tsx`.
 */
interface ContentValue {
  /** Tot ce are voie contul să vadă. La administrator include ciornele. */
  grile: GrilaCuStare[];
  /** Doar publicate — banca pe care o primesc motoarele de quiz. */
  questions: Question[];
  /** Numărate din banca publicată, nu din fișier. */
  chapterCount: (id: ChapterId) => number;
  materieCount: (id: MaterieId) => number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const ContentContext = createContext<ContentValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [grile, setGrile] = useState<GrilaCuStare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const incarca = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGrile(await incarcaGrile());
    } catch (e: unknown) {
      // Mesajul brut de la Supabase e în engleză și tehnic; ecranele au nevoie
      // de ceva ce poate fi citit de un elev, cu un buton de reîncercare lângă.
      setError('Nu am putut încărca biblioteca de grile.');
      console.warn('[medbuc] Încărcarea bibliotecii a eșuat.', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void incarca();
  }, [incarca]);

  const value = useMemo<ContentValue>(() => {
    const questions: Question[] = grile.filter((g) => g.status === 'publicata');

    // Numărătorile se construiesc o dată per încărcare, nu la fiecare apel:
    // `Materii` le cheamă pentru fiecare capitol la fiecare render.
    const peCapitol = new Map<ChapterId, number>();
    for (const q of questions) peCapitol.set(q.capId, (peCapitol.get(q.capId) ?? 0) + 1);

    // Materia se citește din capitol, nu din prefixul id-ului: `Chapter` o poartă
    // explicit tocmai ca să nu depindă nimic de forma șirului.
    const peMaterie = new Map<MaterieId, number>();
    for (const q of questions) {
      const materie = chapterById(q.capId)?.materie;
      if (materie) peMaterie.set(materie, (peMaterie.get(materie) ?? 0) + 1);
    }

    return {
      grile,
      questions,
      chapterCount: (id) => peCapitol.get(id) ?? 0,
      materieCount: (id) => peMaterie.get(id) ?? 0,
      loading,
      error,
      reload: incarca,
    };
  }, [grile, loading, error, incarca]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent trebuie folosit în interiorul <ContentProvider>');
  return ctx;
}
