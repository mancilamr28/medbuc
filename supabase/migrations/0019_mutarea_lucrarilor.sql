-- Cele 23 de lucrări vechi se mută în `test_runs`.
--
-- **Tabelele vechi rămân, cu tot cu rânduri, iar clientul din producție scrie în
-- continuare în ele.** Migrarea copiază, nu mută: dacă trecerea clientului se
-- dă înapoi, nu se pierde nimic. Ștergerea lor e o migrare separată, după o
-- perioadă de rodaj.
--
-- Din același motiv e **idempotentă** (`on conflict do nothing` peste tot): se
-- rulează acum, și se rulează din nou în ziua în care clientul trece, ca să
-- prindă și sesiunile create între timp. Fără asta, orice sesiune din fereastra
-- dintre migrare și livrare ar rămâne doar în tabelul vechi.
--
-- ---------------------------------------------------------------------------
--
-- Ce se poate reconstrui și ce nu:
--
-- - **Simulările se reconstruiesc întregi.** `sim_runs.question_ids` e chiar
--   ordinea lucrării, deci devine `test_run_items` poziție cu poziție.
--   `option_order` rămâne null fiindcă nu s-a amestecat niciodată nimic — e
--   valoarea adevărată, nu o umplutură.
--
-- - **Sesiunile de exersare nu se reconstruiesc.** Ordinea lor a trăit doar în
--   `localStorage` (`SessionRun.order`), niciodată în bază, deci nu există de
--   unde. Rândul se mută fără grile, iar `nr_cerut` rămâne null. Se putea
--   inventa o cifră din numărul de răspunsuri, dar aia ar fi fost exact genul de
--   număr scris de mână pe care aplicația l-a scăpat: ar fi devenit numitorul
--   scorului, iar o sesiune în care s-au sărit grile ar fi arătat 100%.
--   Valoarea lor e oricum în `attempts`, care nu se atinge.
--
-- - **Modul se derivă din jurnal, nu se presupune.** Recapitularea scrie tot un
--   rând în `sessions` (`syncFinishedRecapitulare`), deci singurul semn care le
--   deosebește e `attempts.source`. Azi sunt zero recapitulări în bază, dar
--   derivarea e scrisă corect ca să țină și pe o bază care le are.

-- `nr_cerut` nu mai e obligatoriu: lucrările dinaintea motorului n-au de unde
-- să-l știe, iar null spune „nu se știe", pe când o cifră ar minți. CHECK-ul
-- existent (`nr_cerut > 0`) trece peste null de la sine.
alter table test_runs alter column nr_cerut drop not null;

insert into test_runs (id, user_id, mod, config, started_at, ends_at, finished_at, qi, nr_cerut)
select
  s.id,
  s.user_id,
  case when exists (
    select 1 from attempts a where a.session_id = s.id and a.source = 'recapitulare'
  ) then 'recapitulare'::test_mod else 'exersare'::test_mod end,
  jsonb_build_object('capitole', to_jsonb(s.chapter_ids)),
  s.started_at,
  null,
  s.finished_at,
  0,
  null
from sessions s
on conflict (id) do nothing;

insert into test_runs (id, user_id, mod, config, started_at, ends_at, finished_at, qi, nr_cerut)
select
  r.id,
  r.user_id,
  'simulare'::test_mod,
  r.config,
  r.started_at,
  r.ends_at,
  r.finished_at,
  0,
  nullif(cardinality(r.question_ids), 0)
from sim_runs r
on conflict (id) do nothing;

-- Ordinea lucrării, poziție cu poziție. `with ordinality` numerotează de la 1,
-- iar pozițiile pornesc de la 0 — la fel ca `SimRun.order` în client, unde
-- `attempts.client_key` e deja `'<lucrare>:<indice>'`. O deplasare cu unu aici
-- ar dezlipi fiecare răspuns vechi de grila lui.
insert into test_run_items (run_id, position, question_id, option_order)
select r.id, (o.ord - 1)::smallint, o.question_id, null
from sim_runs r
cross join lateral unnest(r.question_ids) with ordinality as o(question_id, ord)
on conflict (run_id, position) do nothing;

