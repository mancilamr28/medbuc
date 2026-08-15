/**
 * Exportul datelor personale — dreptul GDPR de acces.
 *
 * Butonul „Descarcă datele" exista de la început și nu făcea nimic. Nu e o
 * funcție de lux: e un drept, iar un buton mort în dreptul lui e mai rău decât
 * niciun buton, fiindcă pare că dreptul e deja acoperit.
 *
 * Tot ce se strânge aici trece prin RLS, cu sesiunea celui care apasă — deci
 * exportul nu poate întoarce datele altcuiva nici dacă cineva schimbă id-ul de
 * mai jos. Aceleași politici testate în `supabase/rls.test.ts`.
 */
export interface DateExportate {
  exportatLa: string;
  cont: { id: string; email: string | null };
  profil: unknown;
  sesiuni: unknown[];
  simulari: unknown[];
  raspunsuri: unknown[];
  notite: unknown[];
  /** Ce a rămas doar în browser: tema, setările, lucrarea în curs, notițele nesincronizate. */
  peAcestDispozitiv: Record<string, string>;
}

/** Data ca `2026-08-15`, ca fișierele descărcate să se sorteze singure după nume. */
export const ziua = (acum: Date): string =>
  [
    acum.getFullYear(),
    String(acum.getMonth() + 1).padStart(2, '0'),
    String(acum.getDate()).padStart(2, '0'),
  ].join('-');

/** Numele fișierului descărcat, cu data în față. */
export const numeFisier = (acum: Date): string => `medbuc-datele-mele-${ziua(acum)}.json`;

/**
 * Cheile `medbuc.*` din `localStorage`.
 *
 * Ia depozitul ca parametru, nu îl citește din `window`: așa se poate testa fără
 * DOM, iar în mod privat, unde citirea aruncă, apelantul decide ce face.
 */
export const cheiLocale = (storage: Storage): Record<string, string> => {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const cheie = storage.key(i);
    if (!cheie?.startsWith('medbuc.')) continue;
    const valoare = storage.getItem(cheie);
    if (valoare !== null) out[cheie] = valoare;
  }
  return out;
};

/**
 * Strânge din bază tot ce ține de contul curent.
 *
 * Clientul Supabase se cere aici, nu sus de tot, fiindcă `lib/supabase` aruncă la
 * încărcare când lipsesc variabilele de mediu. Cu importul static, `numeFisier` și
 * `cheiLocale` — funcții pure, fără nicio treabă cu rețeaua — nu se puteau testa
 * fără chei: suita trecea local, unde există `.env.local`, și cădea în CI, unde nu.
 * Același tipar ca la `lib/sentry.ts`, din același motiv.
 */
export async function adunaDatele(userId: string, email: string | null): Promise<DateExportate> {
  const { supabase } = await import('./supabase');

  const [profil, sesiuni, simulari, raspunsuri, notite] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('sessions').select('*'),
    supabase.from('sim_runs').select('*'),
    supabase.from('attempts').select('*'),
    supabase.from('notes').select('*'),
  ]);

  // Clientul Supabase nu respinge promisiunea la erorile raportate de server —
  // întoarce `{ data: null, error }`. Fără verificarea asta, un timeout sau o
  // politică RLS schimbată devenea tăcut o listă goală, iar exportul pleca cu
  // toast de succes și fără datele pe care tocmai le promitea. Un buton care
  // minte că dreptul a fost onorat e mai rău decât unul mort.
  for (const [nume, r] of Object.entries({ profil, sesiuni, simulari, raspunsuri, notite })) {
    if (r.error) throw new Error(`${nume}: ${r.error.message}`);
  }

  let local: Record<string, string> = {};
  try {
    local = cheiLocale(window.localStorage);
  } catch {
    // Mod privat sau depozit blocat: exportul din bază e oricum partea care contează.
  }

  return {
    exportatLa: new Date().toISOString(),
    cont: { id: userId, email },
    profil: profil.data ?? null,
    sesiuni: sesiuni.data ?? [],
    simulari: simulari.data ?? [],
    raspunsuri: raspunsuri.data ?? [],
    notite: notite.data ?? [],
    peAcestDispozitiv: local,
  };
}

/**
 * Pune un text într-un fișier și îl dă browserului spre descărcare.
 *
 * Generic, fiindcă are doi apelanți cu nimic în comun în afară de asta: exportul
 * GDPR de mai sus și exportul bibliotecii de grile din Administrare.
 */
export function descarcaText(continut: string, nume: string): void {
  const blob = new Blob([continut], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nume;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exportul de date personale, ca fișier. */
export function descarca(date: DateExportate, nume: string): void {
  descarcaText(JSON.stringify(date, null, 2), nume);
}
