import { createClient } from '@supabase/supabase-js';

/**
 * Clientul Supabase, o singură instanță pentru toată aplicația.
 *
 * `VITE_SUPABASE_URL` și `VITE_SUPABASE_PUBLISHABLE_KEY` sunt obligatorii de la
 * Faza 3 încolo — spre deosebire de DSN-ul de Sentry, nu există o cale
 * funcțională fără ele. Cheia publishable e publică prin design (același
 * model ca vechea cheie `anon`): protecția reală vine din RLS
 * (`supabase/migrations/0002_rls.sql`), nu din secretizarea cheii.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'Lipsesc VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — vezi .env.example.',
  );
}

export const supabase = createClient(url, publishableKey);
