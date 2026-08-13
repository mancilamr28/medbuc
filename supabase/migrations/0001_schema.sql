-- MedBuc — schema inițială
--
-- Scrisă înainte de a exista proiectul Supabase, ca modelul să fie gândit în
-- SQL, nu tradus mai târziu din tipuri TypeScript. Se aplică în ordinea
-- numerelor; fiecare migrare e imutabilă odată aplicată.
--
-- Două decizii care se văd peste tot mai jos:
--
-- 1. Id-urile de conținut sunt `text` scris de om (`bio-nervos`,
--    `bio-nervos-01`), nu `uuid`. Sunt deja identitatea din aplicație și din
--    lucrările salvate în `localStorage`; păstrându-le, o lucrare începută
--    înainte de migrare rămâne validă după.
-- 2. `attempts` — o linie per răspuns dat — e singura sursă pentru progres,
--    statistici și repetiție. Nimic nu ține un `pct` sau un `done` denormalizat,
--    fiindcă exact așa au apărut cifrele care nu corespundeau cu nimic.

-- `gen_random_uuid()` e în nucleul Postgres de la versiunea 13, deci nu e
-- nevoie de extensia pgcrypto.

-- ---------------------------------------------------------------- conținut --

create table materii (
  id          text primary key,
  name        text not null,
  unit        text not null check (unit in ('grile', 'sesiuni')),
  position    smallint not null,
  created_at  timestamptz not null default now()
);

create table chapters (
  id          text primary key,
  materie_id  text not null references materii (id) on update cascade,
  -- Numărul afișat: „04" la materiile de studiu, anul la subiectele anterioare.
  -- Nu e unic — 2026 are două sesiuni — de aceea identitatea stă în `id`.
  nr          text not null,
  name        text not null,
  position    smallint not null,
  created_at  timestamptz not null default now()
);

create index chapters_materie_idx on chapters (materie_id, position);

create type question_tip as enum ('simplu', 'grupat');
create type question_status as enum ('ciorna', 'publicata', 'retrasa');
create type option_key as enum ('A', 'B', 'C', 'D', 'E');

create table questions (
  id          text primary key,
  chapter_id  text not null references chapters (id) on update cascade,
  tip         question_tip not null,
  status      question_status not null default 'ciorna',
  text        text not null check (length(btrim(text)) > 0),
  -- Doar la complement grupat: cele patru afirmații numerotate.
  enunturi    text[],
  -- Varianta corectă. Cheia externă compusă de mai jos garantează că varianta
  -- chiar există — altfel s-ar putea publica o grilă cu răspunsul corect „E"
  -- fără ca varianta E să fie scrisă.
  correct     option_key not null,
  expl        text not null check (length(btrim(expl)) > 0),
  src         text not null,
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint questions_grupat_are_enunturi check (
    tip <> 'grupat' or (enunturi is not null and array_length(enunturi, 1) = 4)
  )
);

create index questions_chapter_idx on questions (chapter_id);
create index questions_status_idx on questions (status) where status = 'publicata';

create table question_options (
  question_id text not null references questions (id) on delete cascade on update cascade,
  key         option_key not null,
  text        text not null check (length(btrim(text)) > 0),
  -- De ce cade (sau de ce ține) varianta. Explicația per variantă e ce
  -- deosebește o bancă de grile de o listă de răspunsuri.
  why         text,

  primary key (question_id, key)
);

-- Răspunsul corect trebuie să fie una dintre variantele scrise.
alter table questions
  add constraint questions_correct_exists
  foreign key (id, correct) references question_options (question_id, key)
  deferrable initially deferred;

-- ------------------------------------------------------------------ conturi --

create type app_role as enum ('elev', 'admin');

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  full_name    text,
  liceu        text,
  role         app_role not null default 'elev',
  -- Configurația examenului, per elev: până acum erau constante în cod.
  exam_date    date,
  target_score smallint check (target_score between 0 and 100),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Profilul se creează odată cu utilizatorul; fără asta, primul login ar găsi un
-- cont fără rând în `profiles` și fiecare politică RLS ar refuza totul.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------- activitatea --

create type attempt_source as enum ('sesiune', 'simulare', 'recapitulare');

create table sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  -- Din ce capitole s-a compus sesiunea; gol înseamnă „din toată biblioteca".
  chapter_ids text[] not null default '{}'
);

create index sessions_user_idx on sessions (user_id, started_at desc);

create table sim_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  started_at  timestamptz not null default now(),
  -- Momentul absolut al expirării, nu secundele rămase: cronometrul curge și cu
  -- fereastra închisă, exact ca în client.
  ends_at     timestamptz not null,
  finished_at timestamptz,
  config      jsonb not null,
  -- Ordinea grilelor, ca id-uri. Cu poziții, o grilă inserată la mijlocul
  -- bibliotecii ar rescrie conținutul fiecărei lucrări salvate.
  question_ids text[] not null,

  constraint sim_runs_ends_after_start check (ends_at > started_at)
);

create index sim_runs_user_idx on sim_runs (user_id, started_at desc);

create table attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  question_id  text not null references questions (id) on update cascade,
  chosen       option_key,
  is_correct   boolean not null,
  source       attempt_source not null,
  session_id   uuid references sessions (id) on delete set null,
  sim_run_id   uuid references sim_runs (id) on delete set null,
  answered_at  timestamptz not null default now(),

  -- Nemarcat înseamnă greșit la punctaj, dar trebuie să rămână deosebit de un
  -- răspuns greșit dat efectiv — altfel „unde pierzi puncte" minte.
  constraint attempts_chosen_or_blank check (chosen is not null or is_correct = false)
);

create index attempts_user_idx on attempts (user_id, answered_at desc);
create index attempts_user_question_idx on attempts (user_id, question_id);

create table notes (
  user_id    uuid not null references auth.users (id) on delete cascade,
  chapter_id text not null references chapters (id) on update cascade,
  body       text not null default '',
  updated_at timestamptz not null default now(),

  primary key (user_id, chapter_id)
);

-- ------------------------------------------------------------- updated_at --

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger questions_touch before update on questions
  for each row execute function public.touch_updated_at();

create trigger profiles_touch before update on profiles
  for each row execute function public.touch_updated_at();

create trigger notes_touch before update on notes
  for each row execute function public.touch_updated_at();
