-- Definițiile administrabile pentru lucrări oficiale și simulări.
--
-- O definiție „fixă” păstrează lista și ordinea exactă a grilelor. O definiție
-- „după regulă” păstrează filtrele și trage o lucrare nouă la fiecare pornire.
-- În ambele cazuri, rezultatul ajunge în `test_runs` / `test_run_items`, deci
-- lucrarea începută nu se schimbă când administratorul editează definiția.

create type public.mod_selectie_test as enum ('fix', 'dupa_regula');

create table public.teste_predefinite (
  id                  text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  centru_id           text not null references public.centre_admitere (id) on update cascade,
  colectie_id         text references public.colectii (id) on update cascade,
  nume                text not null check (length(btrim(nume)) > 0),
  descriere           text not null default '',
  mod_selectie        public.mod_selectie_test not null,
  regula              jsonb not null default '{}'::jsonb,
  nr_grile            smallint not null check (nr_grile between 1 and 300),
  durata_minute       smallint check (durata_minute is null or durata_minute > 0),
  acces               public.nivel_acces not null default 'liber',
  publicat            boolean not null default false,
  position            smallint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint teste_predefinite_regula_fix
    check (mod_selectie <> 'fix' or regula = '{}'::jsonb)
);

create index teste_predefinite_lista_idx
  on public.teste_predefinite (centru_id, publicat, position, id);

create index teste_predefinite_colectie_idx
  on public.teste_predefinite (colectie_id, position)
  where colectie_id is not null;

create table public.test_predefinit_items (
  test_id     text not null references public.teste_predefinite (id)
    on delete cascade on update cascade,
  position    smallint not null check (position >= 0),
  question_id text not null references public.questions (id) on update cascade,

  primary key (test_id, position),
  unique (test_id, question_id)
);

-- Cheile externe nu primesc automat index pe partea care referă. E necesar la
-- retragerea sau redenumirea unei grile, ca Postgres să nu scaneze toate testele.
create index test_predefinit_items_question_idx
  on public.test_predefinit_items (question_id, test_id);

create trigger teste_predefinite_updated_at
  before update on public.teste_predefinite
  for each row execute function private.touch_updated_at();

alter table public.teste_predefinite enable row level security;
alter table public.test_predefinit_items enable row level security;

create policy teste_predefinite_admin on public.teste_predefinite
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy test_predefinit_items_admin on public.test_predefinit_items
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Tabelele sunt detalii interne. Elevul citește metadatele publicate prin RPC,
-- iar lista exactă a grilelor nu traversează granița înainte de generare.
revoke all on table public.teste_predefinite from public, anon, authenticated;
revoke all on table public.test_predefinit_items from public, anon, authenticated;

-- ---------------------------------------------------------- lista publică --

create function public.lista_teste_predefinite()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'neautentificat';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'centru_id', t.centru_id,
        'colectie_id', t.colectie_id,
        'nume', t.nume,
        'descriere', t.descriere,
        'mod_selectie', t.mod_selectie,
        'nr_grile', t.nr_grile,
        'durata_minute', t.durata_minute,
        'acces', t.acces,
        'disponibil', private.are_acces(t.acces)
      ) order by t.position, t.nume, t.id
    )
    from public.teste_predefinite t
    where t.publicat
      and exists (
        select 1 from public.centre_admitere c
        where c.id = t.centru_id and c.publicat
      )
      and (
        t.colectie_id is null
        or exists (
          select 1 from public.colectii c
          where c.id = t.colectie_id and c.publicat
        )
      )
  ), '[]'::jsonb);
end;
$$;

-- ----------------------------------------------------------- lista admin --

create function public.citeste_teste_predefinite_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate citi inventarul testelor';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'centru_id', t.centru_id,
        'colectie_id', t.colectie_id,
        'nume', t.nume,
        'descriere', t.descriere,
        'mod_selectie', t.mod_selectie,
        'regula', t.regula,
        'nr_grile', t.nr_grile,
        'durata_minute', t.durata_minute,
        'acces', t.acces,
        'publicat', t.publicat,
        'position', t.position,
        'grile', coalesce((
          select jsonb_agg(i.question_id order by i.position)
          from public.test_predefinit_items i where i.test_id = t.id
        ), '[]'::jsonb)
      ) order by t.position, t.nume, t.id
    )
    from public.teste_predefinite t
  ), '[]'::jsonb);
end;
$$;

-- --------------------------------------------------------------- salvare --

