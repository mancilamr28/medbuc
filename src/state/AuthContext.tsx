import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

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
}

const AuthContext = createContext<AuthValue | null>(null);

/** Traduce mesajele de eroare ale Supabase — vin în engleză, interfața e în română. */
function mesajEroare(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('Invalid login credentials')) return 'Email sau parolă greșită.';
  if (raw.includes('User already registered')) return 'Există deja un cont cu acest email.';
  if (raw.includes('Email not confirmed')) return 'Confirmă mai întâi adresa de email — verifică inboxul.';
  if (raw.includes('Password should be at least')) return 'Parola trebuie să aibă cel puțin 6 caractere.';
  if (raw.toLowerCase().includes('invalid') && raw.toLowerCase().includes('email')) return 'Adresa de email nu e validă.';
  if (raw.includes('rate limit') || raw.includes('security purposes')) {
    return 'Prea multe încercări la rând — mai așteaptă puțin.';
  }
  return 'A apărut o eroare. Încearcă din nou.';
}

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
