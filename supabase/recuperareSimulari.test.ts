import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { bazaDeTest, type Baza } from './harness';

let baza: Baza;
let id: string;
const migrare = () => baza.db.exec(readFileSync(new URL('./migrations/20260905114309_recupereaza_raspunsurile_simularilor_vechi.sql', import.meta.url), 'utf8'));
beforeAll(async () => {
  baza = await bazaDeTest();
  const user = await baza.creeazaUtilizator('recuperare@test.ro');
  const r = await baza.db.query<{ id: string }>(
    "insert into sim_runs(user_id,started_at,ends_at,finished_at,config,question_ids) values($1,now()-interval '2 hours',now(),now(),'{}',array['bio-nervos-01','bio-nervos-01']) returning id",
    [user],
  );
  id = r.rows[0]!.id;
  await baza.db.query("insert into attempts(user_id,question_id,chosen,is_correct,source,sim_run_id,client_key) values($1,'bio-nervos-01','B',false,'simulare',$2,$3)", [user,id,id+':1']);
  await baza.db.exec(readFileSync(new URL('./migrations/0019_mutarea_lucrarilor.sql', import.meta.url), 'utf8'));
}, 60000);
afterAll(async () => { await baza?.inchide(); });

it('reface răspunsul la poziția exactă și rămâne idempotentă, fără să deblocheze lucrarea', async () => {
  await migrare();
  await migrare();
  const r = await baza.db.query<{ chosen: string | null }>('select chosen from test_run_items where run_id=$1 order by position', [id]);
  expect(r.rows.map(x => x.chosen)).toEqual([null, 'B']);
  await expect(baza.db.query("update test_run_items set chosen='A' where run_id=$1 and position=1", [id])).rejects.toThrow(/predată/);
  expect((await baza.db.query<{ n: number }>('select count(*)::int as n from attempts')).rows[0]!.n).toBe(1);
});
