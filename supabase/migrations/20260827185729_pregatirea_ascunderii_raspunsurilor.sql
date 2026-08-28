-- Pregătește clientul pentru revocarea răspunsurilor, fără să facă revocarea.
-- După ce versiunea care folosește aceste RPC-uri s-a propagat și bundle-urile
-- vechi nu mai sunt servite din cache, o migrare separată poate retrage
-- `correct`, `expl` și `question_options.why` de la `authenticated`.

-- ---------------------------------------------------------------- candidați --

-- Recapitularea inteligentă cunoaște exact id-urile scadente. Motorul le acceptă
-- ca încă o axă de filtrare, dar păstrează toate celelalte porți: publicare,
-- acces și filtrele obișnuite. O listă goală înseamnă, ca peste tot, fără filtru.
create or replace function private.candidati(filtre jsonb, mod text)
returns table (id text, materie_id text)
language sql
stable
security definer
set search_path = ''
as $$
  with f as (
    select
      coalesce(array(select jsonb_array_elements_text(filtre -> 'ids')),        '{}'::text[]) as ids,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'materii')),   '{}'::text[]) as materii,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'capitole')),  '{}'::text[]) as capitole,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'colectii')),  '{}'::text[]) as colectii,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'surse')),     '{}'::text[]) as surse,
      coalesce(array(select jsonb_array_elements_text(filtre -> 'tipuri')),    '{}'::text[]) as tipuri,
      nullif(filtre ->> 'dificultate_min', '')::smallint as dmin,
      nullif(filtre ->> 'dificultate_max', '')::smallint as dmax
  )
  select q.id, q.materie_id
  from public.questions q, f
  where q.status = 'publicata'
    and private.are_acces(q.acces)
    and (cardinality(f.ids)       = 0 or q.id           = any (f.ids))
    and (cardinality(f.materii)   = 0 or q.materie_id  = any (f.materii))
    and (cardinality(f.capitole)  = 0 or q.chapter_id  = any (f.capitole))
    and (cardinality(f.colectii)  = 0 or q.colectie_id = any (f.colectii))
    and (cardinality(f.surse)     = 0 or q.sursa::text = any (f.surse))
    and (cardinality(f.tipuri)    = 0 or q.tip_id       = any (f.tipuri))
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

revoke all on function private.candidati(jsonb, text) from public, anon, authenticated;

-- ------------------------------------------------------- export administrator --

-- Lista Admin folosește numai câmpurile ușoare. Conținutul complet se cere prin
-- RPC doar la editare sau export, fiindcă rolul „admin” este al aplicației, nu
-- un rol Postgres căruia i se pot acorda separat coloanele protejate.
create function public.exporta_grile_admin(de_la integer, limita integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_grile jsonb;
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate exporta biblioteca';
  end if;
  if de_la < 0 or limita < 1 or limita > 500 then
    raise exception 'Pagină de export invalidă';
  end if;

  select count(*)::integer into v_total from public.questions;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'chapter_id', q.chapter_id,
      'tip_id', q.tip_id,
      'status', q.status,
      'text', q.text,
      'enunturi', q.enunturi,
      'correct', q.correct,
      'expl', q.expl,
      'src', q.src,
      'sursa', q.sursa,
      'an', q.an,
      'colectie_id', q.colectie_id,
      'optiuni', coalesce((
        select jsonb_agg(jsonb_build_object('key', o.key, 'text', o.text, 'why', o.why) order by o.key)
        from public.question_options o where o.question_id = q.id
      ), '[]'::jsonb)
    ) order by q.id
  ), '[]'::jsonb)
  into v_grile
  from (
    select * from public.questions order by id offset de_la limit limita
  ) q;

  return jsonb_build_object('total', v_total, 'grile', v_grile);
end;
$$;

revoke all on function public.exporta_grile_admin(integer, integer) from public, anon;
grant execute on function public.exporta_grile_admin(integer, integer) to authenticated;

-- ----------------------------------------------------- simularea locală veche --

