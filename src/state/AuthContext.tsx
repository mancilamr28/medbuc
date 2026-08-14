import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { stergeDateleLocale } from '../lib/dateLocale';
import { supabase } from '../lib/supabase';
import { mesajEroare } from './authErrors';

export type AppRole = 'elev' | 'admin';

export interface Profile {
  id: string;
  fullName: string | null;
  role: AppRole;
}

interface AuthResult {
  error: string | null;
}

interface AuthValue {
  /** Cât timp sesiunea inițială și profilul se încarcă — nimic altceva nu se poate decide. */
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  /** Fără cont, elev e implicit — rolul real vine mereu din `profiles`, nu din client. */
  role: AppRole;
  /** Sesiunea vine dintr-un link de resetare a parolei: aplicația cere o parolă nouă înainte de orice altceva. */
  recovery: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult & { confirmareEmail: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (parolaNoua: string) => Promise<AuthResult>;
  updateNume: (numeComplet: string) => Promise<AuthResult>;
  /** Adresa nouă primește un email de confirmare; până la clic, cea veche rămâne. */
  updateEmail: (email: string) => Promise<AuthResult>;
  /** Dreptul GDPR de eliminare. Șterge contul și tot ce atârnă de el, apoi deconectează. */
  stergeContul: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Deconectarea pleacă mereu dintr-un ecran al aplicației, deci hash-ul rămâne
 * pe el — `#/setari`. Fără resetare, `publicViewFor('setari')` cere
 * autentificare și ieșirea din cont aterizează pe formularul de login în loc de
 * pagina de prezentare. Se schimbă înaintea deconectării, cât încă nu s-a
 * randat nimic public.
 */
const laPaginaPublica = (): void => {
  window.location.hash = '/';
};

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return { id: data.id, fullName: data.full_name, role: data.role };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    let ignorat = false;

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (ignorat) return;
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).then((p) => !ignorat && setProfile(p));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (ignorat) return;
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then((p) => !ignorat && setProfile(p));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      ignorat = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      user,
      profile,
      role: profile?.role ?? 'elev',
      recovery,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? mesajEroare(error) : null };
      },
      async signUp(email, password, fullName) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) return { error: mesajEroare(error), confirmareEmail: false };
        return { error: null, confirmareEmail: data.session === null };
      },
      async signOut() {
        laPaginaPublica();
        await supabase.auth.signOut();
      },
      async requestPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + import.meta.env.BASE_URL,
        });
        return { error: error ? mesajEroare(error) : null };
      },
      async updatePassword(parolaNoua) {
        const { error } = await supabase.auth.updateUser({ password: parolaNoua });
        if (!error) setRecovery(false);
        return { error: error ? mesajEroare(error) : null };
      },
      async updateNume(numeComplet) {
        if (!user) return { error: 'Nu ești autentificat.' };
        const nume = numeComplet.trim();
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: nume || null })
          .eq('id', user.id);
        if (error) return { error: mesajEroare(error) };
        // Profilul local se actualizează din răspunsul reușit, nu se recitește:
        // politica de `update` nu vine cu una de `returning`, iar o a doua cerere
        // ar face ecranul să pâlpâie cu valoarea veche.
        setProfile((p) => (p ? { ...p, fullName: nume || null } : p));
        return { error: null };
      },
      async updateEmail(email) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        return { error: error ? mesajEroare(error) : null };
      },
      async stergeContul() {
        const { error } = await supabase.rpc('sterge_contul');
        if (error) return { error: mesajEroare(error) };
        // Cheile `medbuc.*` sunt indexate pe conținut, nu pe utilizator: notița
        // de capitol și lucrarea în curs ar rămâne pe dispozitiv după ce contul
        // a dispărut din bază, iar următorul cont făcut pe același browser le-ar
        // citi ca pe ale lui. Ecranul promite „cu tot cu răspunsuri, simulări și
        // notițe" — asta e partea locală a promisiunii.
        stergeDateleLocale();
        // Sesiunea rămâne validă în memorie după ce contul a dispărut din bază;
        // fără deconectare explicită, aplicația ar continua să arate un profil
        // care nu mai există.
        laPaginaPublica();
        await supabase.auth.signOut();
        return { error: null };
      },
    }),
    [loading, user, profile, recovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth trebuie folosit în interiorul <AuthProvider>');
  return ctx;
}
