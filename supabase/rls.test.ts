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
         values ($1, 'bio-nervos-01', 'B', true, 'recapitulare')`,
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
  /**
   * Lista e o alegere, nu o constatare: singurele `security definer` din `public`
   * sunt cele scrise anume ca să fie chemate din client. Orice altceva ajuns
   * acolo din neatenție pică testul, care e tot rostul lui.
   */
  const RPC_INTENTIONAT = ['salveaza_grila', 'sterge_contul', 'sterge_grila'];

  it('nu stau în schema pe care o publică PostgREST', async () => {
    const r = await baza.db.query<{ proname: string }>(`
      select p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef
    `);
    expect(r.rows.map((x) => x.proname).sort()).toEqual(RPC_INTENTIONAT);
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

/**
 * Ștergerea contului — dreptul GDPR de eliminare, deci trebuie să meargă, nu doar
 * să existe un buton. Funcția nu ia parametri: șterge `auth.uid()` și atât, așa
 * că nu există nimic de falsificat din client.
 */
describe('ștergerea contului', () => {
  it('își duce cu ea toate datele proprii', async () => {
    await baza.caUtilizator(ana, async () => {
      await baza.db.query('insert into notes (user_id, chapter_id, body) values ($1, $2, $3)', [
        ana,
        'bio-nervos',
        'notița Anei',
      ]);
      await baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source)
         values ($1, 'bio-nervos-01', 'B', true, 'sesiune')`,
        [ana],
      );
      await baza.db.query('select public.sterge_contul()');
    });

    const profil = await baza.db.query('select 1 from profiles where id = $1', [ana]);
    const notite = await baza.db.query('select 1 from notes where user_id = $1', [ana]);
    const raspunsuri = await baza.db.query('select 1 from attempts where user_id = $1', [ana]);
    const cont = await baza.db.query('select 1 from auth.users where id = $1', [ana]);

    expect(profil.rows).toHaveLength(0);
    expect(notite.rows).toHaveLength(0);
    expect(raspunsuri.rows).toHaveLength(0);
    expect(cont.rows).toHaveLength(0);
  });

  it('nu atinge datele altcuiva', async () => {
    await baza.caUtilizator(bogdan, () =>
      baza.db.query('insert into notes (user_id, chapter_id, body) values ($1, $2, $3)', [
        bogdan,
        'bio-nervos',
        'notița lui Bogdan',
      ]),
    );

    await baza.caUtilizator(ana, () => baza.db.query('select public.sterge_contul()'));

    const ale = await baza.db.query('select 1 from notes where user_id = $1', [bogdan]);
    const cont = await baza.db.query('select 1 from auth.users where id = $1', [bogdan]);
    expect(ale.rows).toHaveLength(1);
    expect(cont.rows).toHaveLength(1);
  });

  /** Grilele scrise rămân: altfel ștergerea unui administrator ar goli biblioteca. */
  it('lasă în urmă grilele scrise de cont', async () => {
    await baza.db.query("update questions set created_by = $1 where id = 'bio-nervos-01'", [ana]);

    await baza.caUtilizator(ana, () => baza.db.query('select public.sterge_contul()'));

    const r = await baza.db.query<{ created_by: string | null }>(
      "select created_by from questions where id = 'bio-nervos-01'",
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]!.created_by).toBeNull();
  });

  it('nu e apelabilă de un vizitator neautentificat', async () => {
    const r = await baza.db.query<{ poate: boolean }>(
      `select has_function_privilege('anon', 'public.sterge_contul()', 'execute') as poate`,
    );
    expect(r.rows[0]!.poate).toBe(false);
  });

  it('refuză când cererea nu are sesiune', async () => {
    await baza.db.exec('set role authenticated;');
    try {
      await expect(baza.db.query('select public.sterge_contul()')).rejects.toThrow(/autentificat/i);
    } finally {
      await baza.db.exec('reset role;');
    }
  });
});

/**
 * Scrierea conținutului, prin `salveaza_grila`.
 *
 * Funcția rulează `security definer`, deci ocolește RLS prin construcție: poarta
 * e verificarea de rol din prima ei instrucțiune, nu o politică. De aceea testele
 * de aici insistă pe cine o poate chema, nu doar pe ce face.
 *
 * Validările sunt duplicate în formular, dar formularul e o sugestie — cererea
 * poate veni de oriunde cu cheia publicabilă, care e publică prin proiectare.
 */
