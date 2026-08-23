-- Colecția devine entitate, iar lucrările de admitere se mută unde le e locul.
--
-- Migrarea 0008 a adăugat `questions.colectie`, text liber, ca să existe un
-- nivel între „felul materialului" (`sursa`) și citarea de pagină (`src`).
-- Text liber a fost răspunsul corect atunci — nu se știa ce forme ia — dar nu se
-- poate filtra pe el, nu se poate renumi fără un `update` peste tot, și nu are
-- unde să-și țină anul sau proveniența bibliografică. Sunt zero grile care îl
-- folosesc, deci mutarea la un tabel nu costă nimic acum și ar fi costat scump
-- după primul import de o mie de grile.
--
-- **Lucrările de admitere erau modelate ca materie și capitole.** În bază există
-- materia `ant` („Subiecte anterioare") cu 8 „capitole" care sunt de fapt lucrări:
-- `ant-2026-mg` „Admitere UMFCD · Medicină", `ant-2026-simulare` „Simulare
-- oficială · aprilie". `nr` ținea anul. Modelul ăla contrazice ce scrie în
-- `questions.ts`: o grilă dintr-un subiect oficial ține în continuare de un
-- capitol **real** de conținut, ca să poată fi filtrată și pe materie, și pe
-- proveniență. O lucrare nu e un capitol; e o colecție.
--
-- Se face acum fiindcă e gratis: cele 8 capitole n-au nicio grilă, nicio notiță
-- și nicio sesiune care să le pomenească — verificat înainte. După prima grilă
-- scrisă pe ele, dezlipirea ar fi fost o migrare de conținut.

create type colectie_tip as enum ('subiect_oficial', 'simulare_oficiala', 'culegere', 'autor');

create table colectii (
  id                  text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Null la o culegere: o carte nu ține de un centru de admitere.
  centru_id           text references centre_admitere (id) on update cascade,
  nume                text not null check (length(btrim(nume)) > 0),
  tip                 colectie_tip not null,
  an                  smallint check (an is null or an between 2000 and 2100),
  -- Cartea și ediția, pentru întrebarea de drepturi care vine înaintea plății.
  sursa_bibliografica text not null default '',
  publicat            boolean not null default true,
  position            smallint not null default 0,
  created_at          timestamptz not null default now()
);

create index colectii_centru_idx on colectii (centru_id, position);

-- Lucrările, mutate din capitole. `nr` ținea anul, iar numele spune singur dacă
-- e simulare sau lucrare de admitere — de aici tipul.
insert into colectii (id, centru_id, nume, tip, an, position)
select
  'umfcd-' || substring(c.id from 5),
  'umfcd',
  c.name || ' · ' || c.nr,
  case when c.name ilike '%simulare%' then 'simulare_oficiala'::colectie_tip
       else 'subiect_oficial'::colectie_tip end,
  nullif(c.nr, '')::smallint,
  c.position
from chapters c
where c.materie_id = 'ant';

-- Pe un proiect proaspăt (seed.sql) materia `ant` nu există, deci cele două
-- ștergeri de mai jos nu ating nimic. Pe cel real scot exact cele 8 capitole
-- convertite mai sus, plus materia care le ținea.
delete from chapters where materie_id = 'ant';
delete from materii where id = 'ant';

alter table questions add column colectie_id text references colectii (id) on update cascade;
create index questions_colectie_id_idx on questions (colectie_id, id) where colectie_id is not null;

-- Indexul pe textul liber nu mai are ce servi.
drop index if exists questions_colectie_idx;

alter table colectii enable row level security;

create policy colectii_citire on colectii
  for select to authenticated
  using (publicat or private.is_admin());

create policy colectii_scriere on colectii
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Aceeași funcție ca în migrarea 0010, cu `colectie` înlocuită de `colectie_id`.
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
  v_colectie text := nullif(btrim(payload ->> 'colectie'), '');
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

  -- Colecția e opțională, dar dacă e dată trebuie să existe: altfel o greșeală
  -- de tipar ar crea tăcut un lot fantomă, invizibil în orice filtru.
  if v_colectie is not null and not exists (select 1 from public.colectii where id = v_colectie) then
    raise exception 'Colecția nu există: %', v_colectie;
  end if;

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

  if v_t.sablon_optiuni is not null then
    select array_agg(btrim(o ->> 'text') order by o ->> 'key')
      into v_texte
      from jsonb_array_elements(v_opts) o;

    if v_texte is distinct from v_t.sablon_optiuni then
      raise exception 'Tipul „%" are variante fixe: %',
        v_t.nume, array_to_string(v_t.sablon_optiuni, ' / ');
    end if;
  end if;

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
    (id, chapter_id, tip, tip_id, status, text, enunturi, correct, expl, src, sursa, an, colectie_id, created_by)
  values (
    v_id, v_cap,
    case when v_tip in ('simplu', 'grupat') then v_tip::public.question_tip else null end,
    v_tip,
    v_status::public.question_status,
    v_text, v_enunturi, v_correct::public.option_key, v_expl, v_src,
    v_sursa::public.question_sursa, v_an, v_colectie, auth.uid()
  )
  on conflict (id) do update set
    chapter_id  = excluded.chapter_id,
    tip         = excluded.tip,
    tip_id      = excluded.tip_id,
    status      = excluded.status,
    text        = excluded.text,
    enunturi    = excluded.enunturi,
    correct     = excluded.correct,
    expl        = excluded.expl,
    src         = excluded.src,
    sursa       = excluded.sursa,
    an          = excluded.an,
    colectie_id = excluded.colectie_id;

  delete from public.question_options where question_id = v_id;

  insert into public.question_options (question_id, key, text, why)
  select v_id, (o ->> 'key')::public.option_key, btrim(o ->> 'text'), nullif(btrim(o ->> 'why'), '')
  from jsonb_array_elements(v_opts) o;

  return v_id;
end;
$$;
