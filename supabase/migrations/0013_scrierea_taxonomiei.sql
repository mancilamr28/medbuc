-- Taxonomia și colecțiile se scriu din aplicație, nu din editorul SQL.
--
-- Politicile `materii_scriere`, `chapters_scriere` și `colectii_scriere` permit
-- deja unui administrator să scrie direct în tabele. Scrierile trec totuși prin
-- funcții, din două motive:
--
-- 1. **Consecvență cu `salveaza_grila`.** Tot ce schimbă conținutul intră printr-o
--    singură ușă, iar regulile care nu au voie să depindă de client stau lângă
--    date, nu într-un formular — un formular e o sugestie, cererea poate veni de
--    oriunde cu cheia publicabilă.
-- 2. **Id-ul e identitate.** `chapter_id` e scris în `questions`, în
--    `sessions.chapter_ids` și în cheia notițelor (`medbuc.note.<id>`).
--    Redenumirea unui id nu e o redenumire, e o mutare — iar funcțiile de aici o
--    refuză explicit, în loc s-o lase să treacă și să orfanizeze notițe.
--
-- **Nu există ștergere.** Nu din uitare: un capitol depublicat dispare din fața
-- elevului fără să atingă nimic din ce s-a scris deja, exact ca retragerea unei
-- grile față de ștergerea ei. Ștergerea taxonomiei e rară și periculoasă, deci
-- rămâne o operație de editor SQL, făcută deliberat.

create function public.salveaza_materie(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       text := nullif(btrim(payload ->> 'id'), '');
  v_nume     text := nullif(btrim(payload ->> 'nume'), '');
  v_centru   text := coalesce(nullif(btrim(payload ->> 'centruId'), ''), 'umfcd');
  v_pozitie  smallint := coalesce((payload ->> 'position')::smallint, 0);
  v_publicat boolean := coalesce((payload ->> 'publicat')::boolean, true);
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate schimba materiile';
  end if;
  if v_id is null or v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Identificatorul poate conține doar litere mici, cifre și cratime: %', coalesce(v_id, 'lipsă');
  end if;
  if v_nume is null then
    raise exception 'Materia are nevoie de un nume';
  end if;
  if not exists (select 1 from public.centre_admitere where id = v_centru) then
    raise exception 'Centrul nu există: %', v_centru;
  end if;

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

create function public.salveaza_capitol(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       text := nullif(btrim(payload ->> 'id'), '');
  v_materie  text := nullif(btrim(payload ->> 'materieId'), '');
  v_nr       text := coalesce(btrim(payload ->> 'nr'), '');
  v_nume     text := nullif(btrim(payload ->> 'nume'), '');
  v_pozitie  smallint := coalesce((payload ->> 'position')::smallint, 0);
  v_publicat boolean := coalesce((payload ->> 'publicat')::boolean, true);
  v_materie_veche text;
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate schimba capitolele';
  end if;
  if v_id is null or v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Identificatorul poate conține doar litere mici, cifre și cratime: %', coalesce(v_id, 'lipsă');
  end if;
  if v_nume is null then
    raise exception 'Capitolul are nevoie de un nume';
  end if;
  if not exists (select 1 from public.materii where id = v_materie) then
    raise exception 'Materia nu există: %', coalesce(v_materie, 'lipsă');
  end if;

  -- Mutarea unui capitol cu grile în altă materie ar rescrie retroactiv la ce
  -- materie a răspuns elevul. Numele se poate corecta oricând; apartenența, nu.
  select materie_id into v_materie_veche from public.chapters where id = v_id;
  if v_materie_veche is not null
     and v_materie_veche <> v_materie
     and exists (select 1 from public.questions where chapter_id = v_id) then
    raise exception 'Capitolul are grile scrise — nu se mai poate muta din materia %', v_materie_veche;
  end if;

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

create function public.salveaza_colectie(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id       text := nullif(btrim(payload ->> 'id'), '');
  v_nume     text := nullif(btrim(payload ->> 'nume'), '');
  v_tip      text := payload ->> 'tip';
  v_centru   text := nullif(btrim(payload ->> 'centruId'), '');
  v_an       smallint := nullif(payload ->> 'an', '')::smallint;
  v_sursa    text := coalesce(btrim(payload ->> 'sursaBibliografica'), '');
  v_pozitie  smallint := coalesce((payload ->> 'position')::smallint, 0);
  v_publicat boolean := coalesce((payload ->> 'publicat')::boolean, true);
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate schimba colecțiile';
  end if;
  if v_id is null or v_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Identificatorul poate conține doar litere mici, cifre și cratime: %', coalesce(v_id, 'lipsă');
  end if;
  if v_nume is null then
    raise exception 'Colecția are nevoie de un nume';
  end if;
  if v_tip not in ('subiect_oficial', 'simulare_oficiala', 'culegere', 'autor') then
    raise exception 'Fel de colecție necunoscut: %', coalesce(v_tip, 'lipsă');
  end if;
  if v_centru is not null and not exists (select 1 from public.centre_admitere where id = v_centru) then
    raise exception 'Centrul nu există: %', v_centru;
  end if;

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

revoke all on function public.salveaza_materie(jsonb)  from public, anon;
revoke all on function public.salveaza_capitol(jsonb)  from public, anon;
revoke all on function public.salveaza_colectie(jsonb) from public, anon;

grant execute on function public.salveaza_materie(jsonb)  to authenticated;
grant execute on function public.salveaza_capitol(jsonb)  to authenticated;
grant execute on function public.salveaza_colectie(jsonb) to authenticated;
