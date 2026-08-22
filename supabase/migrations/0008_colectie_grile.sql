-- Colecția din care vine grila: eticheta lotului, nu pagina.
--
-- `sursa` spune *ce fel* de material e (curriculum, subiect oficial, culegere) și
-- e o listă închisă, verificată de bază. `src` era deja acolo, dar cele 181 de
-- grile scrise îl folosesc ca referință de pagină — „Celula, p. 11" —, deci una
-- per câteva grile: e citarea, nu proveniența. Lipsea nivelul dintre ele, cel
-- după care se grupează efectiv un import: „Simulare 2026 UMFCD", „Corint –
-- Sistemul nervos". Ăsta e `colectie`.
--
-- Text liber, nu a doua listă închisă: colecțiile apar pe măsură ce se
-- digitizează material, iar o migrare per culegere nouă ar opri scrisul. Gol
-- înseamnă „nespus", ca la `src` — `not null default ''` scutește fiecare
-- cititor de o ramură pentru null.
alter table questions add column colectie text not null default '';

-- Administrarea filtrează pe colecție, iar biblioteca ajunge la câteva mii de rânduri.
create index questions_colectie_idx on questions (colectie) where colectie <> '';

-- Aceeași funcție ca în migrarea 0007, extinsă să citească `colectie` din payload.
create or replace function public.salveaza_grila(payload jsonb)
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
  v_sursa    text := coalesce(payload ->> 'sursa', 'materie');
  v_colectie text := coalesce(btrim(payload ->> 'colectie'), '');
  v_an       smallint := nullif(payload ->> 'an', '')::smallint;
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
  if v_sursa not in ('materie', 'subiect_oficial', 'culegere') then
    raise exception 'Sursă necunoscută: %', v_sursa;
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

  insert into public.questions (id, chapter_id, tip, status, text, enunturi, correct, expl, src, sursa, an, colectie, created_by)
  values (
    v_id, v_cap, v_tip::public.question_tip, v_status::public.question_status,
    v_text, v_enunturi, v_correct::public.option_key, v_expl, v_src,
    v_sursa::public.question_sursa, v_an, v_colectie, auth.uid()
  )
  on conflict (id) do update set
    chapter_id = excluded.chapter_id,
    tip        = excluded.tip,
    status     = excluded.status,
    text       = excluded.text,
    enunturi   = excluded.enunturi,
    correct    = excluded.correct,
    expl       = excluded.expl,
    src        = excluded.src,
    sursa      = excluded.sursa,
    an         = excluded.an,
    colectie   = excluded.colectie;

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
