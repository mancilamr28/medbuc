-- Testul se compune pe server, nu în browser.
--
-- Azi selecția e în client: `buildOrder` primește toată banca și taie din ea. Cu
-- 181 de grile merge; cu 50 000 înseamnă că browserul descarcă biblioteca
-- întreagă ca să aleagă 100 de rânduri din ea. Și, mai important, **descarcă și
-- răspunsurile corecte** înainte să înceapă simularea.
--
-- Mutarea aici rezolvă amândouă, dar a doua **doar pe jumătate**: ce nu trimite
-- `genereaza_test` se poate cere oricum direct, `select id, correct from
-- questions`. RLS filtrează rânduri, nu coloane. Închiderea reală e un `revoke`
-- pe coloană, și ea are ordine strictă de livrare (întâi clientul care nu le mai
-- cere, apoi revocarea), deci stă într-o felie separată. Până atunci, ce se
-- câștigă aici e scara și corectitudinea selecției, nu secretul.
--
-- ---------------------------------------------------------------------------
--
-- Toate modurile trec prin **o singură interogare de candidați**, cu predicate
-- care se adaugă. Șase interogări paralele ar diverge la prima regulă adăugată
-- doar într-una — exact ce s-a întâmplat cu validarea formularului față de cea a
-- importului, până s-au unit.
--
-- Convenția listelor e cea din tot restul aplicației: **lista goală înseamnă
-- „fără restricție pe axa asta"**, la fel ca `sessions.chapter_ids` și
-- `filtreazaCapitole`. Un singur înțeles pentru gol, peste tot.
--
-- Erorile sunt coduri, nu propoziții românești. Restul RPC-urilor vorbesc
-- românește fiindcă le citește un administrator; pe astea le citește
-- asistentul, care trebuie să ramifice — spre plată, spre o confirmare de „sunt
-- mai puține decât ai cerut", spre o eroare — iar pe o propoziție tradusă nu se
-- poate ramifica.

-- ------------------------------------------------------------ candidații --

/**
 * Grilele eligibile pentru un set de filtre și un mod.
 *
 * `security definer` pentru că citește `attempts` și `favorite` ale celui care
 * cheamă prin `auth.uid()`, nu prin RLS — funcția e chemată dinăuntrul unui RPC
 * care rulează deja ca proprietar, deci politicile n-ar mai filtra nimic aici.
 * De aceea fiecare predicat pe utilizator numește explicit `auth.uid()`.
 */
