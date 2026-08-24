-- Citirea lucrării, răspunsul și predarea.
--
-- Cu 0017 lucrarea se compune pe server. Trei funcții o fac și rezolvabilă, iar
-- una dintre ele închide o gaură veche.
--
-- **Corectarea se mută pe server.** Azi `src/lib/attempts.ts` calculează
-- `is_correct: chosen === question.correct` în browser și trimite rezultatul, iar
-- `attempts_inserare_proprii` verifică doar `user_id = auth.uid()`. Adică oricine
-- are cheia publicabilă poate insera oricâte răspunsuri corecte vrea, iar toată
-- logica anti-inflație din `progres.ts` se sprijină pe un boolean pe care îl
-- alege clientul. A muta *selecția* pe server și a lăsa *corectarea* în client ar
-- fi jumătatea greșită a mutării: fiecare cifră de stăpânire ar rămâne o părere.
-- `raspunde` compară cu `questions.correct` și scrie ea `is_correct`.
--
-- **Răspunsurile corecte nu mai vin toate deodată.** `citeste_test` trimite
-- `correct`, `expl` și `why` **numai** pentru grilele deja verificate, sau după
-- predare. Regula e una singură, fără ramuri pe mod: la exersare verifici grilă
-- cu grilă, deci le primești pe rând; la simulare nu verifici nimic până la
-- predare, deci nu primești nimic.
--
-- Atenție însă la ce **nu** face asta: `questions` conține tot coloana `correct`,
-- iar RLS filtrează rânduri, nu coloane, deci un `select id, correct from
-- questions` merge în continuare. Închiderea reală e `revoke` pe coloană, cu
-- ordinea ei strictă de livrare. Ce se câștigă aici e că răspunsul nu mai e
-- *trimis*; că nu mai poate fi *cerut* rămâne felia următoare.
--
-- ---------------------------------------------------------------------------
--
-- Expirarea încheie lucrarea fără s-o piardă: `finished_at` efectiv e
-- `finished_at`, iar dacă lipsește și timpul a trecut, `ends_at`. Așa iese
-- același rezultat și după o reîncărcare, exact ca în `useSimulare`.
--
-- Jurnalul primește **doar grilele la care s-a răspuns**, ca azi. Constrângerea
-- `attempts_chosen_or_blank` permite și un rând cu `chosen` null — o
-- nepredare — și ar fi date bune („câte lași goale sub presiune"), dar
-- înregistrarea lor ar schimba retroactiv ce numără `progres.ts`: nepredările ar
-- intra în `grileIncercate` și ar coborî procentul de corectitudine. E o
-- schimbare de statistici, nu de mecanism, deci se ia separat și deliberat.

-- --------------------------------------------------- predarea, efectiv --

-- `stable`, nu `immutable`, deși arată ca o funcție pură: citește `now()`.
-- Postgres nu verifică declarația, o crede — iar un `immutable` mincinos poate
-- fi pliat la o constantă în planul interogării, adică o lucrare care rămâne
-- „neexpirată" cât ține planul.
create function private.predata_la(r public.test_runs)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select coalesce(r.finished_at, case when r.ends_at is not null and r.ends_at <= now() then r.ends_at end);
$$;

revoke all on function private.predata_la(public.test_runs) from public, anon, authenticated;

-- Modurile noi sunt mai multe decât valorile lui `attempt_source`, care e citit
-- și de `statistici.ts`. Se mapează, nu se extinde enum-ul: o valoare nouă acolo
-- ar cere și o coloană nouă în Statistici, adică o schimbare de ecran strecurată
-- într-o migrare.
--
-- „Greșeli" merge la `recapitulare` fiindcă asta și e: repetare a ce n-a ținut.
create function private.sursa_pentru(m public.test_mod)
returns public.attempt_source
language sql
immutable
set search_path = ''
as $$
  select case m
    when 'simulare'        then 'simulare'
    when 'test_predefinit' then 'simulare'
    when 'recapitulare'    then 'recapitulare'
    when 'greseli'         then 'recapitulare'
    else 'sesiune'
  end::public.attempt_source;
$$;

revoke all on function private.sursa_pentru(public.test_mod) from public, anon, authenticated;

-- ------------------------------------------------------------- citirea --

/**
 * Lucrarea, cu tot ce trebuie ca să fie randată.
 *
 * O grilă ștearsă între timp din bibliotecă rămâne o poziție cu câmpuri goale,
 * nu dispare: altfel s-ar renumerota tot ce urmează, iar răspunsurile sunt
 * cheiate pe poziție. `GrilaLipsa` randează deja cazul ăsta în client.
 */
create function public.citeste_test(run_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_run  public.test_runs;
  v_gata timestamptz;
begin
  if v_uid is null then
    raise exception 'neautentificat';
  end if;

  select * into v_run from public.test_runs r where r.id = citeste_test.run_id and r.user_id = v_uid;
  if v_run.id is null then
    raise exception 'lucrare_inexistenta' using detail = citeste_test.run_id::text;
  end if;

  v_gata := private.predata_la(v_run);

  return jsonb_build_object(
    'run', jsonb_build_object(
      'id', v_run.id,
      'mod', v_run.mod,
      'config', v_run.config,
      'started_at', v_run.started_at,
      'ends_at', v_run.ends_at,
      'finished_at', v_gata,
      'qi', v_run.qi,
      'nr_cerut', v_run.nr_cerut
    ),
    'grile', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'position', i.position,
          'question_id', i.question_id,
          'chosen', i.chosen,
          'revealed', i.revealed,
          'marked', i.marked,
          'answered_at', i.answered_at,
          'option_order', i.option_order,
          'text', q.text,
          'enunturi', q.enunturi,
          'tip_id', q.tip_id,
          'chapter_id', q.chapter_id,
          'optiuni', case when q.id is null then null else (
            select jsonb_agg(jsonb_build_object('key', o.key, 'text', o.text) order by o.key)
            from public.question_options o where o.question_id = q.id
          ) end
        )
        -- Singurul loc unde răspunsul corect trece granița, și numai după ce a
        -- fost câștigat: grila verificată, sau lucrarea predată.
        || case when q.id is not null and (v_gata is not null or i.revealed)
             then jsonb_build_object(
               'correct', q.correct,
               'expl', q.expl,
               'why', coalesce((
                 select jsonb_object_agg(o.key, o.why)
                 from public.question_options o
                 where o.question_id = q.id and o.why is not null
               ), '{}'::jsonb)
             )
             else '{}'::jsonb
           end
        order by i.position
      )
      from public.test_run_items i
      left join public.questions q on q.id = i.question_id
      where i.run_id = v_run.id
    ), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------ răspunsul --

