import type { User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type AppRole = 'elev' | 'admin';

export interface Profile {
  id: string;
  fullName: string | null;
  role: AppRole;
}

interface AuthResult {
  error: string | null;
}

export interface AuthValue {
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  role: AppRole;
  recovery: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult & { confirmareEmail: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (parolaNoua: string) => Promise<AuthResult>;
  /**
   * Schimbarea parolei din cont, cu parola actuală cerută înainte.
   *
   * Separată de `updatePassword`, care servește resetarea prin email: acolo
   * dovada e linkul primit în inbox, aici e parola veche. Fără ea, oricine
   * prinde un laptop descuiat poate lua contul cu totul.
   */
  changePassword: (parolaCurenta: string, parolaNoua: string) => Promise<AuthResult>;
  updateNume: (numeComplet: string) => Promise<AuthResult>;
  updateEmail: (email: string) => Promise<AuthResult>;
  stergeContul: () => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth trebuie folosit în interiorul <AuthProvider>');
  return ctx;
}

/**
 * Ca `useAuth`, dar `null` în afara providerului.
 *
 * Perechea lui `useProgressOptional`, din același motiv: notițele se salvează pe
 * cont, deci hook-ul lor trebuie să știe cine e conectat — dar `AppProvider` nu
 * depinde de autentificare, iar testele care montează un ecran singur n-au
 * `<AuthProvider>` deasupra. Fără sesiune, notița rămâne doar pe dispozitiv.
 */
export function useAuthOptional(): AuthValue | null {
  return useContext(AuthContext);
}
