import type { Session, User } from '@supabase/supabase-js';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { stergeDateleLocale } from '../lib/dateLocale';
import { supabase } from '../lib/supabase';
import { mesajEroare } from './authErrors';
import { AuthContext, type AuthValue, type Profile } from './authState';

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
    .select('id, full_name, role, abonament_pana')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return {
    id: data.id,
    fullName: data.full_name,
    role: data.role,
    abonamentPana: data.abonament_pana,
  };
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
      async changePassword(parolaCurenta, parolaNoua) {
        const email = user?.email;
        if (!email) return { error: 'Nu ești autentificat.' };

        // Supabase schimbă parola oricui are sesiunea deschisă, fără să ceară
        // parola veche. O cerem noi, verificând-o cu o reautentificare pe
        // aceeași adresă — sesiunea rămâne deschisă, doar se reîmprospătează.
        const { error: verificare } = await supabase.auth.signInWithPassword({
          email,
          password: parolaCurenta,
        });
        if (verificare) {
          const mesaj = mesajEroare(verificare);
          return { error: mesaj === 'Email sau parolă greșită.' ? 'Parola actuală nu e corectă.' : mesaj };
        }

        const { error } = await supabase.auth.updateUser({ password: parolaNoua });
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
