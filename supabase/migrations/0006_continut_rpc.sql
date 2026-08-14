-- Scrierea conținutului din aplicație.
--
-- De ce RPC și nu două cereri obișnuite prin PostgREST: `questions_correct_exists`
-- (migrarea 0001) e `deferrable initially deferred` — răspunsul corect trebuie să
-- fie printre variantele scrise, verificat la COMMIT. Prin PostgREST fiecare
-- cerere e propria tranzacție, iar cele două tabele se referă circular:
-- `questions` cere o variantă care încă nu există, `question_options` cere o grilă
-- care încă nu există. Nicio ordine de două cereri nu trece. O funcție plpgsql e
-- o singură tranzacție, deci constrângerea se verifică o dată, la final, când
-- ambele părți sunt scrise.
--
-- Ca și `sterge_contul()`, funcțiile astea stau intenționat în schema publicată:
-- sunt RPC-uri scrise ca să fie chemate din client. `anon` nu le poate chema, iar
-- prima instrucțiune din fiecare e verificarea de rol — `security definer`
-- înseamnă că rulează cu drepturi de proprietar, deci poarta trebuie să fie în
-- corpul funcției, nu în politici.

create function public.salveaza_grila(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       text := nullif(btrim(payload ->> 'id'), '');
  v_cap      text := nullif(btrim(payload ->> 'capId'), '');
  v_tip      text := payload ->> 'tip';
  v_status   text := coalesce(payload ->> 'status', 'ciorna');
  v_text     text := nullif(btrim(payload ->> 'text'), '');
  v_expl     text := nullif(btrim(payload ->> 'expl'), '');
  v_src      text := coalesce(btrim(payload ->> 'src'), '');
  v_correct  text := payload ->> 'correct';
  v_opts     jsonb := coalesce(payload -> 'opts', '[]'::jsonb);
  v_enunturi text[];
  v_chei     text[];
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate scrie în bibliotecă';
  end if;

  -- Validările care nu au voie să depindă de client. Formularul le face și el,
  -- dar un formular e o sugestie: cererea poate veni de oriunde cu cheia publică.
  if v_id is null then
    raise exception 'Grila are nevoie de un identificator';
  end if;
  if v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Identificatorul poate conține doar litere mici, cifre și cratime: %', v_id;
  end if;
  if v_text is null then
    raise exception 'Enunțul nu poate fi gol';
  end if;
  if v_expl is null then
    raise exception 'Explicația generală nu poate fi goală';
  end if;
  if v_tip not in ('simplu', 'grupat') then
    raise exception 'Tip necunoscut: %', coalesce(v_tip, 'lipsă');
  end if;
  if v_status not in ('ciorna', 'publicata', 'retrasa') then
    raise exception 'Stare necunoscută: %', v_status;
  end if;
  if not exists (select 1 from public.chapters where id = v_cap) then
    raise exception 'Capitolul nu există: %', coalesce(v_cap, 'lipsă');
  end if;

  -- Variantele. Se cer cel puțin două: o grilă cu un singur răspuns posibil nu e grilă.
  if jsonb_array_length(v_opts) < 2 then
    raise exception 'Grila are nevoie de cel puțin două variante';
  end if;

  select array_agg(o ->> 'key' order by o ->> 'key')
    into v_chei
    from jsonb_array_elements(v_opts) o;

  if exists (
    select 1 from jsonb_array_elements(v_opts) o
    where nullif(btrim(o ->> 'text'), '') is null
  ) then
    raise exception 'Nicio variantă nu poate rămâne fără text';
  end if;

  if array_length(v_chei, 1) <> cardinality(array(select distinct unnest(v_chei))) then
    raise exception 'Variantele au litere duplicate';
  end if;

  if v_correct is null or not (v_correct = any (v_chei)) then
    raise exception 'Răspunsul corect trebuie să fie una dintre variantele scrise';
  end if;

  -- Complementul grupat are exact patru afirmații numerotate; la simplu nu are
  -- ce căuta nimic acolo, deci se golește în loc să rămână de la o editare veche.
  if v_tip = 'grupat' then
    select array_agg(value order by ordinalitate)
      into v_enunturi
      from jsonb_array_elements_text(coalesce(payload -> 'enunturi', '[]'::jsonb))
        with ordinality as t(value, ordinalitate);

    if coalesce(array_length(v_enunturi, 1), 0) <> 4 then
      raise exception 'Complementul grupat are nevoie de exact patru afirmații';
    end if;
  else
    v_enunturi := null;
  end if;

  insert into public.questions (id, chapter_id, tip, status, text, enunturi, correct, expl, src, created_by)
  values (
    v_id, v_cap, v_tip::public.question_tip, v_status::public.question_status,
    v_text, v_enunturi, v_correct::public.option_key, v_expl, v_src, auth.uid()
  )
  on conflict (id) do update set
    chapter_id = excluded.chapter_id,
    tip        = excluded.tip,
    status     = excluded.status,
    text       = excluded.text,
    enunturi   = excluded.enunturi,
    correct    = excluded.correct,
    expl       = excluded.expl,
    src        = excluded.src;

  -- Înlocuire completă, nu diferență: variantele sunt un set mic, iar ștergerea
  -- urmată de inserare e singurul fel în care o variantă scoasă chiar dispare.
  -- Constrângerea pe răspunsul corect e amânată, deci golul de la mijloc e legal.
  delete from public.question_options where question_id = v_id;

  insert into public.question_options (question_id, key, text, why)
  select v_id, (o ->> 'key')::public.option_key, btrim(o ->> 'text'), nullif(btrim(o ->> 'why'), '')
  from jsonb_array_elements(v_opts) o;

  return v_id;
end;
$$;

-- Ștergerea. `attempts.question_id` nu are `on delete`, deci o grilă la care s-a
-- răspuns nu poate pleca — și nici nu trebuie: pe `attempts` se sprijină tot
-- progresul, iar ștergerea unei grile ar rescrie retroactiv istoricul cuiva.
-- Pentru cazul ăsta există `retrasa`: grila iese din fața elevilor, jurnalul rămâne.
create function public.sterge_grila(grila_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate șterge din bibliotecă';
  end if;

  if exists (select 1 from public.attempts where question_id = grila_id) then
    raise exception 'Grila are răspunsuri în istoric — retrage-o în loc să o ștergi';
  end if;

  delete from public.questions where id = grila_id;
end;
$$;

revoke all on function public.salveaza_grila(jsonb) from public, anon;
revoke all on function public.sterge_grila(text)   from public, anon;

grant execute on function public.salveaza_grila(jsonb) to authenticated;
grant execute on function public.sterge_grila(text)    to authenticated;
