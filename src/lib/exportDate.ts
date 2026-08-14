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

/** Numele fișierului descărcat, cu data în față ca să se sorteze singur. */
export const numeFisier = (acum: Date): string => {
  const zi = [
    acum.getFullYear(),
    String(acum.getMonth() + 1).padStart(2, '0'),
    String(acum.getDate()).padStart(2, '0'),
  ].join('-');
  return `medbuc-datele-mele-${zi}.json`;
};

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

/** Pune conținutul într-un fișier și îl dă browserului spre descărcare. */
export function descarca(date: DateExportate, nume: string): void {
  const blob = new Blob([JSON.stringify(date, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nume;
  a.click();
  URL.revokeObjectURL(url);
}
