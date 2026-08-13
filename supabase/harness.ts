import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fisier = (cale: string) => readFileSync(resolve(process.cwd(), cale), 'utf8');

/**
 * Bucățile pe care le pune Supabase și de care depind migrările noastre:
 * schema `auth` cu tabelul de utilizatori, `auth.uid()`, și rolurile în numele
 * cărora vine o cerere din browser.
 *
 * Le construim aici ca migrările să poată fi rulate pe un Postgres gol. Dacă
 * ceva de mai jos nu seamănă cu Supabase, testele mint — de aceea e puțin și
 * ușor de comparat cu documentația.
 */
const SUPABASE_STUB = `
  create schema if not exists auth;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );

  -- Supabase pune id-ul utilizatorului în cererea curentă; îl citim la fel.
  create or replace function auth.uid() returns uuid
    language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

  do $$ begin
    create role anon nologin noinherit;
  exception when duplicate_object then null; end $$;

  do $$ begin
    create role authenticated nologin noinherit;
  exception when duplicate_object then null; end $$;

  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated;
`;

export interface Baza {
  db: PGlite;
  /** Rulează ca un elev autentificat, cu RLS activ. */
  caUtilizator: <T>(userId: string, fn: () => Promise<T>) => Promise<T>;
  creeazaUtilizator: (email: string) => Promise<string>;
  faAdmin: (userId: string) => Promise<void>;
  inchide: () => Promise<void>;
}

/**
 * Pornește un Postgres gol, aplică migrările în ordine și seed-ul, apoi întoarce
 * o bază pe care se poate interoga în numele unui utilizator anume.
 */
export async function bazaDeTest(options: { cuSeed?: boolean } = {}): Promise<Baza> {
  const db = await PGlite.create();

  await db.exec(SUPABASE_STUB);
  await db.exec(fisier('supabase/migrations/0001_schema.sql'));
  await db.exec(fisier('supabase/migrations/0002_rls.sql'));
  if (options.cuSeed !== false) await db.exec(fisier('supabase/seed.sql'));

  /**
   * Toate interogările din `fn` trec prin rolul `authenticated`, deci prin RLS.
   *
   * `set` la nivel de sesiune, nu `set local`: în afara unei tranzacții, `set
   * local` e ignorat tăcut, rolul rămâne cel de proprietar — care ocolește RLS —
   * și fiecare test de izolare trece degeaba.
   */
  const caUtilizator = async <T>(userId: string, fn: () => Promise<T>): Promise<T> => {
    await db.query('select set_config($1, $2, false)', ['request.jwt.claim.sub', userId]);
    await db.exec('set role authenticated;');
    try {
      return await fn();
    } finally {
      await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
    }
  };

  const creeazaUtilizator = async (email: string): Promise<string> => {
    const r = await db.query<{ id: string }>(
      'insert into auth.users (email) values ($1) returning id',
      [email],
    );
    return r.rows[0]!.id;
  };

  const faAdmin = async (userId: string): Promise<void> => {
    await db.query("update profiles set role = 'admin' where id = $1", [userId]);
  };

  return { db, caUtilizator, creeazaUtilizator, faAdmin, inchide: () => db.close() };
}