describe('scrierea grilelor', () => {
  const grila = (peste: Record<string, unknown> = {}) =>
    JSON.stringify({
      id: 'bio-nervos-99',
      capId: 'bio-nervos',
      tip: 'simplu',
      status: 'publicata',
      text: 'Enunțul grilei de test',
      correct: 'B',
      expl: 'Explicația generală',
      src: 'Test',
      opts: [
        { key: 'A', text: 'varianta A', why: 'de ce cade A' },
        { key: 'B', text: 'varianta B', why: 'de ce ține B' },
        { key: 'C', text: 'varianta C' },
      ],
      ...peste,
    });

  const salveaza = (payload: string) =>
    baza.db.query('select public.salveaza_grila($1::jsonb)', [payload]);

  it('scrie grila și variantele ei', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () => salveaza(grila()));

    const q = await baza.db.query<{ text: string; correct: string; created_by: string }>(
      "select text, correct, created_by from questions where id = 'bio-nervos-99'",
    );
    const o = await baza.db.query<{ key: string; why: string | null }>(
      "select key, why from question_options where question_id = 'bio-nervos-99' order by key",
    );

    expect(q.rows[0]!.text).toBe('Enunțul grilei de test');
    expect(q.rows[0]!.correct).toBe('B');
    expect(q.rows[0]!.created_by).toBe(ana);
    expect(o.rows.map((r) => r.key)).toEqual(['A', 'B', 'C']);
    expect(o.rows[2]!.why).toBeNull();
  });

  /**
   * Proveniența ajunge chiar în tabel, nu doar în formular.
   *
   * Testul rulează RPC-ul, deci prinde exact ce n-ar prinde un test de randare:
   * o coloană uitată din `insert` sau din `on conflict do update` ar lăsa
   * interfața să pară că salvează, iar colecția s-ar pierde tăcut între ecran și
   * bază — invizibil până la primul import de cincizeci de grile.
   */
  it('scrie colecția și sursa, și le rescrie la reimportare', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () =>
      salveaza(grila({ sursa: 'subiect_oficial', an: 2026, colectie: '  Simulare 2026 UMFCD  ' })),
    );

    const dupaPrima = await baza.db.query<{ sursa: string; colectie: string; an: number }>(
      "select sursa, colectie, an from questions where id = 'bio-nervos-99'",
    );
    // Curățată de spații în bază, nu doar în formular: cererea poate veni de oriunde.
    expect(dupaPrima.rows[0]).toMatchObject({
      sursa: 'subiect_oficial',
      colectie: 'Simulare 2026 UMFCD',
      an: 2026,
    });

    // Upsert-ul pe id e felul în care se relipește un lot corectat: colecția
    // corectată trebuie s-o înlocuiască pe cea greșită, nu s-o păstreze.
    await baza.caUtilizator(ana, () =>
      salveaza(grila({ sursa: 'culegere', colectie: 'Corint – Sistemul nervos' })),
    );

    const dupaAdoua = await baza.db.query<{ sursa: string; colectie: string }>(
      "select sursa, colectie from questions where id = 'bio-nervos-99'",
    );
    expect(dupaAdoua.rows[0]).toMatchObject({
      sursa: 'culegere',
      colectie: 'Corint – Sistemul nervos',
    });
  });

  /** Colecția lipsă e cazul obișnuit: 181 de grile existente n-au una. */
  it('lasă colecția goală când payload-ul n-o trimite', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () => salveaza(grila()));

    const q = await baza.db.query<{ colectie: string }>(
      "select colectie from questions where id = 'bio-nervos-99'",
    );
    expect(q.rows[0]!.colectie).toBe('');
  });

  /** Exact constrângerea amânată care a impus RPC-ul; merită verificată prin rulare. */
  it('refuză un răspuns corect care nu e printre variante', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () => salveaza(grila({ correct: 'E' }))),
    ).rejects.toThrow(/dintre variantele scrise/i);
  });

  /** Cele cinci variante fixe ale complementului grupat, cerute de tipul lui. */
  const VARIANTE_GRUPAT = [
    { key: 'A', text: '1, 2, 3' },
    { key: 'B', text: '1, 3' },
    { key: 'C', text: '2, 4' },
    { key: 'D', text: 'doar 4' },
    { key: 'E', text: 'toate' },
  ];

  const grilaGrupata = (peste: Record<string, unknown> = {}) =>
    grila({ tip: 'grupat', opts: VARIANTE_GRUPAT, correct: 'B', ...peste });

  it('refuză complementul grupat fără cele patru afirmații', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () => salveaza(grilaGrupata({ enunturi: ['una', 'două'] }))),
    ).rejects.toThrow(/exact 4 afirmații/i);
  });

  /**
   * La complementul grupat textele variantelor sunt cheia fixă a formatului, nu
   * conținut: A = „1, 2, 3", B = „1, 3", și așa mai departe. Toate cele 110 grile
   * grupate din bază le au identice. Verificarea stă în bază fiindcă un import
   * poate veni de oriunde, nu doar din formularul care le completează singur.
   */
  it('refuză un complement grupat cu variante rescrise', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () =>
        salveaza(
          grilaGrupata({
            enunturi: ['a', 'b', 'c', 'd'],
            opts: [...VARIANTE_GRUPAT.slice(0, 4), { key: 'E', text: 'niciuna' }],
          }),
        ),
      ),
    ).rejects.toThrow(/variante fixe/i);
  });

  it('golește afirmațiile când grila nu mai e grupată', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () =>
      salveaza(grilaGrupata({ enunturi: ['a', 'b', 'c', 'd'] })),
    );
    await baza.caUtilizator(ana, () => salveaza(grila({ tip: 'simplu' })));

    const r = await baza.db.query<{ enunturi: string[] | null }>(
      "select enunturi from questions where id = 'bio-nervos-99'",
    );
    expect(r.rows[0]!.enunturi).toBeNull();
  });

  /** Înlocuire completă: o variantă scoasă din formular trebuie să dispară din bază. */
  it('nu lasă în urmă variante scoase la editare', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () => salveaza(grila()));
    await baza.caUtilizator(ana, () =>
      salveaza(
        grila({
          correct: 'A',
          opts: [
            { key: 'A', text: 'singura rămasă' },
            { key: 'B', text: 'și încă una' },
          ],
        }),
      ),
    );

    const o = await baza.db.query<{ key: string }>(
      "select key from question_options where question_id = 'bio-nervos-99' order by key",
    );
    expect(o.rows.map((r) => r.key)).toEqual(['A', 'B']);
  });

  it('refuză variante cu litere duplicate', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () =>
        salveaza(
          grila({
            correct: 'A',
            opts: [
              { key: 'A', text: 'una' },
              { key: 'A', text: 'alta' },
            ],
          }),
        ),
      ),
    ).rejects.toThrow(/duplicate/i);
  });

  it('refuză un capitol care nu există', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () => salveaza(grila({ capId: 'nu-exista' }))),
    ).rejects.toThrow(/capitolul nu există/i);
  });

  it('nu se lasă chemată de un elev', async () => {
    await expect(baza.caUtilizator(ana, () => salveaza(grila()))).rejects.toThrow(
      /administrator/i,
    );

    const r = await baza.db.query("select 1 from questions where id = 'bio-nervos-99'");
    expect(r.rows).toHaveLength(0);
  });

  it('nu e apelabilă de un vizitator neautentificat', async () => {
    const r = await baza.db.query<{ poate: boolean }>(
      `select has_function_privilege('anon', 'public.salveaza_grila(jsonb)', 'execute') as poate`,
    );
    expect(r.rows[0]!.poate).toBe(false);
  });
});

