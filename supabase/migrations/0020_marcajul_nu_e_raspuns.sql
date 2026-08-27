-- Un semn pus pe o grilă nu e un răspuns.
--
-- `raspunde` e singurul drum spre `marked`, iar la exersare dezvăluia
-- necondiționat: `revealed = revealed or v_verific`, cu `v_verific` mereu
-- adevărat în afara simulării. Deci un `raspunde` cu `aleasa: null` — exact
-- forma pe care o trimite butonul „marchează grila" pentru o grilă neatinsă —
-- făcea două lucruri deodată, amândouă greșite:
--
-- 1. **Trimitea răspunsul corect.** Ramura de răspuns se întoarce ori de câte
--    ori `v_verific`, deci `correct`, `expl` și `why` plecau spre client pentru
--    o grilă la care elevul nu răspunsese. Chiar regula pentru care motorul a
--    fost mutat pe server — răspunsul ajunge abia după ce a fost câștigat.
--
-- 2. **Închidea grila definitiv.** Rândul rămânea `revealed` cu `chosen` null,
--    iar jurnalul nu primea nimic (inserarea e păzită de `v_aleasa is not
--    null`). La următoarea încercare de a răspunde, garda de „grilă închisă"
--    ridica `raspuns_blocat`. Grila ieșea din lucrare fără urmă, în tăcere.
--
-- Nimic nu chema încă funcția cu `aleasa: null` — ecranul de lucrare e prima
-- bucată de client care o face — deci nu e nimic de reparat în date.
--
-- Dezvăluirea ține de răspuns, nu de atingerea rândului: `v_dezvaluie` e acum
-- „modul verifică pe loc **și** chiar s-a ales o variantă", și e aceeași
-- condiție și pentru ce se scrie, și pentru ce se întoarce.

create or replace function public.raspunde(payload jsonb)
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
  v_dezvaluie boolean;
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
  --
  -- `is distinct from` lasă să treacă tocmai marcarea unei grile deja
  -- verificate: clientul retrimite varianta aleasă neschimbată, deci semnul se
  -- poate pune și scoate după verificare.
  if v_item.revealed and v_aleasa is distinct from v_item.chosen then
    raise exception 'raspuns_blocat' using detail = v_poz::text;
  end if;

  select * into v_q from public.questions q where q.id = v_item.question_id;

  -- Exersarea verifică grilă cu grilă; simularea, niciodată înainte de predare.
  v_verific := v_run.mod not in ('simulare', 'test_predefinit');
  -- Dar verificarea are ce verifica doar dacă s-a ales ceva.
  v_dezvaluie := v_verific and v_aleasa is not null;
  v_corect  := v_aleasa is not null and v_q.id is not null and v_aleasa = v_q.correct;

  update public.test_run_items
  set chosen      = v_aleasa,
      marked      = coalesce(v_marcata, marked),
      revealed    = revealed or v_dezvaluie,
      answered_at = case when v_aleasa is null then answered_at else now() end
  where run_id = v_run_id and position = v_poz;

  update public.test_runs set qi = greatest(qi, v_poz) where id = v_run_id;

  if v_dezvaluie and v_q.id is not null then
    -- `client_key` e '<lucrare>:<poziție>', deci un retry după o întrerupere de
    -- rețea nu poate dubla jurnalul. Contractul e neschimbat față de client.
    insert into public.attempts (user_id, question_id, chosen, is_correct, source, run_id, client_key)
    values (v_uid, v_q.id, v_aleasa, v_corect, private.sursa_pentru(v_run.mod), v_run_id,
            v_run_id::text || ':' || v_poz::text)
    on conflict (client_key) do nothing;
  end if;

  if not v_dezvaluie then
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
