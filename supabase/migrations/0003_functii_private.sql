-- Întărirea funcțiilor, după linterul de securitate al Supabase.
--
-- Trei dintre cele patru semnalări sunt aceeași problemă: funcțiile stăteau în
-- `public`, iar `public` e exact schema pe care PostgREST o publică. Orice
-- funcție de acolo e apelabilă direct din browser, cu cheia publicabilă, la
-- `/rest/v1/rpc/<nume>` — inclusiv cele trei `security definer`, care rulează cu
-- drepturile proprietarului, nu ale celui care sună.
--
-- `is_admin()` avea deja `revoke execute ... from anon` în 0002, dar nu ajuta cu
-- nimic: dreptul nu venea de la rolul `anon`, ci de la `public`, pseudo-rolul din
-- care moștenesc toate rolurile. Revocarea de la `anon` lăsa moștenirea intactă
-- și funcția a rămas apelabilă — linterul a arătat-o negru pe alb. De reținut ca
-- tipar: un `revoke` de la un rol anume nu înseamnă nimic cât timp `public` mai
-- are dreptul.
--
-- Soluția e mutarea tuturor celor patru funcții într-o schemă `private`, pe care
-- PostgREST nu o publică, plus `execute` acordat doar acolo unde chiar e nevoie.
-- Politicile și declanșatoarele urmează funcția fără să fie rescrise: Postgres
-- le ține legate prin OID, nu prin nume.
--
-- A patra semnalare — `function_search_path_mutable` pe `touch_updated_at` — e
-- singura funcție căreia îi lipsea un `search_path` fix. Fără el, cine poate
-- crea obiecte într-o schemă din calea de căutare poate pune în fața unei
-- funcții de sistem una a lui, iar corpul `security definer` o va executa cu
-- drepturi de proprietar. Toate patru primesc mai jos `search_path = ''`, adică
-- nimic în afară de `pg_catalog`; corpurile lor califică deja fiecare referință
-- cu schema, deci nu au nevoie de altceva.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Mutarea. `set schema` păstrează OID-ul, deci cele nouă politici care cheamă
-- `is_admin()` și cele cinci declanșatoare rămân legate de aceleași funcții.
alter function public.is_admin()         set schema private;
alter function public.handle_new_user()  set schema private;
alter function public.protect_role()     set schema private;
alter function public.touch_updated_at() set schema private;

alter function private.is_admin()         set search_path = '';
alter function private.handle_new_user()  set search_path = '';
alter function private.touch_updated_at() set search_path = '';

-- Singura funcție al cărei corp chema o alta pe nume: `public.is_admin()` nu mai
-- există după mutare, deci trebuie rescris. `create or replace` păstrează OID-ul,
-- așa că declanșatorul `profiles_protect_role` rămâne legat de ea.
create or replace function private.protect_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not private.is_admin() then
    raise exception 'Rolul poate fi schimbat doar de un administrator';
  end if;
  return new;
end;
$$;

-- Drepturile, acum explicite. `create function` acordă implicit `execute` lui
-- `public`, iar mutarea într-o altă schemă păstrează acordarea — de aceea se
-- revocă aici, nu se presupune.
revoke all on function private.is_admin()         from public, anon, authenticated;
revoke all on function private.handle_new_user()  from public, anon, authenticated;
revoke all on function private.protect_role()     from public, anon, authenticated;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

-- Funcțiile de declanșator nu au nevoie de nicio acordare: dreptul de execuție e
-- verificat la `create trigger`, nu la fiecare declanșare. Rămân fără `execute`
-- pentru oricine.
--
-- `is_admin()` e altceva: e chemată din expresiile politicilor, care se evaluează
-- în numele celui care interoghează, deci rolul `authenticated` chiar are nevoie
-- de drept. Acordarea de mai jos e portanta — testul de administrator din
-- `rls.test.ts` cade fără ea.
grant execute on function private.is_admin() to authenticated;
