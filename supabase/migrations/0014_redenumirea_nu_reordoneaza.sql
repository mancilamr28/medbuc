-- O redenumire nu e o reordonare, și nici o ștergere de câmpuri.
--
-- Migrarea 0013 citea fiecare câmp cu `coalesce(payload ->> 'x', <implicit>)`,
-- deci o cheie absentă însemna „pune valoarea implicită". Pentru un formular de
-- redenumire asta e exact pe dos: el trimite ce a schimbat utilizatorul și
-- **nu are de unde ști restul** — `Chapter`, `Materie` și `Colectie` consumă
-- `position` la sortare și n-o mai poartă pe obiect. Rezultatul se vedea pe
-- ecran: orice corectare de titlu muta rândul în capul listei (toate trei se
-- citesc `order by position`), iar redenumirea unei colecții îi pierdea anul și
-- cartea din care vine.
--
-- Regula nouă, aceeași peste tot: **o cheie absentă înseamnă „las-o cum e"**.
-- La un rând nou se aplică implicitul, iar poziția se calculează — `max + 1`,
-- adică la coadă — în loc să fie numărată de client, care oricum greșea când
-- pozițiile aveau goluri.
--
-- `an`, `centruId` și `sursaBibliografica` se citesc cu `jsonb_exists`, nu cu
-- `coalesce`: pentru ele „trimis explicit null" chiar înseamnă ceva (o culegere
-- fără an, o colecție care nu ține de un centru), iar `coalesce` nu poate
-- distinge asta de o cheie absentă.

create or replace function public.salveaza_materie(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       text := nullif(btrim(payload ->> 'id'), '');
  v_nume     text := nullif(btrim(payload ->> 'nume'), '');
  v_vechi    public.materii%rowtype;
  v_centru   text;
  v_pozitie  smallint;
  v_publicat boolean;
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate schimba materiile';
  end if;
  if v_id is null or v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Identificatorul poate conține doar litere mici, cifre și cratime: %', coalesce(v_id, 'lipsă');
  end if;

  select * into v_vechi from public.materii where id = v_id;

  v_nume := coalesce(v_nume, v_vechi.name);
  if v_nume is null then
    raise exception 'Materia are nevoie de un nume';
  end if;

  v_centru := coalesce(nullif(btrim(payload ->> 'centruId'), ''), v_vechi.centru_id, 'umfcd');
  if not exists (select 1 from public.centre_admitere where id = v_centru) then
    raise exception 'Centrul nu există: %', v_centru;
  end if;

  v_pozitie := coalesce(
    (payload ->> 'position')::smallint,
    v_vechi.position,
    (select coalesce(max(position), -1) + 1 from public.materii)
  );
  v_publicat := coalesce((payload ->> 'publicat')::boolean, v_vechi.publicat, true);

  insert into public.materii (id, name, unit, position, publicat, centru_id)
  values (v_id, v_nume, 'grile', v_pozitie, v_publicat, v_centru)
  on conflict (id) do update set
    name      = excluded.name,
    position  = excluded.position,
    publicat  = excluded.publicat,
    centru_id = excluded.centru_id;

  return v_id;
end;
$$;

create or replace function public.salveaza_capitol(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       text := nullif(btrim(payload ->> 'id'), '');
  v_nume     text := nullif(btrim(payload ->> 'nume'), '');
  v_vechi    public.chapters%rowtype;
  v_materie  text;
  v_nr       text;
  v_pozitie  smallint;
  v_publicat boolean;
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate schimba capitolele';
  end if;
  if v_id is null or v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Identificatorul poate conține doar litere mici, cifre și cratime: %', coalesce(v_id, 'lipsă');
  end if;

  select * into v_vechi from public.chapters where id = v_id;

  v_nume := coalesce(v_nume, v_vechi.name);
  if v_nume is null then
    raise exception 'Capitolul are nevoie de un nume';
  end if;

  v_materie := coalesce(nullif(btrim(payload ->> 'materieId'), ''), v_vechi.materie_id);
  if not exists (select 1 from public.materii where id = v_materie) then
    raise exception 'Materia nu există: %', coalesce(v_materie, 'lipsă');
  end if;

  -- Mutarea unui capitol cu grile în altă materie ar rescrie retroactiv la ce
  -- materie a răspuns elevul. Numele se poate corecta oricând; apartenența, nu.
  if v_vechi.materie_id is not null
     and v_vechi.materie_id <> v_materie
     and exists (select 1 from public.questions where chapter_id = v_id) then
    raise exception 'Capitolul are grile scrise — nu se mai poate muta din materia %', v_vechi.materie_id;
  end if;

  v_nr := coalesce(btrim(payload ->> 'nr'), v_vechi.nr, '');
  v_pozitie := coalesce(
    (payload ->> 'position')::smallint,
    v_vechi.position,
    (select coalesce(max(position), -1) + 1 from public.chapters where materie_id = v_materie)
  );
  v_publicat := coalesce((payload ->> 'publicat')::boolean, v_vechi.publicat, true);

  insert into public.chapters (id, materie_id, nr, name, position, publicat)
  values (v_id, v_materie, v_nr, v_nume, v_pozitie, v_publicat)
  on conflict (id) do update set
    materie_id = excluded.materie_id,
    nr         = excluded.nr,
    name       = excluded.name,
    position   = excluded.position,
    publicat   = excluded.publicat;

  return v_id;
end;
$$;

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
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate schimba colecțiile';
  end if;
  if v_id is null or v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Identificatorul poate conține doar litere mici, cifre și cratime: %', coalesce(v_id, 'lipsă');
  end if;

  select * into v_vechi from public.colectii where id = v_id;

  v_nume := coalesce(v_nume, v_vechi.nume);
  if v_nume is null then
    raise exception 'Colecția are nevoie de un nume';
  end if;

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

  v_an := case
    when pg_catalog.jsonb_exists(payload, 'an') then nullif(payload ->> 'an', '')::smallint
    else v_vechi.an
  end;
  v_sursa := case
    when pg_catalog.jsonb_exists(payload, 'sursaBibliografica')
      then coalesce(btrim(payload ->> 'sursaBibliografica'), '')
    else coalesce(v_vechi.sursa_bibliografica, '')
  end;

  v_pozitie := coalesce(
    (payload ->> 'position')::smallint,
    v_vechi.position,
    (select coalesce(max(position), -1) + 1 from public.colectii)
  );
  v_publicat := coalesce((payload ->> 'publicat')::boolean, v_vechi.publicat, true);

  insert into public.colectii (id, centru_id, nume, tip, an, sursa_bibliografica, position, publicat)
  values (v_id, v_centru, v_nume, v_tip::public.colectie_tip, v_an, v_sursa, v_pozitie, v_publicat)
  on conflict (id) do update set
    centru_id           = excluded.centru_id,
    nume                = excluded.nume,
    tip                 = excluded.tip,
    an                  = excluded.an,
    sursa_bibliografica = excluded.sursa_bibliografica,
    position            = excluded.position,
    publicat            = excluded.publicat;

  return v_id;
end;
$$;
