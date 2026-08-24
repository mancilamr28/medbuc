-- O singură masă de lucru pentru toate felurile de test.
--
-- Azi sunt trei forme de păstrare pentru aceeași idee: `sessions` (exersare),
-- `sim_runs` (simulare) și... tot `sessions`, fiindcă recapitularea n-are unde
-- altundeva. Împart `id`, `user_id`, `started_at`, `finished_at` și diferă doar
-- prin ce filtrează. `test_runs` le ține pe toate, iar modul devine o coloană.
--
-- Migrarea **nu mută nimic**: tabelele vechi rămân neatinse, cu rândurile lor,
-- iar clientul din producție continuă să scrie în ele. Mutarea celor 22 de
-- rânduri și trecerea clientului sunt o felie separată, ca să se poată da înapoi
-- fără să se piardă o lucrare începută.
--
-- Trei decizii care nu sunt de formă:
--
-- 1. **`test_run_items.question_id` n-are cheie externă, deliberat.** Instantaneul
--    trebuie să supraviețuiască ștergerii unei grile. `sim_runs.question_ids`
--    funcționează deja așa, iar `GrilaLipsa` randează deja cazul „grila nu mai
--    există" fără să renumeroteze restul. O cheie externă ar transforma o
--    ștergere din bibliotecă într-o lucrare stricată sau, mai rău, cu răspunsuri
--    mutate pe alte întrebări.
--
-- 2. **Pozițiile sunt explicite, deci golurile rămân goluri.** Răspunsurile se
--    cheie pe poziție peste tot (`attempts.client_key = '<run>:<poziție>'`), așa
--    că orice compactare rescrie tăcut ce a răspuns omul — exact bug-ul găsit în
--    `useRecapitulare`, care compacta cu `flatMap`. Cu rânduri numerotate,
--    clasa aia de greșeală devine imposibilă, nu doar evitată prin convenție.
--
-- 3. **`ends_at` e un moment absolut, nu secunde rămase.** Cronometrul curge și
--    cu fereastra închisă — garanția pe care `useSimulare` o dă deja în client.
--
-- Nu există coloană `scor` și nu va exista: scorul se calculează din răspunsuri,
-- ca azi. Clipa în care e stocat e clipa în care poate să nu mai fie de acord cu
-- jurnalul, adică exact așa au apărut cifrele inventate scoase din aplicație.

create type test_mod as enum (
  'exersare',
  'simulare',
  'recapitulare',
  'test_predefinit',
  'greseli',
  'favorite',
  'nevazute'
);

create table test_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  mod         test_mod not null,
  -- Ce s-a cerut la generare. Ține „repetă testul ăsta" și antetul rezultatului,
  -- fără să fie nevoie de o coloană nouă pentru fiecare filtru care apare.
  config      jsonb not null default '{}'::jsonb,
  started_at  timestamptz not null default now(),
  -- Null înseamnă „fără limită de timp", nu „a expirat".
  ends_at     timestamptz,
  finished_at timestamptz,
  -- Poziția curentă, ca reluarea să meargă de pe alt dispozitiv.
  qi          smallint not null default 0,
  -- Câte s-au cerut, nu câte s-au obținut. Rămâne numitorul scorului, ca o
  -- lucrare livrată mai scurtă decât s-a cerut să nu umfle tăcut procentul.
  nr_cerut    smallint not null check (nr_cerut > 0),

  constraint test_runs_ends_after_start check (ends_at is null or ends_at > started_at)
);

create index test_runs_user_idx on test_runs (user_id, started_at desc);

create table test_run_items (
  run_id      uuid not null references test_runs (id) on delete cascade,
  position    smallint not null check (position >= 0),
  -- Fără cheie externă: vezi nota 1 de sus.
  question_id text not null,
  -- Ordinea variantelor pentru lucrarea asta. Null = ordinea firească, fie
  -- fiindcă nu s-a amestecat, fie fiindcă tipul grilei nu permite amestecare.
  -- Se ține ordinea rezolvată, nu sămânța: Postgres nu garantează că `setseed`
  -- dă același șir între versiuni, deci „ține sămânța și re-derivă" e o
  -- greșeală care se vede abia peste un an.
  option_order option_key[],
  chosen      option_key,
  revealed    boolean not null default false,
  marked      boolean not null default false,
  -- Momentul răspunsului, per grilă. Azi toate răspunsurile unei sesiuni poartă
  -- același `finished_at`, deci ritmul nu se poate analiza după aceea și nu se
  -- poate completa retroactiv. Costă o coloană acum și e imposibil mai târziu.
  answered_at timestamptz,

  primary key (run_id, position)
);

-- Legătura curată dintre jurnal și lucrare. `client_key` rămâne cum e —
-- `'<run>:<poziție>'` — deci rândurile scrise înainte de coloana asta se
-- potrivesc în continuare cu lucrările lor.
alter table attempts add column run_id uuid references test_runs (id) on delete set null;
create index attempts_run_idx on attempts (run_id) where run_id is not null;

-- ------------------------------------------------------------ politicile --

alter table test_runs      enable row level security;
alter table test_run_items enable row level security;

create policy test_runs_proprii on test_runs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- `test_run_items` n-are `user_id`: proprietarul e al lucrării. Un `user_id`
-- copiat aici ar fi a doua sursă de adevăr pentru „a cui e", deci ceva ce poate
-- să nu mai fie de acord cu prima.
--
-- Trei politici, nu un `for all`: **ștergerea lipsește dinadins**. O lucrare se
-- aruncă întreagă (ștergerea din `test_runs` cade în cascadă), nu rând cu rând —
-- scoaterea unei poziții din mijloc ar renumerota tot ce urmează și ar dezlipi
-- răspunsurile deja scrise în jurnal.
create policy test_run_items_citire on test_run_items
  for select to authenticated
  using (exists (select 1 from test_runs r where r.id = run_id and r.user_id = auth.uid()));

create policy test_run_items_inserare on test_run_items
  for insert to authenticated
  with check (exists (select 1 from test_runs r where r.id = run_id and r.user_id = auth.uid()));

create policy test_run_items_actualizare on test_run_items
  for update to authenticated
  using (exists (select 1 from test_runs r where r.id = run_id and r.user_id = auth.uid()))
  with check (exists (select 1 from test_runs r where r.id = run_id and r.user_id = auth.uid()));

-- ------------------------------------------------- instantaneul e închis --

-- Regula „o lucrare generată nu se schimbă dacă biblioteca se schimbă" nu poate
-- fi scrisă ca politică: un `with check` vede doar rândul nou, nu și pe cel
-- vechi, deci nu poate spune „coloana asta nu are voie să se schimbe". Un
-- declanșator vede și `old`, și `new`.
create function private.ingheata_instantaneul()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_predata timestamptz;
begin
  if new.question_id is distinct from old.question_id
     or new.position is distinct from old.position
     or new.option_order is distinct from old.option_order then
    raise exception 'Instantaneul lucrării nu se mai schimbă după generare';
  end if;

  select finished_at into v_predata from public.test_runs where id = old.run_id;
  if v_predata is not null
     and (new.chosen is distinct from old.chosen or new.marked is distinct from old.marked) then
    raise exception 'Lucrarea e predată — răspunsurile nu se mai schimbă';
  end if;

  return new;
end;
$$;

create trigger test_run_items_inghetate
  before update on test_run_items
  for each row execute function private.ingheata_instantaneul();

revoke all on function private.ingheata_instantaneul() from public, anon, authenticated;
