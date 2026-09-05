-- Copierea inițială a păstrat jurnalul, dar nu și alegerile din grilele lucrării.
-- Reparăm numai simulările istorice, din jurnalul lor imutabil, pe poziție exactă.
begin;
lock table public.test_run_items in access exclusive mode;

do $$
begin
  if exists (
    select 1 from public.attempts a
    join public.sim_runs s on s.id = a.sim_run_id
    left join public.test_runs r on r.id = s.id
    left join public.test_run_items i
      on i.run_id = s.id and a.client_key = s.id::text || ':' || i.position::text
    where a.chosen is not null and (
      r.id is null or r.user_id <> a.user_id or s.user_id <> a.user_id
      or a.run_id is distinct from s.id or i.run_id is null
      or i.question_id is distinct from a.question_id
      or (i.chosen is not null and i.chosen is distinct from a.chosen)
    )
  ) then
    raise exception 'Recuperarea simulărilor: jurnalul nu corespunde instantaneului';
  end if;
end;
$$;

-- Exclusiv în această tranzacție blocată: o lucrare predată nu permite editări.
alter table public.test_run_items disable trigger test_run_items_inghetate;
update public.test_run_items i
set chosen = a.chosen, answered_at = a.answered_at
from public.attempts a
join public.sim_runs s on s.id = a.sim_run_id
where i.run_id = s.id
  and a.client_key = s.id::text || ':' || i.position::text
  and a.question_id = i.question_id
  and a.chosen is not null and i.chosen is null;
alter table public.test_run_items enable trigger test_run_items_inghetate;
commit;