-- Legătura nouă dintre jurnal și lucrare. `client_key` rămâne neatins, deci
-- rândurile vechi se potrivesc în continuare cu lucrările lor și pe drumul
-- vechi, și pe cel nou.
update attempts
set run_id = coalesce(session_id, sim_run_id)
where run_id is null and coalesce(session_id, sim_run_id) is not null;

-- O copiere pe jumătate trebuie să oprească livrarea, nu să plece mai departe.
do $$
declare
  v_lipsa_sesiuni  integer;
  v_lipsa_simulari integer;
  v_lipsa_grile    integer;
  v_lipsa_jurnal   integer;
begin
  select count(*) into v_lipsa_sesiuni
  from sessions s where not exists (select 1 from test_runs t where t.id = s.id);

  select count(*) into v_lipsa_simulari
  from sim_runs r where not exists (select 1 from test_runs t where t.id = r.id);

  select count(*) into v_lipsa_grile
  from sim_runs r
  where cardinality(r.question_ids)
        <> (select count(*) from test_run_items i where i.run_id = r.id);

  select count(*) into v_lipsa_jurnal
  from attempts a
  where a.run_id is null and coalesce(a.session_id, a.sim_run_id) is not null;

  if v_lipsa_sesiuni > 0 or v_lipsa_simulari > 0 or v_lipsa_grile > 0 or v_lipsa_jurnal > 0 then
    raise exception 'Mutarea lucrărilor e incompletă: % sesiuni, % simulări, % lucrări fără grile, % răspunsuri fără lucrare',
      v_lipsa_sesiuni, v_lipsa_simulari, v_lipsa_grile, v_lipsa_jurnal;
  end if;
end;
$$;

-- `preda_test` împărțea la `nr_cerut`. Pe o lucrare mutată, ăla e null, deci
-- procentul iese null în loc să crape — „nu se știe" e răspunsul corect, nu 0.
create or replace function public.preda_test(run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_run    public.test_runs;
  v_gata   timestamptz;
  v_corecte integer;
  v_gresite integer;
begin
  if v_uid is null then
    raise exception 'neautentificat';
  end if;

  select * into v_run from public.test_runs r where r.id = preda_test.run_id and r.user_id = v_uid;
  if v_run.id is null then
    raise exception 'lucrare_inexistenta' using detail = preda_test.run_id::text;
  end if;

  v_gata := private.predata_la(v_run);
  if v_gata is null then
    v_gata := now();
    update public.test_runs set finished_at = v_gata where id = v_run.id;
  elsif v_run.finished_at is null then
    update public.test_runs set finished_at = v_gata where id = v_run.id;
  end if;

  insert into public.attempts (user_id, question_id, chosen, is_correct, source, run_id, client_key, answered_at)
  select v_uid, q.id, i.chosen, i.chosen = q.correct, private.sursa_pentru(v_run.mod), v_run.id,
         v_run.id::text || ':' || i.position::text, coalesce(i.answered_at, v_gata)
  from public.test_run_items i
  join public.questions q on q.id = i.question_id
  where i.run_id = v_run.id and i.chosen is not null
  on conflict (client_key) do nothing;

  select
    count(*) filter (where i.chosen is not null and i.chosen = q.correct),
    count(*) filter (where i.chosen is not null and i.chosen <> q.correct)
  into v_corecte, v_gresite
  from public.test_run_items i
  left join public.questions q on q.id = i.question_id
  where i.run_id = v_run.id;

  return jsonb_build_object(
    'run_id', v_run.id,
    'finished_at', v_gata,
    'nr_cerut', v_run.nr_cerut,
    'corecte', v_corecte,
    'gresite', v_gresite,
    'pct', case when v_run.nr_cerut is null then null
                else round(v_corecte::numeric * 100 / v_run.nr_cerut) end
  );
end;
$$;
