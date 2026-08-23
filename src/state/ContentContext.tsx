import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { incarcaColectii, incarcaGrile, incarcaTaxonomie, incarcaTipuri, type GrilaCuStare } from '../lib/continut';
import { TAXONOMIE_GOALA, type Taxonomie } from '../lib/taxonomie';
import { TIPURI_GOALE, type TipuriGrile } from '../lib/tipuriGrile';
import { COLECTII_GOALE, type Colectii } from '../lib/colectii';
import { useAuth } from './authState';
import { ContentContext, type ContentValue } from './contentState';

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
/**
 * Contextul, fără să arunce când lipsește.
 *
 * `useContent()` aruncă intenționat: cine are nevoie de bibliotecă are nevoie și
 * de provider. Dar `PoartaContinut` e doar decor peste stări — încărcare, eroare
 * — iar ecranele își iau banca de la `AppProvider`, prin prop. Montate singure
 * într-un test, n-au provider de conținut și nici nu le trebuie: nu e nimic de
 * încărcat, deci nu e nimic de anunțat.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const { user, loading: sesiuneaSeIncarca } = useAuth();
  const [grile, setGrile] = useState<GrilaCuStare[]>([]);
  const [taxonomie, setTaxonomie] = useState<Taxonomie>(TAXONOMIE_GOALA);
  const [tipuri, setTipuri] = useState<TipuriGrile>(TIPURI_GOALE);
  const [colectii, setColectii] = useState<Colectii>(COLECTII_GOALE);
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

  /**
   * Taxonomia se cere o dată, cu sau fără cont.
   *
   * Spre deosebire de grile, materiile și capitolele publicate se citesc și de
   * `anon`, iar pagina de prezentare le numără fără sesiune. O eroare aici nu
   * oprește nimic: fiecare funcție din `Taxonomie` cade înapoi pe id-ul brut,
   * deci ecranul arată id-uri în loc de titluri — vizibil, nu stricat.
   */
  // Colecțiile sunt vizibile doar cu sesiune: politica lor e dată lui
  // `authenticated`, spre deosebire de taxonomie, pe care o citește și pagina
  // publică. Se cer odată cu biblioteca.
  useEffect(() => {
    if (!user) {
      setColectii(COLECTII_GOALE);
      return;
    }
    let anulat = false;
    void incarcaColectii()
      .then((c) => {
        if (!anulat) setColectii(c);
      })
      .catch((e: unknown) => console.warn('[medbuc] Încărcarea colecțiilor a eșuat.', e));
    return () => {
      anulat = true;
    };
  }, [user]);

  useEffect(() => {
    let anulat = false;
    void incarcaTipuri()
      .then((t) => {
        if (!anulat) setTipuri(t);
      })
      .catch((e: unknown) => console.warn('[medbuc] Încărcarea tipurilor a eșuat.', e));
    return () => {
      anulat = true;
    };
  }, []);

  useEffect(() => {
    let anulat = false;
    void incarcaTaxonomie()
      .then((t) => {
        if (!anulat) setTaxonomie(t);
      })
      .catch((e: unknown) => console.warn('[medbuc] Încărcarea taxonomiei a eșuat.', e));
    return () => {
      anulat = true;
    };
  }, []);

  // Cât timp sesiunea încă se rezolvă, biblioteca e „în curs", nu „goală": altfel
  // ecranele ar apuca să anunțe o bibliotecă fără grile înainte să fi cerut una.
  const loading = sesiuneaSeIncarca || seIncarca;

  const value = useMemo<ContentValue>(
    () => ({
      grile,
      // Motoarele primesc doar publicatele. Filtrarea se face aici, nu în
      // interogare: administratorul are nevoie și de ciorne, în aceeași încărcare.
      questions: grile.filter((g) => g.status === 'publicata'),
      taxonomie,
      tipuri,
      colectii,
      loading,
      error,
      reload: incarca,
    }),
    [grile, taxonomie, tipuri, colectii, loading, error, incarca],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
