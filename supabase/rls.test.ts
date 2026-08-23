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
  const RPC_INTENTIONAT = [
    'atribuie_colectia',
    'salveaza_capitol',
    'salveaza_colectie',
    'salveaza_grila',
    'salveaza_materie',
    'schimba_starea_grilelor',
    'sterge_contul',
    'sterge_grila',
  ];

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
  /** Două colecții de probă, ca grila să aibă spre ce arăta. */
  const doualaColectii = async () => {
    await baza.db.query(`
      insert into colectii (id, centru_id, nume, tip, an) values
        ('umfcd-2026-simulare', 'umfcd', 'Simulare 2026 UMFCD', 'simulare_oficiala', 2026),
        ('corint-nervos', null, 'Corint – Sistemul nervos', 'culegere', null)
    `);
  };

  it('scrie colecția și sursa, și le rescrie la reimportare', async () => {
    await baza.faAdmin(ana);
    await doualaColectii();
    await baza.caUtilizator(ana, () =>
      salveaza(grila({ sursa: 'subiect_oficial', an: 2026, colectie: '  umfcd-2026-simulare  ' })),
    );

    const dupaPrima = await baza.db.query<{ sursa: string; colectie_id: string; an: number }>(
      "select sursa, colectie_id, an from questions where id = 'bio-nervos-99'",
    );
    // Curățată de spații în bază, nu doar în formular: cererea poate veni de oriunde.
    expect(dupaPrima.rows[0]).toMatchObject({
      sursa: 'subiect_oficial',
      colectie_id: 'umfcd-2026-simulare',
      an: 2026,
    });

    // Upsert-ul pe id e felul în care se relipește un lot corectat: colecția
    // corectată trebuie s-o înlocuiască pe cea greșită, nu s-o păstreze.
    await baza.caUtilizator(ana, () =>
      salveaza(grila({ sursa: 'culegere', colectie: 'corint-nervos' })),
    );

    const dupaAdoua = await baza.db.query<{ sursa: string; colectie_id: string }>(
      "select sursa, colectie_id from questions where id = 'bio-nervos-99'",
    );
    expect(dupaAdoua.rows[0]).toMatchObject({
      sursa: 'culegere',
      colectie_id: 'corint-nervos',
    });
  });

  /**
   * Colecția era text liber până la migrarea 0011. O greșeală de tipar crea
   * tăcut un lot fantomă: grila părea salvată, dar nu apărea în niciun filtru pe
   * colecția pe care autorul credea că a scris-o.
   */
  it('refuză o colecție care nu există', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () => salveaza(grila({ colectie: 'lot-inventat' }))),
    ).rejects.toThrow(/Colecția nu există/i);
  });

  /** Colecția lipsă e cazul obișnuit: 181 de grile existente n-au una. */
  it('lasă colecția goală când payload-ul n-o trimite', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () => salveaza(grila()));

    const q = await baza.db.query<{ colectie_id: string | null }>(
      "select colectie_id from questions where id = 'bio-nervos-99'",
    );
    expect(q.rows[0]!.colectie_id).toBeNull();
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

/**
 * Colecțiile — loturile din care vin grilele.
 *
 * Spre deosebire de taxonomie, nu se deschid către vizitatori: pagina publică
 * n-are ce număra aici, iar lista de culegeri digitizate e chiar subiectul
 * întrebării de drepturi. Politicile sunt cele obișnuite — publicat pentru elev,
 * tot pentru administrator, scriere doar de administrator.
 */
