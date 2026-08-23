/**
 * Un `lib/supabase` inofensiv, pentru testele care nu-l folosesc.
 *
 * `lib/supabase` aruncă la încărcare când lipsesc variabilele de mediu — voit,
 * ca o configurare greșită să nu ajungă în producție tăcut. Efectul secundar e
 * că orice test care îl atinge **prin import tranzitiv** cade în CI, unde nu
 * există `.env.local`: `Grile` → `PoartaContinut` → `ContentContext` →
 * `AuthContext` → aici. Ecranul nu cere nimic de la Supabase, dar lanțul de
 * importuri se evaluează oricum.
 *
 * De folosit ca `vi.mock('../lib/supabase', () => import('../test/supabaseFals'))`
 * în testele care au nevoie doar ca modulul să existe. Cele care verifică chiar
 * legătura — `Setari`, `Admin`, `PoartaContinut` — își scriu propriul dublu, cu
 * răspunsurile care le interesează.
 */
const faraSesiune = async () => ({ data: { session: null } });

export const supabase = {
  auth: {
    getSession: faraSesiune,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: null }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({ data: null, error: null }),
      }),
      order: () => ({
        range: async () => ({ data: [], error: null, count: 0 }),
      }),
    }),
  }),
  rpc: async () => ({ error: null }),
};
