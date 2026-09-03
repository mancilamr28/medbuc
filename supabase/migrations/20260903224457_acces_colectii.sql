-- Accesul premium există deja pe grile, colecții și teste, dar colecția era
-- doar o etichetă la generare: o grilă liberă dintr-o colecție premium intra
-- în lucrare. De aici înainte accesul efectiv este cel mai restrictiv dintre
-- grilă, colecția ei și definiția testului.

-- --------------------------------------------------------------- citire --

drop policy questions_citire on public.questions;
create policy questions_citire on public.questions
  for select to authenticated
  using (
    private.is_admin()
    or (
      status = 'publicata'
      and private.are_acces(acces)
      and (
        colectie_id is null
        or exists (
          select 1 from public.colectii c
          where c.id = questions.colectie_id
            and c.publicat
            and private.are_acces(c.acces)
        )
      )
    )
  );

drop policy question_options_citire on public.question_options;
create policy question_options_citire on public.question_options
  for select to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = question_options.question_id
        and (
          private.is_admin()
          or (
            q.status = 'publicata'
            and private.are_acces(q.acces)
            and (
              q.colectie_id is null
              or exists (
                select 1 from public.colectii c
                where c.id = q.colectie_id
                  and c.publicat
                  and private.are_acces(c.acces)
              )
            )
          )
        )
    )
  );

-- ----------------------------------------------------------- generarea --

create or replace function private.candidati(filtre jsonb, mod text)
returns table (id text, materie_id text)
language sql
stable
security definer
set search_path = ''
as $$
  with f as (
    select
      coalesce(array(select jsonb_array_elements_text(filtre -> 'ids')),       '{}'::text[]) as ids,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'materii')),  '{}'::text[]) as materii,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'capitole')), '{}'::text[]) as capitole,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'colectii')), '{}'::text[]) as colectii,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'surse')),    '{}'::text[]) as surse,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'tipuri')),   '{}'::text[]) as tipuri,
      nullif(filtre ->> 'dificultate_min', '')::smallint as dmin,
      nullif(filtre ->> 'dificultate_max', '')::smallint as dmax
  )
  select q.id, q.materie_id
  from public.questions q, f
  where q.status = 'publicata'
    and private.are_acces(q.acces)
    and (
      q.colectie_id is null
      or exists (
        select 1 from public.colectii c
        where c.id = q.colectie_id
          and c.publicat
          and private.are_acces(c.acces)
      )
    )
    and (cardinality(f.ids)       = 0 or q.id           = any (f.ids))
    and (cardinality(f.materii)  = 0 or q.materie_id  = any (f.materii))
    and (cardinality(f.capitole) = 0 or q.chapter_id  = any (f.capitole))
    and (cardinality(f.colectii) = 0 or q.colectie_id = any (f.colectii))
    and (cardinality(f.surse)    = 0 or q.sursa::text = any (f.surse))
    and (cardinality(f.tipuri)   = 0 or q.tip_id      = any (f.tipuri))
    and (f.dmin is null or q.dificultate >= f.dmin)
    and (f.dmax is null or q.dificultate <= f.dmax)
    and case mod
      when 'nevazute' then not exists (
        select 1 from public.attempts a
        where a.user_id = (select auth.uid()) and a.question_id = q.id
      )
      when 'greseli' then not coalesce((
        select a.is_correct from public.attempts a
        where a.user_id = (select auth.uid()) and a.question_id = q.id
        order by a.answered_at desc limit 1
      ), true)
      when 'favorite' then exists (
        select 1 from public.favorite fv
        where fv.user_id = (select auth.uid()) and fv.question_id = q.id
      )
      else true
    end
$$;

-- Testele predefinite rămân vizibile, dar apar închise cu motivul, nu ascunse.
create or replace function public.lista_teste_predefinite()
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
        'disponibil',
          private.are_acces(t.acces)
          and (
            t.colectie_id is null
            or exists (
              select 1 from public.colectii c
              where c.id = t.colectie_id and c.publicat and private.are_acces(c.acces)
            )
          )
          and not exists (
            select 1
            from public.test_predefinit_items i
            join public.questions q on q.id = i.question_id
            left join public.colectii c on c.id = q.colectie_id
            where i.test_id = t.id
              and (
                not private.are_acces(q.acces)
                or (q.colectie_id is not null and (not c.publicat or not private.are_acces(c.acces)))
              )
          )
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
        or exists (select 1 from public.colectii c where c.id = t.colectie_id and c.publicat)
      )
  ), '[]'::jsonb);
