import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { incarcaCatalogGrile, incarcaColectii, incarcaTaxonomie, incarcaTipuri, type GrilaCatalog } from '../lib/continut';
import { TAXONOMIE_GOALA, type Taxonomie } from '../lib/taxonomie';
import { TIPURI_GOALE, type TipuriGrile } from '../lib/tipuriGrile';
import { COLECTII_GOALE, type Colectii } from '../lib/colectii';
import { useAuth } from './authState';
import { ContentContext, type ContentValue } from './contentState';

/**
 * Catalogul sigur al grilelor, la runtime.
 *
 * `src/data/questions.ts` a încetat să fie adevărul: e sursa pentru `npm run seed`
 * și fixtura testelor. Aici se încarcă numai id-ul și capitolul, o dată, iar
 * `reload()` e ce cheamă Admin după o salvare. Enunțurile și răspunsurile nu
 * circulă global; vin prin lucrarea generată sau prin RPC-urile de administrator.
 *
 * Se montează între `AuthProvider` și `AppProvider`: are nevoie de sesiune,
 * fiindcă politica de citire pe `questions` e dată lui `authenticated`. Dar
 * `AppProvider` **nu** cheamă `useContent()` — primește catalogul prin prop, ca să
 * rămână montabil singur, fără provider și fără rețea, exact cum se bazează
 * `AppState.test.tsx`.
 */
/**
 * Contextul, fără să arunce când lipsește.
 *
 * `useContent()` aruncă intenționat: cine are nevoie de catalog are nevoie și
 * de provider. Dar `PoartaContinut` e doar decor peste stări — încărcare, eroare
 * — iar ecranele își iau catalogul de la `AppProvider`, prin prop. Montate singure
 * într-un test, n-au provider de conținut și nici nu le trebuie: nu e nimic de
 * încărcat, deci nu e nimic de anunțat.
 */
export function ContentProvider({ children }: { children: ReactNode }) {
  const { user, loading: sesiuneaSeIncarca } = useAuth();
  const [catalog, setCatalog] = useState<GrilaCatalog[]>([]);
  const [taxonomie, setTaxonomie] = useState<Taxonomie>(TAXONOMIE_GOALA);
  const [tipuri, setTipuri] = useState<TipuriGrile>(TIPURI_GOALE);
  const [colectii, setColectii] = useState<Colectii>(COLECTII_GOALE);
  const [seIncarca, setSeIncarca] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const incarca = useCallback(async () => {
    setSeIncarca(true);
    setError(null);
    try {
      setCatalog(await incarcaCatalogGrile());
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
      setCatalog([]);
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
  /**
   * Structura: taxonomia (publică) și colecțiile (doar cu sesiune).
   *
   * Într-o singură funcție fiindcă ecranele de administrare le schimbă împreună
   * și au nevoie să le reciteasca împreună. O eroare nu oprește nimic: fiecare
   * căutare cade înapoi pe id-ul brut, deci ecranul arată id-uri în loc de
   * titluri — vizibil, nu stricat.
   */
  const incarcaStructura = useCallback(async () => {
    const [t, c] = await Promise.all([
      incarcaTaxonomie().catch((e: unknown) => {
        console.warn('[medbuc] Încărcarea taxonomiei a eșuat.', e);
        return null;
      }),
      user
        ? incarcaColectii().catch((e: unknown) => {
            console.warn('[medbuc] Încărcarea colecțiilor a eșuat.', e);
            return null;
          })
        : Promise.resolve(COLECTII_GOALE),
    ]);
    if (t) setTaxonomie(t);
    if (c) setColectii(c);
  }, [user]);

  useEffect(() => {
    void incarcaStructura();
  }, [incarcaStructura]);

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
  }, [user]);

  // Cât timp sesiunea încă se rezolvă, biblioteca e „în curs", nu „goală": altfel
  // ecranele ar apuca să anunțe o bibliotecă fără grile înainte să fi cerut una.
  const loading = sesiuneaSeIncarca || seIncarca;

  const value = useMemo<ContentValue>(
    () => ({
      catalog,
      taxonomie,
      tipuri,
      colectii,
      loading,
      error,
      reload: incarca,
      reloadStructura: incarcaStructura,
    }),
    [catalog, taxonomie, tipuri, colectii, loading, error, incarca, incarcaStructura],
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
