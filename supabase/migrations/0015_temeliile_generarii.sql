-- Ce are nevoie motorul de generare înainte să existe motorul.
--
-- Migrarea e în întregime aditivă: nicio politică nu se strânge, nicio coloană
-- nu-și schimbă înțelesul, iar clientul din producție nu cere nimic de aici. Se
-- poate aplica singură, fără să însoțească o versiune de client.
--
-- Trei lucruri, toate cerute de interogarea de candidați care vine:
--
-- 1. **Materia, denormalizată pe grilă.** Selecția pe cote („60 de biologie, 40
--    de chimie") partiționează după materie, iar numărătoarea per materie se
--    cere la fiecare pas al asistentului. Cu materia doar în `chapters`, ambele
--    trec printr-un join și niciun index nu le poate acoperi. Coloana e
--    **derivată, nu introdusă** — două declanșatoare o țin lipită de
--    `chapter_id`, deci nu poate diverge, iar `schema.test.ts` o verifică.
--
-- 2. **Nivelul de acces.** Cusătura pentru abonament, pusă acum cât e ieftină:
--    totul e `liber`, `are_acces` întoarce adevărat pentru toată lumea și
--    **nimic nu e închis**. Rostul e ca pornirea ei mai târziu să fie o
--    schimbare de date plus o linie în `where`, nu o rescriere a motorului.
--    Predicatul stă în `where`-ul selecției, nu în răspunsul RPC-ului: o grilă
--    la care n-ai drept trebuie să nu fie rând, nu rând ascuns.
--
-- 3. **Favoritele.** Un mod de test întreg („doar favoritele") se sprijină pe
--    ele, iar tabelul e prea mic ca să merite o migrare separată.
--
-- `dificultate` intră tot acum fiindcă e un filtru al generării. Rămâne **goală
-- și opțională**: se scrie de mână, nu se ghicește din răspunsuri. Regula casei —
-- o cifră care nu poate fi derivată din ce a făcut elevul sau din bancă nu se
-- inventează — se aplică și aici, doar că aici sursa e autorul.

-- --------------------------------------------------------------- materia --

alter table questions add column materie_id text references materii (id) on update cascade;

update questions q set materie_id = c.materie_id
from chapters c where c.id = q.chapter_id;

alter table questions alter column materie_id set not null;

-- Derivată la scriere, nu cerută de la client: o grilă nu poate pretinde altă
-- materie decât cea a capitolului ei.
create function private.completeaza_materia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select c.materie_id into new.materie_id
  from public.chapters c where c.id = new.chapter_id;
  return new;
end;
$$;

create trigger questions_materie
  before insert or update of chapter_id on questions
  for each row execute function private.completeaza_materia();

-- Celălalt capăt. `salveaza_capitol` refuză mutarea unui capitol care are grile,
-- deci în practică declanșatorul ăsta prinde doar capitolele goale — dar regula
-- „materia grilei e materia capitolului ei" trebuie să țină și când cineva
-- scrie direct în tabel din editorul SQL, altminteri denormalizarea minte.
create function private.propaga_materia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.questions set materie_id = new.materie_id where chapter_id = new.id;
  return new;
end;
$$;

create trigger chapters_propaga_materia
  after update of materie_id on chapters
  for each row when (new.materie_id is distinct from old.materie_id)
  execute function private.propaga_materia();

revoke all on function private.completeaza_materia() from public, anon, authenticated;
revoke all on function private.propaga_materia()     from public, anon, authenticated;

-- ----------------------------------------------------------------- acces --

create type nivel_acces as enum ('liber', 'premium');

alter table questions add column acces nivel_acces not null default 'liber';
alter table colectii  add column acces nivel_acces not null default 'liber';

-- Null înseamnă „fără abonament". O dată în trecut înseamnă tot asta — de aceea
-- comparația e cu `now()`, nu cu `is not null`.
alter table profiles add column abonament_pana timestamptz;

create function private.are_acces(nivel public.nivel_acces)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select nivel = 'liber'
      or private.is_admin()
      or exists (
           select 1 from public.profiles
           where id = (select auth.uid()) and abonament_pana > now()
         );
$$;

-- Lecția migrării 0003: `revoke ... from anon` singur nu face nimic cât timp
-- `public` are dreptul, iar `grant ... to authenticated` e portant — funcția se
-- cheamă din expresii evaluate în numele celui care interoghează.
revoke all on function private.are_acces(public.nivel_acces) from public, anon, authenticated;
grant execute on function private.are_acces(public.nivel_acces) to authenticated;

-- ----------------------------------------------------------- dificultate --

alter table questions
  add column dificultate smallint
  check (dificultate is null or dificultate between 1 and 5);

-- ------------------------------------------------------------- favorite --

create table favorite (
  user_id     uuid not null references auth.users (id) on delete cascade,
  question_id text not null references questions (id) on delete cascade on update cascade,
  created_at  timestamptz not null default now(),

  primary key (user_id, question_id)
);

-- Supabase acordă implicit `select/insert/update/delete` lui `anon` și
-- `authenticated` pe orice tabel nou din `public`, deci fără rândurile astea
-- două favoritele oricui ar fi citibile de oricine, fără nicio eroare.
alter table favorite enable row level security;

create policy favorite_proprii on favorite
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------- indexuri --

-- Calea de acces a selecției de candidați: mereu `status = 'publicata'`, mereu
-- filtrată pe materie sau capitol, mereu verificată pe acces.
create index questions_generare_idx on questions (materie_id, chapter_id, acces)
  where status = 'publicata';

create index questions_colectie_generare_idx on questions (colectie_id)
  where colectie_id is not null and status = 'publicata';

-- „Nevăzute" și „doar greșelile" caută răspunsurile unui om pentru o grilă
-- anume. `include` face căutarea numai-din-index: fără el, fiecare rând
-- candidat costă o citire din heap ca să afle dacă a fost corect.
create index attempts_user_question_corect_idx on attempts (user_id, question_id)
  include (is_correct, answered_at);
