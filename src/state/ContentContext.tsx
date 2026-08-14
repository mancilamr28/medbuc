import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Question } from '../data/questions';
import { incarcaGrile, type GrilaCuStare } from '../lib/continut';
import { useAuth } from './AuthContext';

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
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const ContentContext = createContext<ContentValue | null>(null);

/**
 * Contextul, fără să arunce când lipsește.
 *
 * `useContent()` aruncă intenționat: cine are nevoie de bibliotecă are nevoie și
 * de provider. Dar `PoartaContinut` e doar decor peste stări — încărcare, eroare
 * — iar ecranele își iau banca de la `AppProvider`, prin prop. Montate singure
 * într-un test, n-au provider de conținut și nici nu le trebuie: nu e nimic de
 * încărcat, deci nu e nimic de anunțat.
 */
export function useContentOptional(): ContentValue | null {
  return useContext(ContentContext);
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const { user, loading: sesiuneaSeIncarca } = useAuth();
  const [grile, setGrile] = useState<GrilaCuStare[]>([]);
  const [seIncarca, setSeIncarca] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incarca = useCallback(async () => {
    setSeIncarca(true);
    setError(null);
    try {
      setGrile(await incarcaGrile());
    } catch (e: unknown) {
      // Mesajul brut de la Supabase e în engleză și tehnic; ecranele au nevoie
      // de ceva ce poate fi citit de un elev, cu un buton de reîncercare lângă.
      setError('Nu am putut încărca biblioteca de grile.');
      console.warn('[medbuc] Încărcarea bibliotecii a eșuat.', e);
    } finally {
      setSeIncarca(false);
    }
  }, []);

  /**
   * Se cere abia când există sesiune.
   *
   * Provider-ul stă deasupra întregii aplicații, inclusiv a paginii publice de
   * prezentare, care se randează fără cont. Fără condiția asta pleca o cerere la
   * fiecare vizitator anonim — respinsă oricum de `questions_citire`, care e dată
   * lui `authenticated` — și lăsa în urmă o eroare în consolă pe o pagină care
   * n-are nevoie de nicio grilă.
   */
  useEffect(() => {
    if (!user) {
      setGrile([]);
      return;
    }
    void incarca();
  }, [incarca, user]);

  // Cât timp sesiunea încă se rezolvă, biblioteca e „în curs", nu „goală": altfel
  // ecranele ar apuca să anunțe o bibliotecă fără grile înainte să fi cerut una.
  const loading = sesiuneaSeIncarca || seIncarca;

  const value = useMemo<ContentValue>(
    () => ({
      grile,
      // Motoarele primesc doar publicatele. Filtrarea se face aici, nu în
      // interogare: administratorul are nevoie și de ciorne, în aceeași încărcare.
      questions: grile.filter((g) => g.status === 'publicata'),
      loading,
      error,
      reload: incarca,
    }),
    [grile, loading, error, incarca],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentValue {
  const ctx = useContext(ContentContext);
  if (!ctx) throw new Error('useContent trebuie folosit în interiorul <ContentProvider>');
  return ctx;
}