describe('ștergerea grilelor', () => {
  it('scoate grila și variantele ei', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () =>
      baza.db.query("select public.sterge_grila('bio-nervos-01')"),
    );

    const q = await baza.db.query("select 1 from questions where id = 'bio-nervos-01'");
    const o = await baza.db.query(
      "select 1 from question_options where question_id = 'bio-nervos-01'",
    );
    expect(q.rows).toHaveLength(0);
    expect(o.rows).toHaveLength(0);
  });

  /**
   * `attempts` e jurnal: ștergerea unei grile la care s-a răspuns ar rescrie
   * retroactiv istoricul cuiva. Schema refuză oricum prin cheia externă, dar
   * mesajul brut de Postgres nu spune elevului ce să facă în schimb.
   */
  it('refuză o grilă la care s-a răspuns și trimite spre retragere', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source)
         values ($1, 'bio-nervos-01', 'B', true, 'sesiune')`,
        [ana],
      ),
    );
    await baza.faAdmin(ana);

    await expect(
      baza.caUtilizator(ana, () => baza.db.query("select public.sterge_grila('bio-nervos-01')")),
    ).rejects.toThrow(/retrage-o/i);

    const q = await baza.db.query("select 1 from questions where id = 'bio-nervos-01'");
    expect(q.rows).toHaveLength(1);
  });

  it('nu se lasă chemată de un elev', async () => {
    await expect(
      baza.caUtilizator(ana, () => baza.db.query("select public.sterge_grila('bio-nervos-01')")),
    ).rejects.toThrow(/administrator/i);
  });
});

/**
 * Taxonomia publică.
 *
 * Materiile și capitolele existau în două locuri — tabelele astea și constanta
 * compilată din `src/data/chapters.ts` — și au și divergit: baza are materia
 * `ant` cu 8 capitole pe care fișierul nu le cunoaște. Constanta exista fiindcă
 * pagina de prezentare numără capitole fără sesiune, iar citirea era dată doar
 * lui `authenticated`. Politicile de mai jos sunt ce face fișierul de prisos, așa
 * că merită verificate prin rulare: fără ele, pagina publică s-ar goli tăcut.
 */
describe('taxonomia', () => {
  it('se citește de un vizitator fără cont, cât timp e publicată', async () => {
    const r = await baza.caVizitator(() =>
      baza.db.query<{ materii: number; capitole: number; centre: number }>(
        `select (select count(*)::int from materii)         as materii,
                (select count(*)::int from chapters)        as capitole,
                (select count(*)::int from centre_admitere) as centre`,
      ),
    );

    expect(r.rows[0]!.materii).toBe(2);
    expect(r.rows[0]!.capitole).toBe(22);
    expect(r.rows[0]!.centre).toBe(1);
  });

  it('ascunde de vizitator materia nepublicată', async () => {
    await baza.db.query("update materii set publicat = false where id = 'chim'");

    const r = await baza.caVizitator(() =>
      baza.db.query<{ id: string }>('select id from materii order by id'),
    );

    expect(r.rows.map((m) => m.id)).toEqual(['bio']);
  });

  /**
   * Capitolul are propriul `publicat`, dar a-l lăsa singur ar însemna că
   * ascunderea unei materii îi lasă capitolele numărabile de pe pagina publică —
   * adică exact cifra pe care pagina o afișează.
   */
  it('ascunde de vizitator și capitolele unei materii nepublicate', async () => {
    await baza.db.query("update materii set publicat = false where id = 'chim'");

    const r = await baza.caVizitator(() =>
      baza.db.query<{ n: number }>(
        "select count(*)::int as n from chapters where materie_id = 'chim'",
      ),
    );

    expect(r.rows[0]!.n).toBe(0);
  });

  it('nu deschide și grilele către un vizitator', async () => {
    const r = await baza.caVizitator(() =>
      baza.db.query<{ grile: number; variante: number }>(
        `select (select count(*)::int from questions)        as grile,
                (select count(*)::int from question_options) as variante`,
      ),
    );

    expect(r.rows[0]!.grile).toBe(0);
    expect(r.rows[0]!.variante).toBe(0);
  });

  it('ascunde de elev materia nepublicată, dar i-o arată administratorului', async () => {
    await baza.db.query("update materii set publicat = false where id = 'chim'");

    const aleElevului = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from materii'),
    );
    await baza.faAdmin(ana);
    const aleAdminului = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from materii'),
    );

    expect(aleElevului.rows[0]!.n).toBe(1);
    expect(aleAdminului.rows[0]!.n).toBe(2);
  });

  it('nu se lasă scrisă de un elev, dar primește un centru de la administrator', async () => {
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query("insert into centre_admitere (id, nume) values ('umfiasi', 'UMF Iași')"),
      ),
    ).rejects.toThrow(/row-level security/i);

    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () =>
      baza.db.query("insert into centre_admitere (id, nume) values ('umfiasi', 'UMF Iași')"),
    );

    const r = await baza.db.query<{ n: number }>('select count(*)::int as n from centre_admitere');
    expect(r.rows[0]!.n).toBe(2);
  });

  it('leagă fiecare materie de un centru existent', async () => {
    const r = await baza.db.query<{ centru_id: string }>('select distinct centru_id from materii');
    expect(r.rows.map((m) => m.centru_id)).toEqual(['umfcd']);

    await expect(
      baza.db.query("update materii set centru_id = 'inexistent' where id = 'bio'"),
    ).rejects.toThrow(/foreign key|violates/i);
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
          `insert into questions (id, chapter_id, tip, tip_id, text, correct, expl, src)
           values ('strecurata-01', 'bio-nervos', 'simplu', 'simplu', 'a mea', 'A', 'x', 'y')`,
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
