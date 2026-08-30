-- Păstrează legătura explicită dintre rezultat și definiția din care a pornit.
-- `config.test_id` rămâne instantaneul pentru antet, dar o cheie străină este
-- necesară pentru istoricul și statisticile pe un test anume, fără căutări în
-- JSON și fără id-uri scrise greșit.

alter table public.test_runs
  add column test_predefinit_id text
  references public.teste_predefinite (id) on update cascade on delete set null;

create index test_runs_test_predefinit_idx
  on public.test_runs (test_predefinit_id, started_at desc)
  where test_predefinit_id is not null;

create or replace function public.genereaza_test(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rezultat jsonb;
begin
  if coalesce(payload ->> 'mod', 'exersare') = 'test_predefinit' then
    v_rezultat := private.genereaza_test_predefinit(payload);

    update public.test_runs
    set test_predefinit_id = payload ->> 'test_id'
    where id = (v_rezultat ->> 'run_id')::uuid;

    return v_rezultat;
  end if;

  return private.genereaza_test_din_regula(payload);
end;
$$;

revoke all on function public.genereaza_test(jsonb) from public, anon;
grant execute on function public.genereaza_test(jsonb) to authenticated;