describe('colecțiile', () => {
  const doua = () =>
    baza.db.query(`
      insert into colectii (id, centru_id, nume, tip, an, publicat) values
        ('umfcd-2026-mg', 'umfcd', 'Admitere UMFCD 2026', 'subiect_oficial', 2026, true),
        ('corint-nervos', null, 'Corint – Sistemul nervos', 'culegere', null, false)
    `);

  it('arată elevului doar colecțiile publicate, iar administratorului pe toate', async () => {
    await doua();

    const aleElevului = await baza.caUtilizator(ana, () =>
      baza.db.query<{ id: string }>('select id from colectii order by id'),
    );
    await baza.faAdmin(ana);
    const aleAdminului = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from colectii'),
    );

    expect(aleElevului.rows.map((c) => c.id)).toEqual(['umfcd-2026-mg']);
    expect(aleAdminului.rows[0]!.n).toBe(2);
  });

  it('nu se lasă scrisă de un elev', async () => {
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query("insert into colectii (id, nume, tip) values ('a-mea', 'A mea', 'autor')"),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  /** Nu sunt publice: lista de culegeri digitizate nu se citește fără cont. */
  it('nu se văd de un vizitator fără cont', async () => {
    await doua();

    const r = await baza.caVizitator(() =>
      baza.db.query<{ n: number }>('select count(*)::int as n from colectii'),
    );

    expect(r.rows[0]!.n).toBe(0);
  });
});

/**
 * Acoperirea și operațiile în masă.
 *
 * Acoperirea e `security invoker` intenționat: rulează cu drepturile celui care
 * o cheamă, deci RLS decide ce se numără. Un elev n-are ce căuta în ciornele
 * nepublicate nici măcar ca cifră — iar o funcție `security definer` ar fi
 * trebuit să reimplementeze `questions_citire` pe cont propriu.
 */
describe('acoperirea capitolelor', () => {
  it('numără pe stări, iar elevul nu vede ciornele nici ca cifră', async () => {
    await baza.db.query("update questions set status = 'ciorna' where id = 'bio-nervos-01'");

    const alElevului = await baza.caUtilizator(ana, () =>
      baza.db.query<{ chapter_id: string; ciorna: number; publicata: number }>(
        "select * from public.acoperire_capitole() where chapter_id = 'bio-nervos'",
      ),
    );
    await baza.faAdmin(ana);
    const alAdminului = await baza.caUtilizator(ana, () =>
      baza.db.query<{ chapter_id: string; ciorna: number; publicata: number }>(
        "select * from public.acoperire_capitole() where chapter_id = 'bio-nervos'",
      ),
    );

    // Singura grilă din capitol e acum ciornă: elevul nu vede niciun rând.
    expect(alElevului.rows).toHaveLength(0);
    expect(alAdminului.rows[0]).toMatchObject({ ciorna: 1, publicata: 0 });
  });
});

describe('operațiile în masă', () => {
  it('publică mai multe grile deodată și spune câte a atins', async () => {
    await baza.faAdmin(ana);
    await baza.db.query("update questions set status = 'ciorna'");

    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ schimba_starea_grilelor: number }>(
        "select public.schimba_starea_grilelor(array['bio-nervos-01', 'bio-sange-01'], 'publicata')",
      ),
    );

    expect(r.rows[0]!.schimba_starea_grilelor).toBe(2);
    const publicate = await baza.db.query<{ n: number }>(
      "select count(*)::int as n from questions where status = 'publicata'",
    );
    expect(publicate.rows[0]!.n).toBe(2);
  });

  it('nu se lasă chemate de un elev', async () => {
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query("select public.schimba_starea_grilelor(array['bio-nervos-01'], 'publicata')"),
      ),
    ).rejects.toThrow(/administrator/i);

    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query("select public.atribuie_colectia(array['bio-nervos-01'], null)"),
      ),
    ).rejects.toThrow(/administrator/i);
  });

  it('refuză o stare necunoscută în loc s-o scrie', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query("select public.schimba_starea_grilelor(array['bio-nervos-01'], 'arhivata')"),
      ),
    ).rejects.toThrow(/Stare necunoscută/i);
  });

  /** Aceeași regulă ca la salvare: o colecție inventată n-are voie să intre. */
  it('atribuie o colecție unui lot și refuză una inexistentă', async () => {
    await baza.faAdmin(ana);
    await baza.db.query(
      "insert into colectii (id, centru_id, nume, tip) values ('umfcd-2026-mg', 'umfcd', 'Admitere 2026', 'subiect_oficial')",
    );

    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ atribuie_colectia: number }>(
        "select public.atribuie_colectia(array['bio-nervos-01', 'bio-sange-01'], 'umfcd-2026-mg')",
      ),
    );
    expect(r.rows[0]!.atribuie_colectia).toBe(2);

    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query("select public.atribuie_colectia(array['bio-nervos-01'], 'lot-inventat')"),
      ),
    ).rejects.toThrow(/Colecția nu există/i);
  });
});