create function public.salveaza_test_predefinit(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id          text := nullif(btrim(payload ->> 'id'), '');
  v_centru      text := nullif(btrim(payload ->> 'centru_id'), '');
  v_colectie    text;
  v_nume        text := nullif(btrim(payload ->> 'nume'), '');
  v_descriere   text := coalesce(btrim(payload ->> 'descriere'), '');
  v_mod_text    text := payload ->> 'mod_selectie';
  v_mod         public.mod_selectie_test;
  v_regula      jsonb := coalesce(payload -> 'regula', '{}'::jsonb);
  v_grile       text[] := coalesce(
    array(select jsonb_array_elements_text(coalesce(payload -> 'grile', '[]'::jsonb))),
    '{}'::text[]
  );
  v_nr          integer;
  v_durata      integer := nullif(payload ->> 'durata_minute', '')::integer;
  v_acces_text  text := coalesce(payload ->> 'acces', 'liber');
  v_acces       public.nivel_acces;
  v_publicat    boolean := coalesce((payload ->> 'publicat')::boolean, false);
  v_position    smallint;
  v_vechi       public.teste_predefinite%rowtype;
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate salva teste predefinite';
  end if;

  if v_id is null or v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Identificator invalid pentru test';
  end if;
  if v_nume is null then
    raise exception 'Testul are nevoie de un nume';
  end if;
  if v_centru is null or not exists (
    select 1 from public.centre_admitere where id = v_centru
  ) then
    raise exception 'Centrul de admitere nu există: %', coalesce(v_centru, 'lipsă');
  end if;

  begin
    v_mod := v_mod_text::public.mod_selectie_test;
  exception when invalid_text_representation then
    raise exception 'Mod de selecție necunoscut: %', coalesce(v_mod_text, 'lipsă');
  end;

  begin
    v_acces := v_acces_text::public.nivel_acces;
  exception when invalid_text_representation then
    raise exception 'Nivel de acces necunoscut: %', v_acces_text;
  end;

  select * into v_vechi from public.teste_predefinite where id = v_id;

  v_colectie := case
    when pg_catalog.jsonb_exists(payload, 'colectie_id')
      then nullif(btrim(payload ->> 'colectie_id'), '')
    else v_vechi.colectie_id
  end;
  if v_colectie is not null and not exists (
    select 1 from public.colectii where id = v_colectie
  ) then
    raise exception 'Colecția nu există: %', v_colectie;
  end if;

  if v_durata is not null and v_durata <= 0 then
    raise exception 'Durata trebuie să fie pozitivă';
  end if;

  if v_mod = 'fix' then
    v_regula := '{}'::jsonb;
    v_nr := cardinality(v_grile);

    if v_nr not between 1 and 300 then
      raise exception 'Un test fix trebuie să aibă între 1 și 300 de grile';
    end if;
    if (select count(distinct x) from unnest(v_grile) as x) <> v_nr then
      raise exception 'Lista de grile conține duplicate';
    end if;
    if (select count(*) from public.questions q where q.id = any (v_grile)) <> v_nr then
      raise exception 'Una sau mai multe grile nu există';
    end if;
    if v_publicat and exists (
      select 1 from public.questions q
      where q.id = any (v_grile) and q.status <> 'publicata'
    ) then
      raise exception 'Un test publicat poate conține numai grile publicate';
    end if;
    if v_publicat and v_acces = 'liber' and exists (
      select 1 from public.questions q
      where q.id = any (v_grile) and q.acces = 'premium'
    ) then
      raise exception 'Un test liber nu poate conține grile premium';
    end if;
  else
    if jsonb_typeof(v_regula) <> 'object' then
      raise exception 'Regula testului trebuie să fie un obiect';
    end if;

    if jsonb_array_length(coalesce(v_regula -> 'cote', '[]'::jsonb)) > 0 then
      select coalesce(sum((x ->> 'nr')::integer), 0)::integer
      into v_nr from jsonb_array_elements(v_regula -> 'cote') as x;
    else
      v_nr := coalesce((v_regula ->> 'nr')::integer, 0);
    end if;

    if v_nr not between 1 and 300 then
      raise exception 'Regula trebuie să ceară între 1 și 300 de grile';
    end if;
  end if;

  v_position := coalesce(
    nullif(payload ->> 'position', '')::smallint,
    v_vechi.position,
    (select coalesce(max(position), -1) + 1 from public.teste_predefinite)
  );

  insert into public.teste_predefinite (
    id, centru_id, colectie_id, nume, descriere, mod_selectie, regula,
    nr_grile, durata_minute, acces, publicat, position
  ) values (
    v_id, v_centru, v_colectie, v_nume, v_descriere, v_mod, v_regula,
    v_nr, v_durata, v_acces, v_publicat, v_position
  )
  on conflict (id) do update set
    centru_id = excluded.centru_id,
    colectie_id = excluded.colectie_id,
    nume = excluded.nume,
    descriere = excluded.descriere,
    mod_selectie = excluded.mod_selectie,
    regula = excluded.regula,
    nr_grile = excluded.nr_grile,
    durata_minute = excluded.durata_minute,
    acces = excluded.acces,
    publicat = excluded.publicat,
    position = excluded.position;

  delete from public.test_predefinit_items where test_id = v_id;

  if v_mod = 'fix' then
    insert into public.test_predefinit_items (test_id, position, question_id)
    select v_id, (x.ord - 1)::smallint, x.question_id
    from unnest(v_grile) with ordinality as x(question_id, ord);
  end if;

  return v_id;
end;
$$;

-- ------------------------------------------------------------- generarea --

-- Păstrăm motorul de reguli deja verificat, dar îl mutăm în spatele unui
-- înveliș public. Astfel `genereaza_test` rămâne singura poartă a clientului.
alter function public.genereaza_test(jsonb) set schema private;
alter function private.genereaza_test(jsonb) rename to genereaza_test_din_regula;

revoke all on function private.genereaza_test_din_regula(jsonb)
  from public, anon, authenticated;

create function private.genereaza_test_predefinit(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_id        text := nullif(btrim(payload ->> 'test_id'), '');
  v_test      public.teste_predefinite%rowtype;
  v_cerere    jsonb;
  v_run       uuid := gen_random_uuid();
  v_disponibile integer;
begin
  if v_uid is null then
    raise exception 'neautentificat';
  end if;

  select * into v_test
  from public.teste_predefinite
  where id = v_id and publicat;

  if not found then
    raise exception 'test_predefinit_inexistent';
  end if;
  if not private.are_acces(v_test.acces) then
    raise exception 'acces_interzis';
  end if;

  if v_test.mod_selectie = 'dupa_regula' then
    -- Valorile definiției câștigă în fața oricăror valori trimise de browser.
    -- Elevul alege doar id-ul; nu poate scurta durata sau slăbi `strict`.
    v_cerere := v_test.regula || jsonb_build_object(
      'mod', 'test_predefinit',
      'test_id', v_test.id,
      'nume', v_test.nume,
      'durata_minute', v_test.durata_minute
    );
    return private.genereaza_test_din_regula(v_cerere);
  end if;

  select count(*)::integer into v_disponibile
  from public.test_predefinit_items i
  join public.questions q on q.id = i.question_id
  where i.test_id = v_test.id
    and q.status = 'publicata'
    and private.are_acces(q.acces);

  -- Un subiect oficial e indivizibil: nu îl scurtăm tăcut dacă o grilă a fost
  -- retrasă sau a devenit inaccesibilă. Administratorul îl repară ori îl
  -- retrage; elevul primește o eroare clară.
  if v_disponibile <> v_test.nr_grile then
    raise exception 'test_predefinit_indisponibil';
  end if;

  v_cerere := jsonb_build_object(
    'mod', 'test_predefinit',
    'test_id', v_test.id,
    'nume', v_test.nume,
    'durata_minute', v_test.durata_minute
  );

  insert into public.test_runs (id, user_id, mod, config, ends_at, nr_cerut)
  values (
    v_run,
    v_uid,
    'test_predefinit',
    v_cerere,
    case when v_test.durata_minute is null then null
         else now() + make_interval(mins => v_test.durata_minute) end,
    v_test.nr_grile
  );

  insert into public.test_run_items (run_id, position, question_id, option_order)
  select v_run, i.position, i.question_id, null
  from public.test_predefinit_items i
  where i.test_id = v_test.id
  order by i.position;

  return jsonb_build_object(
    'run_id', v_run,
    'nr_cerut', v_test.nr_grile,
    'nr_obtinut', v_test.nr_grile,
    'insuficient', false,
    'lipsa', '[]'::jsonb
  );
end;
$$;

revoke all on function private.genereaza_test_predefinit(jsonb)
  from public, anon, authenticated;

create function public.genereaza_test(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(payload ->> 'mod', 'exersare') = 'test_predefinit' then
    return private.genereaza_test_predefinit(payload);
  end if;
  return private.genereaza_test_din_regula(payload);
end;
$$;

-- Lecția migrării 0003: trebuie retras și de la pseudo-rolul `public`, nu doar
-- de la `anon`. Doar utilizatorii autentificați primesc porțile intenționate.
revoke all on function public.lista_teste_predefinite() from public, anon;
revoke all on function public.citeste_teste_predefinite_admin() from public, anon;
revoke all on function public.salveaza_test_predefinit(jsonb) from public, anon;
revoke all on function public.genereaza_test(jsonb) from public, anon;

grant execute on function public.lista_teste_predefinite() to authenticated;
grant execute on function public.citeste_teste_predefinite_admin() to authenticated;
grant execute on function public.salveaza_test_predefinit(jsonb) to authenticated;
grant execute on function public.genereaza_test(jsonb) to authenticated;
