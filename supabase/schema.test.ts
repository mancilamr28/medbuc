import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FK_VARIANTE } from '../src/lib/continut';
import { TIPURI_SEED_RANDURI } from '../src/data/tipuriSeed';
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

    expect(materii.rows[0]!.n).toBe(2);
    expect(capitole.rows[0]!.n).toBe(22);
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
        insert into questions (id, chapter_id, tip, tip_id, text, correct, expl, src)
        values ('test-01', 'bio-nervos', 'simplu', 'simplu', 'Întrebare', 'E', 'explicație', 'sursă');
        insert into question_options (question_id, key, text) values ('test-01', 'A', 'doar A');
        commit;
      `),
    ).rejects.toThrow();
  });

  it('refuză o grilă grupată fără cele patru afirmații', async () => {
    await expect(
      baza.db.query(
        `insert into questions (id, chapter_id, tip, tip_id, text, correct, expl, src)
         values ('test-02', 'bio-nervos', 'grupat', 'grupat', 'Întrebare', 'A', 'explicație', 'sursă')`,
      ),
    ).rejects.toThrow(/grupat_are_enunturi/);
  });

  it('refuză o grilă legată de un capitol inexistent', async () => {
    await expect(
      baza.db.query(
        `insert into questions (id, chapter_id, tip, tip_id, text, correct, expl, src)
         values ('test-03', 'capitol-inventat', 'simplu', 'simplu', 'Întrebare', 'A', 'explicație', 'sursă')`,
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

/**
 * Numele cheii externe pe care se sprijină `continut.ts`.
 *
 * Între `questions` și `question_options` sunt două relații — cea normală și
 * `questions_correct_exists`, care merge invers — deci PostgREST refuză un embed
 * neanunțat cu „more than one relationship was found". Interogarea numește
 * relația, iar numele ăla e un șir liber într-un fișier de TypeScript: dacă o
 * migrare viitoare redenumește constrângerea, aplicația cade abia în producție.
 *
 * Bug-ul s-a întâmplat deja o dată, exact așa. PGlite nu-l putea prinde — rulează
 * SQL direct, fără PostgREST — dar poate cel puțin să țină numele legat de schemă.
 */
describe('embed-ul folosit de aplicație', () => {
  it('numește o cheie externă care chiar există', async () => {
    const r = await baza.db.query<{ def: string }>(
      'select pg_get_constraintdef(oid) as def from pg_constraint where conname = $1',
      [FK_VARIANTE],
    );

    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]!.def).toContain('FOREIGN KEY (question_id) REFERENCES questions(id)');
  });

  /** Motivul pentru care embed-ul trebuie numit: relația nu e singura. */
  it('confirmă că sunt două relații între grile și variante', async () => {
    const r = await baza.db.query<{ conname: string }>(`
      select conname from pg_constraint
      where contype = 'f'
        and (conrelid = 'public.question_options'::regclass
          or confrelid = 'public.question_options'::regclass)
    `);

    expect(r.rows.map((x) => x.conname).sort()).toEqual([
      FK_VARIANTE,
      'questions_correct_exists',
    ]);
  });
});

/**
 * Fixtura de tipuri față de ce a inserat migrarea.
 *
 * `src/data/tipuriSeed.ts` oglindește inserarea din `0010_tipuri_de_grile.sql`,
 * iar două locuri pot diverge. Divergența n-ar da nicio eroare: testele pure ar
 * valida după fixtură, baza ar valida după rândurile ei, iar diferența ar ieși la
 * iveală abia într-un formular care refuză o grilă corectă. De aceea se compară
 * aici, pe baza reală, după migrări.
 */
describe('tipurile de grilă', () => {
  it('sunt în bază exact cum le descrie fixtura din aplicație', async () => {
    const baza = await bazaDeTest({ cuSeed: false });
    try {
      const r = await baza.db.query<Record<string, unknown>>(
        `select id, nume, descriere, sablon_optiuni, nr_optiuni_min, nr_optiuni_max,
                permite_amestecare, cere_enunturi, nr_enunturi, hint_randare, position
         from question_types order by position`,
      );

      expect(r.rows).toEqual(TIPURI_SEED_RANDURI);
    } finally {
      await baza.inchide();
    }
  });

  /** Constrângerea care face din siguranța la amestecare o garanție, nu o convenție. */
  it('nu lasă un tip cu variante fixe să fie și amestecabil', async () => {
    const baza = await bazaDeTest({ cuSeed: false });
    try {
      await expect(
        baza.db.query(
          `insert into question_types (id, nume, sablon_optiuni, nr_optiuni_min, nr_optiuni_max, permite_amestecare)
           values ('gresit', 'Greșit', array['a', 'b'], 2, 2, true)`,
        ),
      ).rejects.toThrow(/qt_sablon_fix/i);
    } finally {
      await baza.inchide();
    }
  });
});