create function public.importa_simulare_veche(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_id        uuid := (payload ->> 'id')::uuid;
  v_started   timestamptz := to_timestamp((payload ->> 'startedAt')::double precision / 1000.0);
  v_ends      timestamptz := to_timestamp((payload ->> 'endsAt')::double precision / 1000.0);
  v_finished  timestamptz := case when payload ->> 'finishedAt' is null then null
                                  else to_timestamp((payload ->> 'finishedAt')::double precision / 1000.0) end;
  v_nr        integer := jsonb_array_length(coalesce(payload -> 'order', '[]'::jsonb));
  v_qi        integer := coalesce((payload ->> 'qi')::integer, 0);
  v_owner     uuid;
  v_gasite    integer;
begin
  if v_uid is null then raise exception 'neautentificat'; end if;

  select user_id into v_owner from public.test_runs where id = v_id;
  if v_owner is not null then
    if v_owner <> v_uid then raise exception 'lucrare_inexistenta'; end if;
    return jsonb_build_object('run_id', v_id);
  end if;

  if v_nr < 1 or v_nr > 300 or v_ends < v_started or v_qi < 0 or v_qi >= v_nr then
    raise exception 'simulare_veche_invalida';
  end if;

  select count(*)::integer into v_gasite
  from jsonb_array_elements_text(payload -> 'order') with ordinality x(question_id, ord)
  join public.questions q on q.id = x.question_id;
  if v_gasite <> v_nr then raise exception 'simulare_veche_invalida'; end if;

  insert into public.test_runs
    (id, user_id, mod, config, started_at, ends_at, finished_at, qi, nr_cerut)
  values
    (v_id, v_uid, 'simulare', coalesce(payload -> 'config', '{}'::jsonb),
     v_started, v_ends, v_finished, v_qi, v_nr);

  insert into public.test_run_items
    (run_id, position, question_id, option_order, chosen, marked, revealed, answered_at)
  select
    v_id,
    (x.ord - 1)::smallint,
    x.question_id,
    null,
    nullif(payload -> 'answers' ->> (x.ord - 1)::text, '')::public.option_key,
    coalesce((payload -> 'marks' ->> (x.ord - 1)::text)::boolean, false),
    false,
    case when payload -> 'answers' ->> (x.ord - 1)::text is null then null else coalesce(v_finished, v_started) end
  from jsonb_array_elements_text(payload -> 'order') with ordinality x(question_id, ord);

  -- O simulare deja predată poate proveni dintr-o versiune care n-a apucat să
  -- sincronizeze. Jurnalul este completat idempotent din răspunsurile păstrate.
  if v_finished is not null then
    insert into public.attempts
      (user_id, question_id, chosen, is_correct, source, run_id, client_key, answered_at)
    select v_uid, q.id, i.chosen, i.chosen = q.correct, 'simulare', v_id,
           v_id::text || ':' || i.position::text, coalesce(i.answered_at, v_finished)
    from public.test_run_items i
    join public.questions q on q.id = i.question_id
    where i.run_id = v_id and i.chosen is not null
    on conflict (client_key) do nothing;
  end if;

  return jsonb_build_object('run_id', v_id);
end;
$$;

revoke all on function public.importa_simulare_veche(jsonb) from public, anon;
grant execute on function public.importa_simulare_veche(jsonb) to authenticated;

-- ---------------------------------------------------------- ultimul backfill --

-- Clientul vechi a putut scrie între migrarea 0019 și această livrare. Repetăm
-- copierea idempotentă chiar la tăiere, ca fereastra aceea să nu lase goluri.
insert into public.test_runs (id, user_id, mod, config, started_at, ends_at, finished_at, qi, nr_cerut)
select
  s.id, s.user_id,
  case when exists (
    select 1 from public.attempts a where a.session_id = s.id and a.source = 'recapitulare'
  ) then 'recapitulare'::public.test_mod else 'exersare'::public.test_mod end,
  jsonb_build_object('capitole', to_jsonb(s.chapter_ids)),
  s.started_at, null, s.finished_at, 0, null
from public.sessions s
on conflict (id) do nothing;

insert into public.test_runs (id, user_id, mod, config, started_at, ends_at, finished_at, qi, nr_cerut)
select r.id, r.user_id, 'simulare', r.config, r.started_at, r.ends_at, r.finished_at, 0,
       nullif(cardinality(r.question_ids), 0)
from public.sim_runs r
on conflict (id) do nothing;

insert into public.test_run_items (run_id, position, question_id, option_order)
select r.id, (o.ord - 1)::smallint, o.question_id, null
from public.sim_runs r
cross join lateral unnest(r.question_ids) with ordinality as o(question_id, ord)
on conflict (run_id, position) do nothing;

update public.attempts
set run_id = coalesce(session_id, sim_run_id)
where run_id is null and coalesce(session_id, sim_run_id) is not null;
