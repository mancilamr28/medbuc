-- Row Level Security.
--
-- Se activează pe fiecare tabel, inclusiv pe cele de conținut: în Postgres, un
-- tabel fără RLS e citibil și scriibil de oricine are cheia `anon`, iar acea
-- cheie ajunge în browserul fiecărui elev. „Nu punem încă politici, punem mai
-- târziu" înseamnă bibliotecă publică și editabilă.
--
-- Azi rolul trăiește în client (`useState<Role>('admin')`), pornește pe admin și
-- se schimbă cu un clic. De aici încolo, singurul rol care contează e cel din
-- `profiles`, verificat în baza de date.

-- `security definer` ca politicile pe `profiles` să nu se interogheze pe ele
-- însele — o politică pe `profiles` care citește `profiles` intră în recursiune
-- și Postgres refuză interogarea.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from anon;

alter table materii          enable row level security;
alter table chapters         enable row level security;
alter table questions        enable row level security;
alter table question_options enable row level security;
alter table profiles         enable row level security;
alter table sessions         enable row level security;
alter table sim_runs         enable row level security;
alter table attempts         enable row level security;
alter table notes            enable row level security;

-- --------------------------------------------------------------- conținut --

-- Structura bibliotecii e vizibilă oricui e autentificat: fără ea nu se poate
-- desena nici măcar lista de capitole.
create policy materii_citire on materii
  for select to authenticated using (true);

create policy chapters_citire on chapters
  for select to authenticated using (true);

-- Elevii văd doar grilele publicate. Ciornele sunt munca în curs a autorului și
-- ar strica atât exersarea, cât și încrederea în bancă.
create policy questions_citire on questions
  for select to authenticated
  using (status = 'publicata' or public.is_admin());

create policy question_options_citire on question_options
  for select to authenticated
  using (
    exists (
      select 1 from questions q
      where q.id = question_options.question_id
        and (q.status = 'publicata' or public.is_admin())
    )
  );

-- Scrierea în bibliotecă e strict a administratorilor.
create policy materii_scriere on materii
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy chapters_scriere on chapters
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy questions_scriere on questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy question_options_scriere on question_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- conturi --

create policy profiles_citire_propriu on profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy profiles_actualizare_propriu on profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Rolul nu se schimbă din client, nici măcar pe propriul profil: altfel orice
-- elev s-ar promova administrator cu o singură cerere.
--
-- `auth.uid() is null` înseamnă că cererea nu vine dintr-o sesiune de browser,
-- ci din server, cu cheia de serviciu — acolo se face primul administrator.
-- Fără portița asta n-ar exista niciun administrator: prima promovare ar fi
-- refuzată chiar de regula care apără rolul.
create function public.protect_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Rolul poate fi schimbat doar de un administrator';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role before update on profiles
  for each row execute function public.protect_role();

-- ------------------------------------------------------------ activitatea --

-- Același tipar peste tot: fiecare vede și scrie numai rândurile lui.
create policy sessions_proprii on sessions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy sim_runs_proprii on sim_runs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notes_proprii on notes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy attempts_citire_proprii on attempts
  for select to authenticated using (user_id = auth.uid());

create policy attempts_inserare_proprii on attempts
  for insert to authenticated with check (user_id = auth.uid());

-- Un răspuns dat nu se rescrie și nu se șterge: pe `attempts` se sprijină tot
-- progresul, deci trebuie să fie un jurnal, nu o stare editabilă. Fără asta,
-- „procent corecte" ar putea fi îmbunătățit retroactiv din client.
