-- Tipul unei grile devine dată, nu valoare de enum plus o ramură în cod.
--
-- `question_tip` are două valori, iar fiecare format nou ar fi cerut un
-- `alter type ... add value` (care nu se poate da înapoi și are restricții în
-- tranzacție), plus o ramură nouă în `salveaza_grila`, plus una la randare, plus
-- una la validare. Un tabel le înlocuiește pe toate: un format nou e un `insert`.
--
-- Ce descrie tabelul, și de ce fiecare coloană e acolo:
--
-- `sablon_optiuni` — la complementul grupat, textele variantelor **nu sunt
-- conținut**, sunt cheia fixă a formatului: A = „1, 2, 3", B = „1, 3", C = „2, 4",
-- D = „doar 4", E = „toate". Toate cele 110 grile grupate din bază le au
-- identice, verificat rând cu rând înainte de migrarea asta. Fiind fixe, sunt și
-- poziționale — de unde a doua coloană.
--
-- `permite_amestecare` — dacă variantele pot fi amestecate la generarea unui
-- test. Stă pe **tip**, nu pe grilă: coruperea e o proprietate a formatului, iar
-- un boolean per grilă ar fi 110 ocazii de a-l pune greșit. Fals implicit, ca un
-- format adăugat de cineva care nu s-a gândit la amestecare să fie corect.

create table question_types (
  id                 text primary key check (id ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  nume               text not null check (length(btrim(nume)) > 0),
  descriere          text not null default '',
  -- Non-null înseamnă „textele variantelor sunt fixe și poziționale".
  sablon_optiuni     text[],
  nr_optiuni_min     smallint not null default 2,
  nr_optiuni_max     smallint not null default 5,
  permite_amestecare boolean not null default false,
  cere_enunturi      boolean not null default false,
  nr_enunturi        smallint,
  -- Vocabular mic, închis, pe care clientul îl mapează la o componentă. Un tip
  -- necunoscut cade pe „lista", deci se randează simplu, nu gol.
  hint_randare       text not null default 'lista',
  activ              boolean not null default true,
  position           smallint not null default 0,
  created_at         timestamptz not null default now(),

  constraint qt_optiuni_coerent check (nr_optiuni_min between 2 and 5 and nr_optiuni_max between nr_optiuni_min and 5),
  constraint qt_enunturi_coerent check (cere_enunturi = (nr_enunturi is not null)),
  -- Garanția structurală din spatele siguranței la amestecare: un tip cu șablon
  -- fix nu **poate** permite amestecarea. E constrângere, nu convenție.
  constraint qt_sablon_fix check (
    sablon_optiuni is null
    or (
      not permite_amestecare
      and cardinality(sablon_optiuni) between nr_optiuni_min and nr_optiuni_max
    )
  )
);

insert into question_types
  (id, nume, descriere, sablon_optiuni, nr_optiuni_min, nr_optiuni_max,
   permite_amestecare, cere_enunturi, nr_enunturi, hint_randare, position)
values
  ('simplu', 'Complement simplu',
   'Cinci variante, un singur răspuns corect.',
   null, 2, 5, true, false, null, 'lista', 0),
  ('grupat', 'Complement grupat',
   'Patru afirmații numerotate; varianta corectă e combinația lor.',
   array['1, 2, 3', '1, 3', '2, 4', 'doar 4', 'toate'], 5, 5, false, true, 4, 'enunturi_numerotate', 1);

alter table questions add column tip_id text references question_types (id) on update cascade;
update questions set tip_id = tip::text;
alter table questions alter column tip_id set not null;

create index questions_tip_idx on questions (tip_id) where status = 'publicata';

-- `tip` rămâne o vreme, ca un client deja livrat să nu se strice între migrare și
-- deploy, dar devine opțional: un tip nou n-are ce valoare de enum să scrie
-- acolo, iar asta e chiar rostul mutării. `salveaza_grila` îl completează cât
-- timp id-ul se potrivește cu una dintre cele două valori istorice.
alter table questions alter column tip drop not null;

alter table question_types enable row level security;

create policy question_types_citire on question_types
  for select to authenticated
  using (activ or private.is_admin());

create policy question_types_scriere on question_types
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Aceeași funcție ca în migrarea 0008, cu validările de format citite din
-- `question_types` în loc să fie scrise în ea.
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
  v_texte    text[];
  v_t        public.question_types%rowtype;
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

  select * into v_t from public.question_types where id = v_tip and activ;
  if not found then
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

  -- Câte variante cere tipul, nu un „cel puțin două" scris o dată pentru toate.
  if jsonb_array_length(v_opts) not between v_t.nr_optiuni_min and v_t.nr_optiuni_max then
    raise exception 'Tipul „%" cere între % și % variante, s-au trimis %',
      v_t.nume, v_t.nr_optiuni_min, v_t.nr_optiuni_max, jsonb_array_length(v_opts);
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

  -- Un tip cu șablon fix are textele variantelor prescrise de format. Ele nu
  -- sunt conținut, deci nu se lasă rescrise dintr-un formular sau dintr-un import.
  if v_t.sablon_optiuni is not null then
    select array_agg(btrim(o ->> 'text') order by o ->> 'key')
      into v_texte
      from jsonb_array_elements(v_opts) o;

    if v_texte is distinct from v_t.sablon_optiuni then
      raise exception 'Tipul „%" are variante fixe: %',
        v_t.nume, array_to_string(v_t.sablon_optiuni, ' / ');
    end if;
  end if;

  -- Afirmațiile numerotate, câte cere tipul. La un tip care nu le cere se
  -- golesc, în loc să rămână de la o editare veche.
  if v_t.cere_enunturi then
    select array_agg(value order by ordinalitate)
      into v_enunturi
      from jsonb_array_elements_text(coalesce(payload -> 'enunturi', '[]'::jsonb))
        with ordinality as t(value, ordinalitate);

    if coalesce(array_length(v_enunturi, 1), 0) <> v_t.nr_enunturi then
      raise exception 'Tipul „%" are nevoie de exact % afirmații', v_t.nume, v_t.nr_enunturi;
    end if;
  else
    v_enunturi := null;
  end if;

  insert into public.questions
    (id, chapter_id, tip, tip_id, status, text, enunturi, correct, expl, src, sursa, an, colectie, created_by)
  values (
    v_id, v_cap,
    -- Doar cele două valori istorice au pereche în enum; un tip nou scrie null,
    -- iar clientul nou citește oricum `tip_id`.
    case when v_tip in ('simplu', 'grupat') then v_tip::public.question_tip else null end,
    v_tip,
    v_status::public.question_status,
    v_text, v_enunturi, v_correct::public.option_key, v_expl, v_src,
    v_sursa::public.question_sursa, v_an, v_colectie, auth.uid()
  )
  on conflict (id) do update set
    chapter_id = excluded.chapter_id,
    tip        = excluded.tip,
    tip_id     = excluded.tip_id,
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