/**
 * Un răspuns, corectat pe server.
 *
 * La exersare răspunsul se verifică pe loc: se blochează, intră în jurnal și
 * primești explicația. La simulare doar se înregistrează — se poate schimba până
 * la predare, iar jurnalul se scrie atunci, dintr-o dată.
 */
create function public.raspunde(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_run_id  uuid := (payload ->> 'run_id')::uuid;
  v_poz     smallint := (payload ->> 'pozitie')::smallint;
  v_aleasa  public.option_key := nullif(payload ->> 'aleasa', '')::public.option_key;
  v_marcata boolean := (payload ->> 'marcata')::boolean;
  v_run     public.test_runs;
  v_item    public.test_run_items;
  v_q       public.questions;
  v_verific boolean;
  v_corect  boolean;
begin
  if v_uid is null then
    raise exception 'neautentificat';
  end if;

  select * into v_run from public.test_runs r where r.id = v_run_id and r.user_id = v_uid;
  if v_run.id is null then
    raise exception 'lucrare_inexistenta' using detail = coalesce(v_run_id::text, 'lipsă');
  end if;
  if private.predata_la(v_run) is not null then
    raise exception 'lucrare_predata' using detail = v_run_id::text;
  end if;

  select * into v_item from public.test_run_items i where i.run_id = v_run_id and i.position = v_poz;
  if v_item.run_id is null then
    raise exception 'pozitie_inexistenta' using detail = v_poz::text;
  end if;
  -- La exersare, o grilă verificată e închisă. Fără asta, „am greșit, mai
  -- încerc o dată" ar rescrie jurnalul și ar umfla stăpânirea.
  if v_item.revealed and v_aleasa is distinct from v_item.chosen then
    raise exception 'raspuns_blocat' using detail = v_poz::text;
  end if;

  select * into v_q from public.questions q where q.id = v_item.question_id;

  -- Exersarea verifică grilă cu grilă; simularea, niciodată înainte de predare.
  v_verific := v_run.mod not in ('simulare', 'test_predefinit');
  v_corect  := v_aleasa is not null and v_q.id is not null and v_aleasa = v_q.correct;

  update public.test_run_items
  set chosen      = v_aleasa,
      marked      = coalesce(v_marcata, marked),
      revealed    = revealed or v_verific,
      answered_at = case when v_aleasa is null then answered_at else now() end
  where run_id = v_run_id and position = v_poz;

  update public.test_runs set qi = greatest(qi, v_poz) where id = v_run_id;

  if v_verific and v_aleasa is not null and v_q.id is not null then
    -- `client_key` e '<lucrare>:<poziție>', deci un retry după o întrerupere de
    -- rețea nu poate dubla jurnalul. Contractul e neschimbat față de client.
    insert into public.attempts (user_id, question_id, chosen, is_correct, source, run_id, client_key)
    values (v_uid, v_q.id, v_aleasa, v_corect, private.sursa_pentru(v_run.mod), v_run_id,
            v_run_id::text || ':' || v_poz::text)
    on conflict (client_key) do nothing;
  end if;

  if not v_verific then
    return jsonb_build_object('inregistrat', true);
  end if;

  return jsonb_build_object(
    'inregistrat', true,
    'corect', v_corect,
    'correct', v_q.correct,
    'expl', v_q.expl,
    'why', coalesce((
      select jsonb_object_agg(o.key, o.why)
      from public.question_options o where o.question_id = v_q.id and o.why is not null
    ), '{}'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------- predarea --

/**
 * Predă lucrarea și întoarce scorul.
 *
 * Idempotentă: a doua chemare întoarce același rezultat fără să rescrie nimic —
 * `finish()` din client are deja aceeași proprietate, și din același motiv (un
 * dublu clic n-are voie să miște ora predării).
 *
 * Scorul se **calculează**, nu se stochează. Momentul în care ar exista o
 * coloană `scor` e momentul în care poate să nu mai fie de acord cu jurnalul.
 */
create function public.preda_test(run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_run    public.test_runs;
  v_gata   timestamptz;
  v_corecte integer;
  v_gresite integer;
begin
  if v_uid is null then
    raise exception 'neautentificat';
  end if;

  select * into v_run from public.test_runs r where r.id = preda_test.run_id and r.user_id = v_uid;
  if v_run.id is null then
    raise exception 'lucrare_inexistenta' using detail = preda_test.run_id::text;
  end if;

  v_gata := private.predata_la(v_run);
  if v_gata is null then
    v_gata := now();
    update public.test_runs set finished_at = v_gata where id = v_run.id;
  elsif v_run.finished_at is null then
    -- A expirat fără să apese nimeni: ora predării e ora expirării, nu acum.
    update public.test_runs set finished_at = v_gata where id = v_run.id;
  end if;

  insert into public.attempts (user_id, question_id, chosen, is_correct, source, run_id, client_key, answered_at)
  select v_uid, q.id, i.chosen, i.chosen = q.correct, private.sursa_pentru(v_run.mod), v_run.id,
         v_run.id::text || ':' || i.position::text, coalesce(i.answered_at, v_gata)
  from public.test_run_items i
  join public.questions q on q.id = i.question_id
  where i.run_id = v_run.id and i.chosen is not null
  on conflict (client_key) do nothing;

  select
    count(*) filter (where i.chosen is not null and i.chosen = q.correct),
    count(*) filter (where i.chosen is not null and i.chosen <> q.correct)
  into v_corecte, v_gresite
  from public.test_run_items i
  left join public.questions q on q.id = i.question_id
  where i.run_id = v_run.id;

  return jsonb_build_object(
    'run_id', v_run.id,
    'finished_at', v_gata,
    'nr_cerut', v_run.nr_cerut,
    'corecte', v_corecte,
    'gresite', v_gresite,
    -- Numitorul e ce s-a cerut, nu ce s-a răspuns: nedatele contează împotrivă,
    -- exact ca `score` din `useSession`.
    'pct', round(v_corecte::numeric * 100 / v_run.nr_cerut)
  );
end;
$$;

-- --------------------------------------------------- citirea de administrator --

/**
 * O grilă întreagă, pentru editorul din Administrare.
 *
 * Există înaintea nevoii ei: când `correct`, `expl` și `why` vor fi revocate la
 * nivel de coloană, editorul le-ar pierde odată cu elevul. Acordarea pe coloană
 * e la nivel de rol de bază de date, iar „administrator" e un rol al aplicației
 * (`profiles.role`), deci nu există un rol căruia să i se acorde — de aceea
 * drumul administratorului trebuie să fie o funcție `security definer`, scrisă
 * și testată înainte de revocare, nu odată cu ea.
 */
create function public.citeste_grila_admin(grila_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q public.questions;
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate citi grila întreagă';
  end if;

  select * into v_q from public.questions q where q.id = grila_id;
  if v_q.id is null then
    raise exception 'Grila nu există: %', coalesce(grila_id, 'lipsă');
  end if;

  return jsonb_build_object(
    'id', v_q.id,
    'chapter_id', v_q.chapter_id,
    'tip_id', v_q.tip_id,
    'status', v_q.status,
    'text', v_q.text,
    'enunturi', v_q.enunturi,
    'correct', v_q.correct,
    'expl', v_q.expl,
    'src', v_q.src,
    'sursa', v_q.sursa,
    'an', v_q.an,
    'colectie_id', v_q.colectie_id,
    'dificultate', v_q.dificultate,
    'acces', v_q.acces,
    'optiuni', coalesce((
      select jsonb_agg(jsonb_build_object('key', o.key, 'text', o.text, 'why', o.why) order by o.key)
      from public.question_options o where o.question_id = v_q.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.citeste_test(uuid)         from public, anon;
revoke all on function public.raspunde(jsonb)            from public, anon;
revoke all on function public.preda_test(uuid)           from public, anon;
revoke all on function public.citeste_grila_admin(text)  from public, anon;

grant execute on function public.citeste_test(uuid)        to authenticated;
grant execute on function public.raspunde(jsonb)           to authenticated;
grant execute on function public.preda_test(uuid)          to authenticated;
grant execute on function public.citeste_grila_admin(text) to authenticated;
