import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bazaDeTest, type Baza } from './harness';

/**
 * Politicile de acces, verificate prin rulare.
 *
 * RLS greșit nu dă eroare — arată datele altcuiva. Un test care doar citește
 * fișierul de politici n-ar prinde nimic, așa că totul de aici trece prin rolul
 * `authenticated`, cu un id de utilizator pus în cerere, exact cum ajunge o
 * interogare din browser.
 *
 * Contextul: azi, în client, rolul e `useState<Role>('admin')` — aplicația
 * pornește ca administrator, iar `#/admin` se deschide din bara de adrese. De
 * aici încolo rolul se verifică în bază, unde clientul nu poate minți.
 */
let baza: Baza;
let ana: string;
let bogdan: string;

beforeEach(async () => {
  baza = await bazaDeTest();
  ana = await baza.creeazaUtilizator('ana@exemplu.ro');
  bogdan = await baza.creeazaUtilizator('bogdan@exemplu.ro');
});

afterEach(async () => {
  await baza.inchide();
});

describe('notițele', () => {
  it('nu se văd între elevi', async () => {
    await baza.caUtilizator(ana, async () => {
      await baza.db.query('insert into notes (user_id, chapter_id, body) values ($1, $2, $3)', [
        ana,
        'bio-nervos',
        'notița Anei',
      ]);
    });

    const aleLuiBogdan = await baza.caUtilizator(bogdan, () =>
      baza.db.query<{ body: string }>('select body from notes'),
    );

    expect(aleLuiBogdan.rows).toHaveLength(0);
  });

  it('nu pot fi scrise în numele altcuiva', async () => {
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query('insert into notes (user_id, chapter_id, body) values ($1, $2, $3)', [
          bogdan,
          'bio-nervos',
          'strecurată',
        ]),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('se citesc înapoi de propriul autor', async () => {
    await baza.caUtilizator(ana, async () => {
      await baza.db.query('insert into notes (user_id, chapter_id, body) values ($1, $2, $3)', [
        ana,
        'bio-nervos',
        'notița Anei',
      ]);
      const r = await baza.db.query<{ body: string }>('select body from notes');
      expect(r.rows[0]!.body).toBe('notița Anei');
    });
  });
});

describe('răspunsurile și lucrările', () => {
  it('nu se văd între elevi', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source)
         values ($1, 'bio-nervos-01', 'B', true, 'sesiune')`,
        [ana],
      ),
    );

    const aleLuiBogdan = await baza.caUtilizator(bogdan, () =>
      baza.db.query('select * from attempts'),
    );
    expect(aleLuiBogdan.rows).toHaveLength(0);
  });

  /**
   * `attempts` e jurnal, nu stare: pe el se sprijină tot progresul. Dacă s-ar
   * putea rescrie din client, „procent corecte" ar deveni o cifră aleasă, nu
   * măsurată — exact ce tocmai am scos din aplicație.
   */
  it('un răspuns dat nu se mai poate schimba', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source)
         values ($1, 'bio-nervos-01', 'A', false, 'sesiune')`,
        [ana],
      ),
    );

    const dupa = await baza.caUtilizator(ana, () =>
      baza.db.query('update attempts set is_correct = true where user_id = $1', [ana]),
    );
    expect(dupa.affectedRows ?? 0).toBe(0);
  });

  it('un răspuns dat nu se poate șterge', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source)
         values ($1, 'bio-nervos-01', 'A', false, 'sesiune')`,
        [ana],
      ),
    );

    await baza.caUtilizator(ana, () => baza.db.query('delete from attempts'));
    const ramase = await baza.caUtilizator(ana, () => baza.db.query('select * from attempts'));
    expect(ramase.rows).toHaveLength(1);
  });

  it('lucrările de simulare nu se văd între elevi', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `insert into sim_runs (user_id, ends_at, config, question_ids)
         values ($1, now() + interval '3 hours', '{}'::jsonb, array['bio-nervos-01'])`,
        [ana],
      ),
    );

    const aleLuiBogdan = await baza.caUtilizator(bogdan, () => baza.db.query('select * from sim_runs'));
    expect(aleLuiBogdan.rows).toHaveLength(0);
  });
});

describe('profilul', () => {
  it('nu e vizibil altui elev', async () => {
    const vazute = await baza.caUtilizator(ana, () =>
      baza.db.query<{ id: string }>('select id from profiles'),
    );

    expect(vazute.rows).toHaveLength(1);
    expect(vazute.rows[0]!.id).toBe(ana);
  });

  /** Gaura cea mai serioasă din versiunea de azi: un clic te făcea administrator. */
  it('nu se poate promova singur la administrator', async () => {
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query("update profiles set role = 'admin' where id = $1", [ana]),
      ),
    ).rejects.toThrow(/administrator/i);
  });

  it('își poate schimba propriile date', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query('update profiles set liceu = $1 where id = $2', ['Colegiul X', ana]),
    );

    const r = await baza.db.query<{ liceu: string }>('select liceu from profiles where id = $1', [ana]);
    expect(r.rows[0]!.liceu).toBe('Colegiul X');
  });
});

/**
 * Funcțiile, după semnalările linterului Supabase.
 *
 * Aceeași problemă ca la RLS: nimic nu dă eroare. O funcție `security definer`
 * lăsată în `public` se publică singură la `/rest/v1/rpc/<nume>` și rulează cu
 * drepturi de proprietar pentru oricine are cheia din browser — iar aplicația
 * merge la fel de bine, motiv pentru care a stat așa până a semnalat linterul.
 */
describe('funcțiile', () => {
  it('nu stau în schema pe care o publică PostgREST', async () => {
    const r = await baza.db.query<{ proname: string }>(`
      select p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
    `);
    expect(r.rows).toHaveLength(0);
  });

  /**
   * `revoke ... from anon` singur nu face nimic cât timp `public` are dreptul,
   * fiindcă `anon` moștenește de acolo — exact greșeala din 0002. De aceea se
   * întreabă aici drepturile efective, nu textul migrării.
   */
  it('de declanșator nu sunt apelabile de nimeni din browser', async () => {
    const r = await baza.db.query<{ f: string; rol: string; poate: boolean }>(`
      select f, rol, has_function_privilege(rol, f, 'execute') as poate
      from unnest(array[
        'private.handle_new_user()',
        'private.protect_role()',
        'private.touch_updated_at()'
      ]) as f, unnest(array['anon', 'authenticated']) as rol
    `);

    expect(r.rows).toHaveLength(6);
    expect(r.rows.filter((x) => x.poate)).toEqual([]);
  });

  it('is_admin nu e apelabilă de un vizitator neautentificat', async () => {
    const r = await baza.db.query<{ poate: boolean }>(
      `select has_function_privilege('anon', 'private.is_admin()', 'execute') as poate`,
    );
    expect(r.rows[0]!.poate).toBe(false);
  });

  it('au toate un search_path fix', async () => {
    const r = await baza.db.query<{ proname: string; proconfig: string[] | null }>(`
      select p.proname, p.proconfig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private'
    `);

    expect(r.rows).toHaveLength(4);
    for (const f of r.rows) {
      expect(f.proconfig?.some((c) => c.startsWith('search_path='))).toBe(true);
    }
  });
});

describe('biblioteca', () => {
  it('e citibilă de orice elev autentificat', async () => {
    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from questions'),
    );
    expect(r.rows[0]!.n).toBe(6);
  });

  it('ascunde ciornele de elevi', async () => {
    await baza.db.query("update questions set status = 'ciorna' where id = 'bio-nervos-01'");

    const grile = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from questions'),
    );
    const variante = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>(
        "select count(*)::int as n from question_options where question_id = 'bio-nervos-01'",
      ),
    );

    expect(grile.rows[0]!.n).toBe(5);
    expect(variante.rows[0]!.n).toBe(0);
  });

  it('arată ciornele administratorului', async () => {
    await baza.db.query("update questions set status = 'ciorna' where id = 'bio-nervos-01'");
    await baza.faAdmin(ana);

    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from questions'),
    );
    expect(r.rows[0]!.n).toBe(6);
  });

  it('nu poate fi modificată de un elev', async () => {
    const r = await baza.caUtilizator(ana, () =>
      baza.db.query("update questions set text = 'schimbat' where id = 'bio-nervos-01'"),
    );
    expect(r.affectedRows ?? 0).toBe(0);
  });

  it('nu primește grile noi de la un elev', async () => {
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query(
          `insert into questions (id, chapter_id, tip, text, correct, expl, src)
           values ('strecurata-01', 'bio-nervos', 'simplu', 'a mea', 'A', 'x', 'y')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('se lasă scrisă de administrator', async () => {
    await baza.faAdmin(ana);

    await baza.caUtilizator(ana, () =>
      baza.db.query("update questions set src = 'sursă nouă' where id = 'bio-nervos-01'"),
    );

    const r = await baza.db.query<{ src: string }>(
      "select src from questions where id = 'bio-nervos-01'",
    );
    expect(r.rows[0]!.src).toBe('sursă nouă');
  });
});
