import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bazaDeTest, type Baza } from './harness';

/**
 * Migrările rulate pe un Postgres adevărat (PGlite — Postgres 18 compilat în
 * WebAssembly, în proces). Fără asta, schema și politicile ar fi doar text
 * plauzibil: prima verificare reală ar fi pe baza de producție, cu conturi în ea.
 *
 * Ce se apără aici e granița de securitate a produsului. RLS greșit nu dă
 * eroare — arată datele altcuiva.
 */
let baza: Baza;

beforeEach(async () => {
  baza = await bazaDeTest();
});

afterEach(async () => {
  await baza.inchide();
});

describe('migrările', () => {
  it('se aplică pe o bază goală', async () => {
    const r = await baza.db.query<{ n: number }>(
      "select count(*)::int as n from information_schema.tables where table_schema = 'public'",
    );
    expect(r.rows[0]!.n).toBeGreaterThanOrEqual(9);
  });

  it('lasă seed-ul să intre, cu tot conținutul din aplicație', async () => {
    const materii = await baza.db.query<{ n: number }>('select count(*)::int as n from materii');
    const capitole = await baza.db.query<{ n: number }>('select count(*)::int as n from chapters');
    const grile = await baza.db.query<{ n: number }>('select count(*)::int as n from questions');
    const variante = await baza.db.query<{ n: number }>('select count(*)::int as n from question_options');

    expect(materii.rows[0]!.n).toBe(3);
    expect(capitole.rows[0]!.n).toBe(30);
    expect(grile.rows[0]!.n).toBe(6);
    expect(variante.rows[0]!.n).toBe(30);
  });

  it('poate rula seed-ul de două ori — e idempotent', async () => {
    const { readFileSync } = await import('node:fs');
    await baza.db.exec(readFileSync('supabase/seed.sql', 'utf8'));

    const grile = await baza.db.query<{ n: number }>('select count(*)::int as n from questions');
    expect(grile.rows[0]!.n).toBe(6);
  });

  it('păstrează explicațiile per variantă, nu doar textul răspunsului', async () => {
    const r = await baza.db.query<{ why: string | null }>(
      "select why from question_options where question_id = 'bio-nervos-01' and key = 'A'",
    );
    expect(r.rows[0]!.why).toMatch(/emisferele cerebrale/);
  });
});

describe('constrângerile de conținut', () => {
  it('refuză o grilă al cărei răspuns corect nu e printre variante', async () => {
    await expect(
      baza.db.exec(`
        begin;
        insert into questions (id, chapter_id, tip, text, correct, expl, src)
        values ('test-01', 'bio-nervos', 'simplu', 'Întrebare', 'E', 'explicație', 'sursă');
        insert into question_options (question_id, key, text) values ('test-01', 'A', 'doar A');
        commit;
      `),
    ).rejects.toThrow();
  });

  it('refuză o grilă grupată fără cele patru afirmații', async () => {
    await expect(
      baza.db.query(
        `insert into questions (id, chapter_id, tip, text, correct, expl, src)
         values ('test-02', 'bio-nervos', 'grupat', 'Întrebare', 'A', 'explicație', 'sursă')`,
      ),
    ).rejects.toThrow(/grupat_are_enunturi/);
  });

  it('refuză o grilă legată de un capitol inexistent', async () => {
    await expect(
      baza.db.query(
        `insert into questions (id, chapter_id, tip, text, correct, expl, src)
         values ('test-03', 'capitol-inventat', 'simplu', 'Întrebare', 'A', 'explicație', 'sursă')`,
      ),
    ).rejects.toThrow();
  });

  it('nu lasă două materii cu același id', async () => {
    await expect(
      baza.db.query("insert into materii (id, name, unit, position) values ('bio', 'Alta', 'grile', 9)"),
    ).rejects.toThrow();
  });
});

describe('idempotența jurnalului de progres', () => {
  it('nu permite aceeași cheie de client de două ori', async () => {
    const id = await baza.creeazaUtilizator('elev@exemplu.ro');
    await baza.caUtilizator(id, async () => {
      await baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source, client_key)
         values ($1, 'bio-nervos-01', 'B', true, 'sesiune', 'session-1:0')`,
        [id],
      );
      await expect(
        baza.db.query(
          `insert into attempts (user_id, question_id, chosen, is_correct, source, client_key)
           values ($1, 'bio-nervos-01', 'B', true, 'sesiune', 'session-1:0')`,
          [id],
        ),
      ).rejects.toThrow(/attempts_client_key_unique/);
    });
  });
});

describe('contul', () => {
  it('primește un profil automat la înregistrare', async () => {
    const id = await baza.creeazaUtilizator('elev@exemplu.ro');
    const r = await baza.db.query<{ role: string }>('select role from profiles where id = $1', [id]);

    expect(r.rows[0]!.role).toBe('elev');
  });

  it('pornește ca elev, nu ca administrator', async () => {
    const id = await baza.creeazaUtilizator('elev@exemplu.ro');
    const r = await baza.db.query<{ n: number }>(
      "select count(*)::int as n from profiles where id = $1 and role = 'admin'",
      [id],
    );
    expect(r.rows[0]!.n).toBe(0);
  });
});
