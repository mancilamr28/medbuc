-- Două lucruri de care are nevoie administrarea la scară: să vadă unde e gaura
-- de conținut, și să poată mișca o sută de grile fără o sută de clicuri.
--
-- **Acoperirea** răspunde la „ce scriu mai departe?", care azi e ghicit. Din 22
-- de capitole, 20 sunt goale — iar numărul ăla nu se vede nicăieri. E o
-- agregare, deci trebuie să stea în SQL: adusă în client și grupată cu
-- `Array.reduce`, ar fi exact interogarea nemărginită pe care tocmai am scos-o
-- din ecranul de listă.
--
-- E `security invoker` **intenționat**, adică rulează cu drepturile celui care o
-- cheamă: RLS se aplică, deci un elev ar număra doar publicatele, iar
-- administratorul le vede pe toate. O funcție `security definer` ar fi trebuit
-- să reimplementeze `questions_citire` pe cont propriu, cu toate șansele de a o
-- reimplementa greșit — și ar fi intrat în lista de excepții din `rls.test.ts`.
create function public.acoperire_capitole()
returns table (
  chapter_id text,
  ciorna     integer,
  publicata  integer,
  retrasa    integer
)
language sql
stable
set search_path = ''
as $$
  select
    q.chapter_id,
    count(*) filter (where q.status = 'ciorna')::integer,
    count(*) filter (where q.status = 'publicata')::integer,
    count(*) filter (where q.status = 'retrasa')::integer
  from public.questions q
  group by q.chapter_id;
$$;

revoke all on function public.acoperire_capitole() from public, anon;
grant execute on function public.acoperire_capitole() to authenticated;

-- **Operațiile în masă.** După un import de o sută de grile, publicarea lor una
-- câte una înseamnă o sută de dus-întorsuri. Amândouă iau un array de id-uri și
-- întorc câte rânduri au atins, ca ecranul să poată spune o cifră adevărată în
-- loc de „gata".
--
-- Astea două sunt `security definer` fiindcă poarta e verificarea de rol, ca la
-- `salveaza_grila` — și de aceea intră amândouă în lista de excepții din
-- `rls.test.ts`, care e o alegere, nu o constatare.
create function public.schimba_starea_grilelor(ids text[], stare text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atinse integer;
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate schimba starea grilelor';
  end if;
  if stare not in ('ciorna', 'publicata', 'retrasa') then
    raise exception 'Stare necunoscută: %', coalesce(stare, 'lipsă');
  end if;

  update public.questions
     set status = stare::public.question_status
   where id = any (ids);

  get diagnostics v_atinse = row_count;
  return v_atinse;
end;
$$;

-- Colecția se atribuie cel mai des unui lot întreg, imediat după import: e chiar
-- nivelul după care se grupează un import. `null` o scoate.
-- Parametrul se numește `colectie_noua`, nu `colectie`: coloana veche
-- `questions.colectie` (text liber, rămasă din 0008 și nefolosită de nimeni de
-- la 0011 încoace) încă există, iar un parametru cu același nume face
-- `set colectie_id = colectie` ambiguu — Postgres refuză, la rulare.
create function public.atribuie_colectia(ids text[], colectie_noua text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_atinse integer;
begin
  if not private.is_admin() then
    raise exception 'Doar un administrator poate schimba colecția grilelor';
  end if;
  if colectie_noua is not null and not exists (select 1 from public.colectii where id = colectie_noua) then
    raise exception 'Colecția nu există: %', colectie_noua;
  end if;

  update public.questions
     set colectie_id = colectie_noua
   where id = any (ids);

  get diagnostics v_atinse = row_count;
  return v_atinse;
end;
$$;

revoke all on function public.schimba_starea_grilelor(text[], text) from public, anon;
revoke all on function public.atribuie_colectia(text[], text)       from public, anon;

grant execute on function public.schimba_starea_grilelor(text[], text) to authenticated;
grant execute on function public.atribuie_colectia(text[], text)       to authenticated;