create function private.candidati(filtre jsonb, mod text)
returns table (id text, materie_id text)
language sql
stable
security definer
set search_path = ''
as $$
  with f as (
    select
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
    -- Înăuntrul lui `where`, nu în răspuns: o grilă la care n-ai drept trebuie
    -- să nu fie rând, nu rând ascuns. Azi întoarce adevărat pentru toți.
    and private.are_acces(q.acces)
    and (cardinality(f.materii)  = 0 or q.materie_id  = any (f.materii))
    and (cardinality(f.capitole) = 0 or q.chapter_id  = any (f.capitole))
    and (cardinality(f.colectii) = 0 or q.colectie_id = any (f.colectii))
    and (cardinality(f.surse)    = 0 or q.sursa::text = any (f.surse))
    and (cardinality(f.tipuri)   = 0 or q.tip_id      = any (f.tipuri))
    -- O grilă fără dificultate scrisă nu e „ușoară", e necunoscută, deci iese
    -- din orice filtru pe dificultate. Ghicitul ar fi tocmai cifra inventată.
    and (f.dmin is null or q.dificultate >= f.dmin)
    and (f.dmax is null or q.dificultate <= f.dmax)
    and case mod
      when 'nevazute' then not exists (
        select 1 from public.attempts a
        where a.user_id = (select auth.uid()) and a.question_id = q.id
      )
      -- Ultimul răspuns e greșit, nu „a fost greșit vreodată": altfel o grilă
      -- învățată între timp rămâne în coadă pentru totdeauna. Fără răspuns
      -- deloc nu e greșeală, deci `coalesce(..., true)`.
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

-- --------------------------------------------------------- numărătoarea --

/**
 * Câte grile ar intra, pe filtrele astea. Contorul viu al asistentului.
 *
 * Întoarce și defalcarea pe materii, fiindcă pasul de conținut o cere oricum și
 * două drumuri la server pentru același `where` ar putea să nu fie de acord —
 * cineva răspunde o grilă între ele și totalul nu mai e suma.
 */
create function public.numara_candidati(payload jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_mod    text := coalesce(payload ->> 'mod', 'exersare');
  v_filtre jsonb := coalesce(payload -> 'filtre', '{}'::jsonb);
  v_total  integer;
  v_pe     jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'neautentificat';
  end if;

  select count(*)::integer into v_total from private.candidati(v_filtre, v_mod);

  select coalesce(jsonb_agg(jsonb_build_object('materie_id', t.materie_id, 'nr', t.nr) order by t.materie_id), '[]'::jsonb)
  into v_pe
  from (
    select c.materie_id, count(*)::integer as nr
    from private.candidati(v_filtre, v_mod) c
    group by c.materie_id
  ) t;

  return jsonb_build_object('total', v_total, 'pe_materie', v_pe);
end;
$$;

-- --------------------------------------------------------------- generarea --

/**
 * Compune lucrarea și o scrie, într-o singură tranzacție.
 *
 * Întoarce lucrarea creată, nu o listă de candidați pe care s-o salveze
 * clientul: între „am ales" și „am salvat" biblioteca se poate schimba, iar
 * instantaneul trebuie să fie atomic.
 *
 * Nu poate da duplicate **prin construcție** — selecția e peste `questions.id`
 * cu `row_number()`, deci o grilă se poate trage o singură dată. Asta
 * înlocuiește `buildOrder`, care repeta banca ciclic (`pool[i % pool.length]`)
 * ca să umple numărul cerut. Cu 6 grile în bancă era un compromis; cu o bancă
 * adevărată e un bug.
 */
create function public.genereaza_test(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_mod       text := coalesce(payload ->> 'mod', 'exersare');
  v_filtre    jsonb := coalesce(payload -> 'filtre', '{}'::jsonb);
  v_nr        integer := coalesce((payload ->> 'nr')::integer, 0);
  v_durata    integer := nullif(payload ->> 'durata_minute', '')::integer;
  v_amgrile   boolean := coalesce((payload ->> 'amesteca_grile')::boolean, true);
  v_amoptiuni boolean := coalesce((payload ->> 'amesteca_optiuni')::boolean, false);
  v_strict    boolean := coalesce((payload ->> 'strict')::boolean, false);
  v_cote      jsonb := coalesce(payload -> 'cote', '[]'::jsonb);
  v_run       uuid := gen_random_uuid();
  -- Sămânța face tragerea explicabilă mai târziu („ce i s-a dat de fapt?"),
  -- ceea ce `random()` nu poate: fiind volatilă, n-ai cum să re-derivi. Nu e
  -- însă mecanismul de reproducere — ordinea rezolvată se scrie pe rânduri.
  v_seed      text := v_run::text;
  -- Un array, nu un tabel temporar: `create temporary table` lasă stare pe
  -- sesiune, iar sesiunile PostgREST se refolosesc din pool. `on commit drop`
  -- acoperă cazul obișnuit, dar două generări în aceeași tranzacție ar cădea cu
  -- „relation already exists" — o defecțiune care apare abia sub încărcare.
  v_alese     text[];
  v_obtinut   integer;
  v_lipsa     jsonb;
begin
  if v_uid is null then
    raise exception 'neautentificat';
  end if;
  if not exists (select 1 from unnest(enum_range(null::public.test_mod)) m where m::text = v_mod) then
    raise exception 'mod_necunoscut' using detail = v_mod;
  end if;
  if v_nr <= 0 and jsonb_array_length(v_cote) = 0 then
    raise exception 'nr_invalid' using detail = v_nr::text;
  end if;

  if jsonb_array_length(v_cote) > 0 then
    -- Cotele pe materie, într-o singură trecere: fereastra partiționează după
    -- materie, deci nu e nevoie nici de buclă, nici de un plan per materie.
    select array_agg(c.id) into v_alese
    from (
      select k.id, k.materie_id,
             row_number() over (
               partition by k.materie_id
               order by pg_catalog.hashtextextended(k.id || v_seed, 0)
             ) as rn
      from private.candidati(v_filtre, v_mod) k
    ) c
    join (
      select x ->> 'materie_id' as materie_id, (x ->> 'nr')::integer as nr
      from jsonb_array_elements(v_cote) x
    ) u on u.materie_id = c.materie_id
    where c.rn <= u.nr;

    v_alese := coalesce(v_alese, '{}'::text[]);

    select coalesce(jsonb_agg(jsonb_build_object('materie_id', u.materie_id, 'lipsa', u.nr - coalesce(a.nr, 0))
                              order by u.materie_id), '[]'::jsonb)
    into v_lipsa
    from (
      select x ->> 'materie_id' as materie_id, (x ->> 'nr')::integer as nr
      from jsonb_array_elements(v_cote) x
    ) u
    left join (
      select q.materie_id, count(*)::integer as nr
      from public.questions q where q.id = any (v_alese) group by q.materie_id
    ) a on a.materie_id = u.materie_id
    where u.nr > coalesce(a.nr, 0);

    v_nr := (select sum((x ->> 'nr')::integer)::integer from jsonb_array_elements(v_cote) x);
  else
    select array_agg(k.id) into v_alese
    from (
      select c.id from private.candidati(v_filtre, v_mod) c
      order by pg_catalog.hashtextextended(c.id || v_seed, 0)
      limit v_nr
    ) k;

    v_alese := coalesce(v_alese, '{}'::text[]);
    v_lipsa := '[]'::jsonb;
  end if;

  v_obtinut := cardinality(v_alese);

  if v_obtinut = 0 then
    raise exception 'fara_candidati' using detail = v_mod;
  end if;
  -- O simulare oficială care trebuie să aibă fix 100 de grile nu poate livra 47.
  -- Restul modurilor livrează mai puțin și **o spun**, în loc să repete grile
  -- ca să umple cifra.
  if v_strict and v_obtinut < v_nr then
    raise exception 'insuficient_strict' using detail = v_obtinut || '/' || v_nr;
  end if;

  insert into public.test_runs (id, user_id, mod, config, ends_at, nr_cerut)
  values (
    v_run, v_uid, v_mod::public.test_mod, payload,
    case when v_durata is null then null else now() + make_interval(mins => v_durata) end,
    -- Numitorul rămâne ce s-a cerut, nu ce s-a obținut: altfel o lucrare
    -- livrată mai scurtă ar umfla tăcut procentul.
    v_nr
  );

  insert into public.test_run_items (run_id, position, question_id, option_order)
  select
    v_run,
    (row_number() over (
      order by case when v_amgrile
                    then pg_catalog.hashtextextended(q.id || v_seed || 'x', 0)
               end,
               q.materie_id, q.chapter_id, q.id
    ) - 1)::smallint,
    q.id,
    -- Regula de amestecare stă pe **tip**, nu pe grilă, și se aplică aici, la
    -- generare. La complementul grupat variantele sunt cheia formatului („1, 2,
    -- 3", „doar 4"), deci amestecarea lor strică grila — iar când ajunge
    -- clientul s-o randeze, ordinea e deja scrisă și paguba e făcută.
    case
      when v_amoptiuni and t.permite_amestecare then (
        select array_agg(o.key order by pg_catalog.hashtextextended(q.id || o.key::text || v_seed, 0))
        from public.question_options o where o.question_id = q.id
      )
      else null
    end
  from public.questions q
  join public.question_types t on t.id = q.tip_id
  where q.id = any (v_alese);

  return jsonb_build_object(
    'run_id', v_run,
    'nr_cerut', v_nr,
    'nr_obtinut', v_obtinut,
    'insuficient', v_obtinut < v_nr,
    'lipsa', v_lipsa
  );
end;
$$;

revoke all on function public.numara_candidati(jsonb) from public, anon;
revoke all on function public.genereaza_test(jsonb)   from public, anon;

grant execute on function public.numara_candidati(jsonb) to authenticated;
grant execute on function public.genereaza_test(jsonb)   to authenticated;
