import { useCallback, useEffect, useState } from 'react';

export const SCREENS = [
  'acasa',
  'grile',
  'test-nou',
  'lucrare',
  'recapitulare',
  'simulari',
  'statistici',
  'plan',
  'notite',
  'setari',
  'admin',
] as const;

export type Screen = (typeof SCREENS)[number];

/** Ecranele care au deja o implementare; restul cad pe pagina „în lucru”. */
export const BUILT_SCREENS: Screen[] = [
  'acasa',
  'grile',
  'test-nou',
  'lucrare',
  'recapitulare',
  'simulari',
  'statistici',
  'notite',
  'setari',
  'admin',
];

export const SCREEN_TITLES: Partial<Record<Screen, string>> = {
  recapitulare: 'Repetare inteligentă',
  statistici: 'Statistici și progres',
  // Planul era desenat integral din date fixe — săptămâni pe august–septembrie
  // și „ai rămas în urmă cu 1 zi", deși examenul e în iulie 2027. Până când
  // poate fi generat din ritmul real, e mai onest ca ecran în lucru.
  plan: 'Planul meu de învățare',
  notite: 'Notițele mele',
};

const isScreen = (value: string): value is Screen => (SCREENS as readonly string[]).includes(value);

/** Hash-ul curățat de `#/` și de eventualul query, o singură dată, pentru ambele rutări. */
const rawHash = (): string => window.location.hash.replace(/^#\/?/, '').split('?')[0] ?? '';

/**
 * Segmentele hash-ului, fără prefix și fără query.
 *
 * Erau citite ca un singur nume, ceea ce mergea cât timp fiecare ecran era o
 * frunză. Administrarea are nevoie de un al doilea nivel (`#/admin/colectii`),
 * iar cu citirea veche `admin/colectii` nu era niciun `Screen` și cădea pe
 * `acasa` — adică pe altă pagină decât cea cerută.
 */
const segmente = (): string[] => (rawHash() === '' ? [] : rawHash().split('/').filter(Boolean));

/** Pură, ca să poată fi testată fără DOM. */
export const screenFor = (raw: string): Screen => (isScreen(raw) ? raw : 'acasa');

const readHash = (): Screen => screenFor(segmente()[0] ?? '');

// ---------------------------------------------------------------------------
// Al doilea segment, folosit doar de Administrare.
//
// Nu intră în `SCREENS`. Secțiunile de administrare nu sunt ecrane ale
// aplicației: nu apar în `Sidebar`, nici în `MobileNav`, nici în `BUILT_SCREENS`,
// iar `go()` n-are ce face cu ele. Ținute separat, restul aplicației rămâne
// neschimbat, iar cele patru fișiere care știu despre navigare continuă să
// cunoască un singur nivel.
// ---------------------------------------------------------------------------

export const SECTIUNI_ADMIN = ['grile', 'import', 'acoperire', 'taxonomie', 'colectii'] as const;

export type SectiuneAdmin = (typeof SECTIUNI_ADMIN)[number];

const esteSectiuneAdmin = (v: string): v is SectiuneAdmin =>
  (SECTIUNI_ADMIN as readonly string[]).includes(v);

/** Secțiunea cerută de hash; `grile` pentru orice altceva, inclusiv `#/admin`. */
export const sectiuneAdminPentru = (raw: string): SectiuneAdmin =>
  esteSectiuneAdmin(raw) ? raw : 'grile';

export const goAdmin = (sectiune: SectiuneAdmin): void => {
  window.location.hash = `/admin/${sectiune}`;
  window.scrollTo(0, 0);
};

/** Secțiunea curentă de administrare, urmărind `hashchange` ca și `useHashRoute`. */
export function useSectiuneAdmin(): [SectiuneAdmin, (s: SectiuneAdmin) => void] {
  const [sectiune, setSectiune] = useState<SectiuneAdmin>(() =>
    sectiuneAdminPentru(segmente()[1] ?? ''),
  );

  useEffect(() => {
    const laSchimbare = () => setSectiune(sectiuneAdminPentru(segmente()[1] ?? ''));
    window.addEventListener('hashchange', laSchimbare);
    return () => window.removeEventListener('hashchange', laSchimbare);
  }, []);

  return [sectiune, goAdmin];
}

// ---------------------------------------------------------------------------
// Intenția cu care se deschide asistentul de test.
//
// Drumurile vechi rămân accesibile cât timp mai pot exista sesiuni locale în
// curs, dar orice început nou intră prin același asistent. Felul și, opțional,
// capitolul stau în adresă ca un buton din Acasă să poată păstra alegerea fără
// stare globală ori localStorage (`#/test-nou/exersare/bio-nervos`).
// ---------------------------------------------------------------------------

export const MODURI_TEST_NOU = ['exersare', 'simulare', 'greseli', 'favorite', 'nevazute'] as const;
export type ModTestNou = (typeof MODURI_TEST_NOU)[number];

export interface IntentieTestNou {
  mod: ModTestNou;
  capitol: string | null;
}

const esteModTestNou = (v: string | undefined): v is ModTestNou =>
  v !== undefined && (MODURI_TEST_NOU as readonly string[]).includes(v);

/** Pură: o adresă inventată cade pe exersare, fără să păstreze un filtru străin. */
export const intentieTestNouDin = (
  mod: string | undefined,
  capitol: string | undefined,
): IntentieTestNou =>
  esteModTestNou(mod)
    ? { mod, capitol: capitol && capitol.length > 0 ? capitol : null }
    : { mod: 'exersare', capitol: null };

export const goTestNou = (mod: ModTestNou = 'exersare', capitol?: string): void => {
  window.location.hash = `/test-nou/${mod}${capitol ? `/${capitol}` : ''}`;
  window.scrollTo(0, 0);
};

export function useIntentieTestNou(): IntentieTestNou {
  const citeste = () => intentieTestNouDin(segmente()[1], segmente()[2]);
  const [intentie, setIntentie] = useState<IntentieTestNou>(citeste);

  useEffect(() => {
    const laSchimbare = () => setIntentie(citeste());
    window.addEventListener('hashchange', laSchimbare);
    return () => window.removeEventListener('hashchange', laSchimbare);
  }, []);

  return intentie;
}
// ---------------------------------------------------------------------------
// Al doilea segment, folosit de ecranul unei lucrări.
//
// Id-ul lucrării stă în adresă (`#/lucrare/<uuid>`), nu într-o cheie de
// `localStorage`, fiindcă lucrarea trăiește pe server: adresa e de-ajuns ca să
// o redeschizi de pe alt dispozitiv, iar o a doua sursă de adevăr locală ar
// trebui migrată mai târziu, ca cele trei chei pe care motorul le înlocuiește.
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Id-ul din `#/lucrare/<id>`; `null` pentru orice altceva.
 *
 * Forma se verifică aici, nu la server: un segment inventat de cineva care se
 * joacă în bara de adrese trebuie să dea ecranul „n-am ce deschide", nu un
 * drum la bază cu un `uuid` invalid care iese ca eroare de tip.
 */
export const idLucrareDin = (raw: string | undefined): string | null =>
  raw !== undefined && UUID.test(raw) ? raw : null;

export const goLucrare = (runId: string): void => {
  window.location.hash = `/lucrare/${runId}`;
  window.scrollTo(0, 0);
};

/** Id-ul lucrării din adresă, urmărind `hashchange` ca și `useHashRoute`. */
export function useIdLucrare(): string | null {
  const [id, setId] = useState<string | null>(() => idLucrareDin(segmente()[1]));

  useEffect(() => {
    const laSchimbare = () => setId(idLucrareDin(segmente()[1]));
    window.addEventListener('hashchange', laSchimbare);
    return () => window.removeEventListener('hashchange', laSchimbare);
  }, []);

  return id;
}

/**
 * Rutare pe hash: ecranele au adrese proprii, butonul „înapoi” funcționează și
 * un link către #/materii deschide direct materiile — fără dependințe externe.
 */
export function useHashRoute(): [Screen, (screen: Screen) => void] {
  const [screen, setScreen] = useState<Screen>(readHash);

  useEffect(() => {
    const onHashChange = () => setScreen(readHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = useCallback((next: Screen) => {
    window.location.hash = `/${next}`;
    window.scrollTo(0, 0);
  }, []);

  return [screen, go];
}

// ---------------------------------------------------------------------------
// Rutele vizibile doar fără sesiune.
//
// Nu fac parte din `Screen` intenționat. `Screen` e spațiul de rute al shell-ului
// autentificat — îl consumă `BUILT_SCREENS`, `Content()`, `Sidebar`, `MobileNav`
// și `go()`. Dacă `landing` ar intra acolo, `go('landing')` ar deveni apelabil
// din orice componentă internă, iar cerința „cine e autentificat nu vede pagina
// de prezentare" ar ține de disciplină, nu de tipuri. În plus fallback-urile
// sunt opuse: hash necunoscut → `acasa` acolo, → `landing` aici.
// ---------------------------------------------------------------------------

export const PUBLIC_ROUTES = ['autentificare', 'inregistrare', 'parola-uitata'] as const;

export type PublicRoute = (typeof PUBLIC_ROUTES)[number];

/** Ce poate vedea un vizitator fără sesiune. */
export type PublicView = 'landing' | PublicRoute;

const isPublicRoute = (value: string): value is PublicRoute =>
  (PUBLIC_ROUTES as readonly string[]).includes(value);

/** Spune dacă bara de adrese arată chiar o rută publică, nu un ecran care cere autentificare. */
export const isPublicRouteHash = (): boolean => isPublicRoute(segmente()[0] ?? '');

/**
 * Pură, ca `screenFor`. `raw` e **primul segment** al hash-ului.
 *
 * Un link direct într-o pagină a aplicației cere autentificare, nu prezentare —
 * iar hash-ul rămâne neatins, deci după login `readHash()` regăsește exact
 * ecranul cerut și elevul aterizează acolo, fără logică de redirect.
 */
export const publicViewFor = (raw: string): PublicView => {
  if (isPublicRoute(raw)) return raw;
  if (isScreen(raw)) return 'autentificare';
  return 'landing';
};

/** Perechea publică a lui `useHashRoute`. Nu atinge `Screen`. */
export function usePublicView(): PublicView {
  const [view, setView] = useState<PublicView>(() => publicViewFor(segmente()[0] ?? ''));

  useEffect(() => {
    const onHashChange = () => setView(publicViewFor(segmente()[0] ?? ''));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return view;
}

/**
 * Navigarea între rutele publice. `scrollTo` e obligatoriu, ca la `go()`: un
 * buton din josul unei pagini lungi ar deschide altfel formularul derulat pe
 * la jumătate.
 */
export const goPublic = (route: PublicRoute): void => {
  window.location.hash = `/${route}`;
  window.scrollTo(0, 0);
};
