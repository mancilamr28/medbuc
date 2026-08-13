-- Ștergerea contului, dreptul GDPR de eliminare.
--
-- Nu se poate face din browser cu clientul obișnuit: `auth.users` e al schemei
-- `auth`, iar ștergerea unui utilizator cere cheia de serviciu — care nu are ce
-- căuta într-o pagină web. De aici funcția: rulează `security definer`, deci cu
-- drepturile proprietarului, dar nu primește niciun parametru și șterge exact
-- `auth.uid()`. Cine o cheamă își poate șterge doar propriul cont, oricât s-ar
-- strădui — nu există nimic de falsificat în cerere.
--
-- Restul datelor pleacă singur: `profiles`, `sessions`, `sim_runs`, `attempts` și
-- `notes` referă `auth.users` cu `on delete cascade`. Singura excepție e
-- `questions.created_by`, care e `on delete set null`: grilele scrise rămân în
-- bibliotecă, doar legătura cu autorul dispare. Altfel ștergerea unui cont de
-- administrator ar goli biblioteca tuturor.
--
-- **Atenție la linterul Supabase.** Funcția asta va apărea la
-- `authenticated_security_definer_function_executable`, spre deosebire de cele
-- mutate în `private` de migrarea 0003. Aici e intenționat și nu se „repară":
-- e un RPC scris ca să fie chemat din client, deci trebuie să stea în schema pe
-- care PostgREST o publică și să fie executabilă de `authenticated`. `anon` nu o
-- poate chema, iar fără sesiune ridică excepție.

create function public.sterge_contul()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Nu există niciun cont autentificat';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.sterge_contul() from public, anon;
grant execute on function public.sterge_contul() to authenticated;