/**
 * Scrierea taxonomiei și a colecțiilor.
 *
 * Politicile permit deja unui administrator să scrie direct în tabele; funcțiile
 * există pentru regulile care nu au voie să depindă de client. Cea mai
 * importantă: **id-ul e identitate**, scris în `questions`, în
 * `sessions.chapter_ids` și în cheia notițelor. Ce apără testele de aici e
 * tocmai ce n-ar fi apărat un formular.
 */
describe('scrierea taxonomiei', () => {
  it('creează și redenumește o materie, dar nu de către un elev', async () => {
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query(`select public.salveaza_materie('{"id":"fiz","nume":"Fizică"}'::jsonb)`),
      ),
    ).rejects.toThrow(/administrator/i);

    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () =>
      baza.db.query(`select public.salveaza_materie('{"id":"fiz","nume":"Fizică"}'::jsonb)`),
    );
    await baza.caUtilizator(ana, () =>
      baza.db.query(`select public.salveaza_materie('{"id":"fiz","nume":"Fizică — probă"}'::jsonb)`),
    );

    const r = await baza.db.query<{ name: string; centru_id: string }>(
      "select name, centru_id from materii where id = 'fiz'",
    );
    expect(r.rows[0]).toMatchObject({ name: 'Fizică — probă', centru_id: 'umfcd' });
  });

  it('refuză un identificator care nu e un slug', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query(`select public.salveaza_materie('{"id":"Fizica Generala","nume":"x"}'::jsonb)`),
      ),
    ).rejects.toThrow(/litere mici/i);
  });

  /**
   * Numele unui capitol se poate corecta oricând. Apartenența la materie, nu:
   * mutarea unui capitol cu grile ar rescrie retroactiv la ce materie a răspuns
   * elevul, iar `attempts` e jurnal — nu are cum să fie corectat după.
   */
  it('nu mută un capitol cu grile în altă materie, dar îl lasă redenumit', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () =>
      baza.db.query(`select public.salveaza_materie('{"id":"fiz","nume":"Fizică"}'::jsonb)`),
    );

    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query(
          `select public.salveaza_capitol('{"id":"bio-nervos","materieId":"fiz","nume":"Sistemul nervos"}'::jsonb)`,
        ),
      ),
    ).rejects.toThrow(/nu se mai poate muta/i);

    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `select public.salveaza_capitol('{"id":"bio-nervos","materieId":"bio","nr":"03","nume":"Sistemul nervos (revizuit)"}'::jsonb)`,
      ),
    );
    const r = await baza.db.query<{ name: string }>("select name from chapters where id = 'bio-nervos'");
    expect(r.rows[0]!.name).toBe('Sistemul nervos (revizuit)');
  });

  it('refuză un capitol pus într-o materie inexistentă', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query(`select public.salveaza_capitol('{"id":"x-1","materieId":"nu-exista","nume":"X"}'::jsonb)`),
      ),
    ).rejects.toThrow(/Materia nu există/i);
  });

  it('scrie o colecție cu felul și anul ei, și refuză un fel necunoscut', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `select public.salveaza_colectie('{"id":"corint-nervos","nume":"Corint","tip":"culegere","sursaBibliografica":"Corint, ed. 2024"}'::jsonb)`,
      ),
    );

    const r = await baza.db.query<{ tip: string; centru_id: string | null; sursa_bibliografica: string }>(
      "select tip::text, centru_id, sursa_bibliografica from colectii where id = 'corint-nervos'",
    );
    // Culegerea n-are centru: o carte nu ține de un centru de admitere.
    expect(r.rows[0]).toMatchObject({ tip: 'culegere', centru_id: null, sursa_bibliografica: 'Corint, ed. 2024' });

    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query(`select public.salveaza_colectie('{"id":"x","nume":"X","tip":"ziar"}'::jsonb)`),
      ),
    ).rejects.toThrow(/Fel de colecție necunoscut/i);
  });

  /**
   * O redenumire nu e o reordonare.
   *
   * Formularul de redenumire nu are de unde ști poziția: `Chapter`, `Materie` și
   * `Colectie` o consumă la sortare și n-o mai poartă pe obiect. Prima versiune
   * trimitea `position: 0`, deci orice corectare de titlu muta rândul în capul
   * listei — materiile, capitolele și colecțiile se citesc toate `order by
   * position`. Regula stă acum în bază: **o cheie absentă înseamnă „las-o cum
   * e"**, exact ce vrea să spună un formular de redenumire.
   */
  it('păstrează poziția și publicarea când doar se redenumește', async () => {
    await baza.faAdmin(ana);

    const inainte = await baza.db.query<{ position: number }>(
      "select position from chapters where id = 'bio-nervos'",
    );
    expect(inainte.rows[0]!.position).toBeGreaterThan(0);

    await baza.db.query("update chapters set publicat = false where id = 'bio-nervos'");

    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `select public.salveaza_capitol('{"id":"bio-nervos","materieId":"bio","nr":"03","nume":"Sistemul nervos"}'::jsonb)`,
      ),
    );

    const dupa = await baza.db.query<{ position: number; publicat: boolean }>(
      "select position, publicat from chapters where id = 'bio-nervos'",
    );
    expect(dupa.rows[0]!.position).toBe(inainte.rows[0]!.position);
    expect(dupa.rows[0]!.publicat).toBe(false);
  });

  /** Un rând nou se pune la coadă, nu peste poziția altuia. */
  it('pune o materie nouă la coada listei, fără să i se spună poziția', async () => {
    await baza.faAdmin(ana);
    const max = await baza.db.query<{ m: number }>('select max(position) as m from materii');

    await baza.caUtilizator(ana, () =>
      baza.db.query(`select public.salveaza_materie('{"id":"fiz","nume":"Fizică"}'::jsonb)`),
    );

    const r = await baza.db.query<{ position: number }>("select position from materii where id = 'fiz'");
    expect(r.rows[0]!.position).toBe(max.rows[0]!.m + 1);
  });

  /** La fel pentru colecții: anul și cartea nu se pierd la o redenumire. */
  it('păstrează anul, cartea și poziția colecției la redenumire', async () => {
    await baza.faAdmin(ana);
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `select public.salveaza_colectie('{"id":"corint-nervos","nume":"Corint","tip":"culegere","an":2024,"sursaBibliografica":"Corint, ed. 2024"}'::jsonb)`,
      ),
    );
    const inainte = await baza.db.query<{ position: number }>(
      "select position from colectii where id = 'corint-nervos'",
    );

    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `select public.salveaza_colectie('{"id":"corint-nervos","nume":"Corint · Biologie","tip":"culegere"}'::jsonb)`,
      ),
    );

    const r = await baza.db.query<{
      nume: string;
      an: number | null;
      sursa_bibliografica: string;
      position: number;
    }>("select nume, an, sursa_bibliografica, position from colectii where id = 'corint-nervos'");
    expect(r.rows[0]).toMatchObject({
      nume: 'Corint · Biologie',
      an: 2024,
      sursa_bibliografica: 'Corint, ed. 2024',
      position: inainte.rows[0]!.position,
    });
  });
});