end;
$$;

-- Învelișul verifică și colecțiile unei lucrări fixe înainte să ajungă la
-- motorul vechi. Astfel o cerere scrisă de mână nu poate ocoli interfața.
create or replace function public.genereaza_test(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_test_id text;
  v_rezultat jsonb;
begin
  if coalesce(payload ->> 'mod', 'exersare') = 'test_predefinit' then
    v_test_id := nullif(btrim(payload ->> 'test_id'), '');
    if exists (
      select 1
      from public.teste_predefinite t
      left join public.colectii c on c.id = t.colectie_id
      where t.id = v_test_id
        and t.colectie_id is not null
        and (not c.publicat or not private.are_acces(c.acces))
    ) or exists (
      select 1
      from public.test_predefinit_items i
      join public.questions q on q.id = i.question_id
      left join public.colectii c on c.id = q.colectie_id
      where i.test_id = v_test_id
        and q.colectie_id is not null
        and (not c.publicat or not private.are_acces(c.acces))
    ) then
      raise exception 'acces_interzis';
    end if;
    v_rezultat := private.genereaza_test_predefinit(payload);

    update public.test_runs
    set test_predefinit_id = v_test_id
    where id = (v_rezultat ->> 'run_id')::uuid;

    return v_rezultat;
  end if;
  return private.genereaza_test_din_regula(payload);
end;
$$;

-- --------------------------------------------------------- administrare --

create or replace function public.salveaza_colectie(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       text := nullif(btrim(payload ->> 'id'), '');
  v_nume     text := nullif(btrim(payload ->> 'nume'), '');
  v_vechi    public.colectii%rowtype;
  v_tip      text;
  v_centru   text;
  v_an       smallint;
  v_sursa    text;
  v_pozitie  smallint;
  v_publicat boolean;
  v_acces    public.nivel_acces;
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate schimba colecțiile';
  end if;
  if v_id is null or v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Identificatorul poate conține doar litere mici, cifre și cratime: %', coalesce(v_id, 'lipsă');
  end if;

  select * into v_vechi from public.colectii where id = v_id;
  v_nume := coalesce(v_nume, v_vechi.nume);
  if v_nume is null then raise exception 'Colecția are nevoie de un nume'; end if;

  v_tip := coalesce(payload ->> 'tip', v_vechi.tip::text);
  if v_tip is null or v_tip not in ('subiect_oficial', 'simulare_oficiala', 'culegere', 'autor') then
    raise exception 'Fel de colecție necunoscut: %', coalesce(v_tip, 'lipsă');
  end if;

  v_centru := case
    when pg_catalog.jsonb_exists(payload, 'centruId') then nullif(btrim(payload ->> 'centruId'), '')
    else v_vechi.centru_id
  end;
  if v_centru is not null and not exists (select 1 from public.centre_admitere where id = v_centru) then
    raise exception 'Centrul nu există: %', v_centru;
  end if;

  v_an := case when pg_catalog.jsonb_exists(payload, 'an')
    then nullif(payload ->> 'an', '')::smallint else v_vechi.an end;
  v_sursa := case when pg_catalog.jsonb_exists(payload, 'sursaBibliografica')
    then coalesce(btrim(payload ->> 'sursaBibliografica'), '')
    else coalesce(v_vechi.sursa_bibliografica, '') end;
  v_pozitie := coalesce(
    (payload ->> 'position')::smallint,
    v_vechi.position,
    (select coalesce(max(position), -1) + 1 from public.colectii)
  );
  v_publicat := coalesce((payload ->> 'publicat')::boolean, v_vechi.publicat, true);
  v_acces := coalesce(nullif(payload ->> 'acces', '')::public.nivel_acces, v_vechi.acces, 'liber');

  insert into public.colectii (
    id, centru_id, nume, tip, an, sursa_bibliografica, position, publicat, acces
  ) values (
    v_id, v_centru, v_nume, v_tip::public.colectie_tip, v_an, v_sursa, v_pozitie, v_publicat, v_acces
  )
  on conflict (id) do update set
    centru_id = excluded.centru_id,
    nume = excluded.nume,
    tip = excluded.tip,
    an = excluded.an,
    sursa_bibliografica = excluded.sursa_bibliografica,
    position = excluded.position,
    publicat = excluded.publicat,
    acces = excluded.acces;

  return v_id;
end;
$$;
