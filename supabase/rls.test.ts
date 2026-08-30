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

/**
 * Plasa de sub toate celelalte teste de aici.
 *
 * Fiecare test de mai jos verifică o politică anume, ceea ce înseamnă că
 * verifică un tabel la care cineva s-a gândit. Tabelul la care nu s-a gândit
 * nimeni e tocmai cel periculos: Supabase acordă implicit `select/insert/
 * update/delete` lui `anon` și `authenticated` pe orice tabel nou din `public`,
 * deci un `enable row level security` uitat nu dă nicio eroare — publică
 * tabelul întreg, pentru oricine are cheia publicabilă.
 *
 * Testul ăsta nu întreabă ce politici există, ci dacă mai există vreun tabel
 * fără RLS. E singurul de aici care apără și tabelele care încă nu s-au scris.
 */
describe('fiecare tabel din public', () => {
  it('are RLS pornit', async () => {
    const r = await baza.db.query<{ relname: string }>(`
      select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      order by c.relname
    `);
    expect(r.rows.map((x) => x.relname)).toEqual([]);
  });

  /**
   * RLS pornit fără nicio politică refuză tot, ceea ce e sigur dar arată ca un
   * tabel stricat. Perechea celuilalt test: unul prinde tabelul deschis, ăsta
   * prinde tabelul mut.
   */
  it('are cel puțin o politică', async () => {
    const r = await baza.db.query<{ relname: string }>(`
      select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
      order by c.relname
    `);
    expect(r.rows.map((x) => x.relname)).toEqual([]);
  });
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
    'citeste_grila_admin',
    'citeste_test',
    'citeste_teste_predefinite_admin',
    'exporta_grile_admin',
    'genereaza_test',
    'importa_simulare_veche',
    'lista_teste_predefinite',
    'numara_candidati',
    'preda_test',
    'raspunde',
    'salveaza_capitol',
    'salveaza_colectie',
    'salveaza_grila',
    'salveaza_materie',
    'salveaza_test_predefinit',
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

  /**
   * Fără `search_path` fix, cine poate crea obiecte într-o schemă din calea de
   * căutare poate pune în fața unei funcții de sistem una a lui, iar corpul
   * `security definer` o execută cu drepturi de proprietar.
   *
   * Lista e numită, nu numărată: un simplu `toHaveLength` trece dacă adaugi o
   * funcție și ștergi alta, și oricum nu spune care lipsește când pică.
   */
  it('au toate un search_path fix', async () => {
    const r = await baza.db.query<{ proname: string; proconfig: string[] | null }>(`
      select p.proname, p.proconfig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private'
      order by p.proname
    `);

    expect(r.rows.map((x) => x.proname)).toEqual([
      'are_acces',
      'candidati',
      'completeaza_materia',
      'genereaza_test_din_regula',
      'genereaza_test_predefinit',
      'handle_new_user',
      'ingheata_instantaneul',
      'is_admin',
      'predata_la',
      'propaga_materia',
      'protect_role',
      'sursa_pentru',
      'touch_updated_at',
    ]);
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
    await expect(
      baza.caVizitator(() => baza.db.query('select id from questions limit 1')),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      baza.caVizitator(() => baza.db.query('select question_id from question_options limit 1')),
    ).rejects.toThrow(/permission denied/i);
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

/**
 * Favoritele — un tabel nou, deci exact clasa de scăpare pe care o prinde
 * „fiecare tabel din public": Supabase acordă implicit drepturi lui `anon` și
 * `authenticated` pe orice tabel proaspăt, iar un `enable row level security`
 * uitat nu dă nicio eroare, doar publică tot.
 */
describe('favoritele', () => {
  it('nu se văd între elevi', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query('insert into favorite (user_id, question_id) values ($1, $2)', [ana, 'bio-nervos-01']),
    );

    const aleLuiBogdan = await baza.caUtilizator(bogdan, () =>
      baza.db.query<{ question_id: string }>('select question_id from favorite'),
    );
    expect(aleLuiBogdan.rows).toEqual([]);

    const aleAnei = await baza.caUtilizator(ana, () =>
      baza.db.query<{ question_id: string }>('select question_id from favorite'),
    );
    expect(aleAnei.rows.map((x) => x.question_id)).toEqual(['bio-nervos-01']);
  });

  it('nu pot fi puse pe contul altcuiva', async () => {
    await expect(
      baza.caUtilizator(bogdan, () =>
        baza.db.query('insert into favorite (user_id, question_id) values ($1, $2)', [ana, 'bio-nervos-01']),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  /** Un vizitator fără sesiune n-are ce căuta în tabel, în niciun fel. */
  it('nu sunt citibile de un vizitator', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query('insert into favorite (user_id, question_id) values ($1, $2)', [ana, 'bio-nervos-01']),
    );

    const r = await baza.caVizitator(() => baza.db.query('select question_id from favorite'));
    expect(r.rows).toEqual([]);
  });
});

/**
 * Lucrările — masa de lucru comună a tuturor felurilor de test.
 *
 * Două lucruri se apără aici, și niciunul nu dă eroare când e greșit: că
 * lucrarea unui elev nu e vizibilă altuia, și că instantaneul ei nu se mai
 * poate schimba după ce a fost generat. A doua e regula pe care se sprijină
 * tot restul — răspunsurile se cheie pe poziție, deci o poziție mutată nu
 * strică lucrarea, ci o rescrie.
 */
describe('lucrările', () => {
  const faLucrare = async (userId: string, nr = 2) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ id: string }>(
        `insert into test_runs (user_id, mod, nr_cerut) values ($1, 'exersare', $2) returning id`,
        [userId, nr],
      ),
    );
    const id = r.rows[0]!.id;
    await baza.caUtilizator(userId, () =>
      baza.db.query(
        `insert into test_run_items (run_id, position, question_id)
         values ($1, 0, 'bio-nervos-01'), ($1, 1, 'bio-celula-01')`,
        [id],
      ),
    );
    return id;
  };

  it('nu se văd între elevi, nici lucrarea, nici grilele ei', async () => {
    await faLucrare(ana);

    const lucrari = await baza.caUtilizator(bogdan, () => baza.db.query('select * from test_runs'));
    expect(lucrari.rows).toEqual([]);

    const grile = await baza.caUtilizator(bogdan, () => baza.db.query('select * from test_run_items'));
    expect(grile.rows).toEqual([]);
  });

  it('nu pot primi grile de la altcineva', async () => {
    const alAnei = await faLucrare(ana);

    await expect(
      baza.caUtilizator(bogdan, () =>
        baza.db.query(
          `insert into test_run_items (run_id, position, question_id) values ($1, 9, 'bio-celula-01')`,
          [alAnei],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  /**
   * Miezul. O grilă mutată pe altă poziție dezlipește tot ce s-a răspuns după
   * ea, fiindcă `attempts.client_key` e `'<lucrare>:<poziție>'`. Un `with check`
   * n-ar putea prinde asta — vede doar rândul nou — deci regula e declanșator.
   */
  it('nu-și mai schimbă instantaneul după generare', async () => {
    const id = await faLucrare(ana);

    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query("update test_run_items set question_id = 'bio-celula-01' where run_id = $1 and position = 0", [id]),
      ),
    ).rejects.toThrow(/nu se mai schimbă/i);

    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query('update test_run_items set position = 5 where run_id = $1 and position = 0', [id]),
      ),
    ).rejects.toThrow(/nu se mai schimbă/i);

    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query(
          `update test_run_items set option_order = array['B','A','C','D','E']::option_key[]
           where run_id = $1 and position = 0`,
          [id],
        ),
      ),
    ).rejects.toThrow(/nu se mai schimbă/i);
  });

  it('lasă răspunsul să se schimbe cât timp lucrarea e în lucru', async () => {
    const id = await faLucrare(ana);

    await baza.caUtilizator(ana, () =>
      baza.db.query("update test_run_items set chosen = 'B', answered_at = now() where run_id = $1 and position = 0", [id]),
    );
    await baza.caUtilizator(ana, () =>
      baza.db.query("update test_run_items set chosen = 'C' where run_id = $1 and position = 0", [id]),
    );

    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ chosen: string }>('select chosen from test_run_items where run_id = $1 and position = 0', [id]),
    );
    expect(r.rows[0]!.chosen).toBe('C');
  });

  /** După predare, lucrarea e ce a fost la predare — altfel scorul e o părere. */
  it('nu mai lasă răspunsurile să se schimbe după predare', async () => {
    const id = await faLucrare(ana);
    await baza.caUtilizator(ana, () =>
      baza.db.query("update test_run_items set chosen = 'B' where run_id = $1 and position = 0", [id]),
    );
    await baza.caUtilizator(ana, () =>
      baza.db.query('update test_runs set finished_at = now() where id = $1', [id]),
    );

    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query("update test_run_items set chosen = 'A' where run_id = $1 and position = 0", [id]),
      ),
    ).rejects.toThrow(/predată/i);

    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query('update test_run_items set marked = true where run_id = $1 and position = 0', [id]),
      ),
    ).rejects.toThrow(/predată/i);
  });

  /**
   * O lucrare se aruncă întreagă, nu rând cu rând: scoaterea unei poziții din
   * mijloc renumerotează tot ce urmează. De aceea `test_run_items` n-are
   * politică de ștergere, dar cascada de la lucrare curăță corect.
   */
  it('nu se pot scoate grile una câte una, dar lucrarea se aruncă întreagă', async () => {
    const id = await faLucrare(ana);

    await baza.caUtilizator(ana, () =>
      baza.db.query('delete from test_run_items where run_id = $1 and position = 1', [id]),
    );
    const ramase = await baza.caUtilizator(ana, () =>
      baza.db.query('select position from test_run_items where run_id = $1', [id]),
    );
    expect(ramase.rows).toHaveLength(2);

    await baza.caUtilizator(ana, () => baza.db.query('delete from test_runs where id = $1', [id]));
    const dupa = await baza.db.query('select * from test_run_items where run_id = $1', [id]);
    expect(dupa.rows).toEqual([]);
  });

  /**
   * Grila poate dispărea din bibliotecă; lucrarea rămâne. Fără cheie externă pe
   * `question_id`, o retragere de conținut nu poate strica o lucrare dată, iar
   * pozițiile nu se mișcă.
   */
  it('supraviețuiește ștergerii unei grile din bibliotecă', async () => {
    const id = await faLucrare(ana);

    // Variantele cad în cascadă; șterse întâi, ar rupe cheia amânată
    // `questions_correct_exists`, care cere ca varianta corectă să existe.
    await baza.db.query("delete from questions where id = 'bio-nervos-01'");

    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ position: number; question_id: string }>(
        'select position, question_id from test_run_items where run_id = $1 order by position',
        [id],
      ),
    );
    expect(r.rows.map((x) => x.question_id)).toEqual(['bio-nervos-01', 'bio-celula-01']);
  });

  it('refuză o lucrare cu limita de timp înaintea începutului', async () => {
    await expect(
      baza.caUtilizator(ana, () =>
        baza.db.query(
          `insert into test_runs (user_id, mod, nr_cerut, ends_at)
           values ($1, 'simulare', 10, now() - interval '1 hour')`,
          [ana],
        ),
      ),
    ).rejects.toThrow(/test_runs_ends_after_start/i);
  });
});


/**
 * Generarea testului.
 *
 * Seed-ul are 6 grile (vezi `src/data/questions.ts`), toate publicate: 4 de
 * biologie și 2 de chimie, 4 complement simplu și 2 grupat. Cifrele mici sunt
 * un avantaj, nu o limitare — cazul „ai cerut mai multe decât există" e greu de
 * produs pe o bancă mare și e tocmai cel care, netratat, umflă tăcut procentul.
 */
describe('generarea testului', () => {
  type Rezultat = {
    run_id: string;
    nr_cerut: number;
    nr_obtinut: number;
    insuficient: boolean;
    lipsa: { materie_id: string; lipsa: number }[];
  };

  const genereaza = async (userId: string, payload: object) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ rezultat: Rezultat }>('select public.genereaza_test($1::jsonb) as rezultat', [
        JSON.stringify(payload),
      ]),
    );
    return r.rows[0]!.rezultat;
  };

  // `option_order` se întoarce ca literal Postgres (`{A,B,C}`), nu ca listă, deci
  // se cere direct ca text unit — altfel un `new Set(...)` numără caractere.
  const pozitii = async (userId: string, runId: string) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ position: number; question_id: string; ordine: string | null }>(
        `select position, question_id, array_to_string(option_order, ',') as ordine
         from test_run_items where run_id = $1 order by position`,
        [runId],
      ),
    );
    return r.rows;
  };

  /**
   * Nu „neautentificat", ci refuz din drepturi: `execute` e revocat de la `anon`,
   * deci cererea nici nu ajunge în corpul funcției. E gardul mai tare dintre cele
   * două, și tocmai de aceea merită pinuit — o acordare pusă din neatenție l-ar
   * coborî tăcut la verificarea dinăuntru.
   */
  it('nu e apelabilă de un vizitator fără sesiune', async () => {
    await expect(
      baza.caVizitator(() => baza.db.query(`select public.genereaza_test('{"nr":3}'::jsonb)`)),
    ).rejects.toThrow(/permission denied/i);
  });

  it('scrie o lucrare cu pozițiile numerotate de la zero, fără repetări', async () => {
    const rez = await genereaza(ana, { mod: 'exersare', nr: 4 });

    expect(rez.nr_obtinut).toBe(4);
    expect(rez.insuficient).toBe(false);

    const items = await pozitii(ana, rez.run_id);
    expect(items.map((x) => x.position)).toEqual([0, 1, 2, 3]);
    expect(new Set(items.map((x) => x.question_id)).size).toBe(4);
  });

  /**
   * `buildOrder` repeta banca ciclic (`pool[i % pool.length]`) ca să umple
   * numărul cerut — cu 6 grile era un compromis, cu o bancă adevărată e un bug.
   * Aici o grilă se poate trage o singură dată **prin construcție**, fiindcă
   * selecția e peste `questions.id`.
   */
  it('nu repetă niciodată o grilă, nici când se cere mai mult decât există', async () => {
    for (let i = 0; i < 40; i += 1) {
      const rez = await genereaza(ana, { mod: 'exersare', nr: 50 });
      const items = await pozitii(ana, rez.run_id);
      expect(new Set(items.map((x) => x.question_id)).size).toBe(items.length);
    }
  });

  /**
   * Livrează mai puțin și **o spune**. `nr_cerut` rămâne ce s-a cerut, fiindcă
   * el e numitorul scorului: o lucrare mai scurtă n-are voie să umfle procentul.
   */
  it('spune când sunt mai puține decât s-au cerut, și păstrează numitorul', async () => {
    const rez = await genereaza(ana, { mod: 'exersare', nr: 50 });

    expect(rez.nr_obtinut).toBe(6);
    expect(rez.nr_cerut).toBe(50);
    expect(rez.insuficient).toBe(true);

    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ nr_cerut: number }>('select nr_cerut from test_runs where id = $1', [rez.run_id]),
    );
    expect(r.rows[0]!.nr_cerut).toBe(50);
  });

  /** O simulare oficială care trebuie să aibă fix 100 de grile nu poate livra 47. */
  it('refuză, în loc să scurteze, când formatul e strict', async () => {
    await expect(genereaza(ana, { mod: 'simulare', nr: 50, strict: true })).rejects.toThrow(
      /insuficient_strict/i,
    );
  });

  it('respectă cotele pe materii și spune exact ce a lipsit', async () => {
    const rez = await genereaza(ana, {
      mod: 'simulare',
      cote: [
        { materie_id: 'bio', nr: 2 },
        { materie_id: 'chim', nr: 5 },
      ],
    });

    expect(rez.nr_cerut).toBe(7);
    expect(rez.nr_obtinut).toBe(4);
    expect(rez.lipsa).toEqual([{ materie_id: 'chim', lipsa: 3 }]);

    const items = await pozitii(ana, rez.run_id);
    const materii = await baza.db.query<{ materie_id: string; n: number }>(
      `select q.materie_id, count(*)::int as n from questions q
       where q.id = any ($1::text[]) group by 1 order by 1`,
      [items.map((x) => x.question_id)],
    );
    expect(materii.rows).toEqual([
      { materie_id: 'bio', n: 2 },
      { materie_id: 'chim', n: 2 },
    ]);
  });

  it('nu compune nimic dacă filtrele nu lasă nicio grilă', async () => {
    await expect(
      genereaza(ana, { mod: 'exersare', nr: 5, filtre: { capitole: ['chim-izomerie'] } }),
    ).rejects.toThrow(/fara_candidati/i);
  });

  it('ține scopul: pe un capitol vin numai grilele lui', async () => {
    const rez = await genereaza(ana, { mod: 'exersare', nr: 5, filtre: { capitole: ['bio-nervos'] } });
    const items = await pozitii(ana, rez.run_id);

    expect(items).toHaveLength(1);
    const straine = await baza.db.query<{ n: number }>(
      `select count(*)::int as n from questions where id = any ($1::text[]) and chapter_id <> 'bio-nervos'`,
      [items.map((x) => x.question_id)],
    );
    expect(straine.rows[0]!.n).toBe(0);
  });

  it('poate compune recapitularea din id-urile exacte care sunt scadente', async () => {
    const cerute = ['bio-nervos-01', 'chim-alcooli-01'];
    const rez = await genereaza(ana, {
      mod: 'recapitulare',
      nr: cerute.length,
      amesteca_grile: false,
      filtre: { ids: cerute },
    });
    const items = await pozitii(ana, rez.run_id);

    expect(new Set(items.map((x) => x.question_id))).toEqual(new Set(cerute));
  });

  /**
   * Regula de amestecare stă pe tip, nu pe grilă, iar aplicarea ei e aici, la
   * generare: când ajunge clientul s-o randeze, ordinea e deja scrisă și paguba
   * e făcută. La complementul grupat variantele sunt cheia formatului („1, 2,
   * 3", „doar 4"), deci amestecate strică grila.
   */
  it('nu amestecă niciodată variantele unui complement grupat', async () => {
    const rez = await genereaza(ana, {
      mod: 'exersare',
      nr: 6,
      amesteca_optiuni: true,
      filtre: { tipuri: ['grupat'] },
    });
    const items = await pozitii(ana, rez.run_id);

    expect(items).toHaveLength(2);
    for (const it of items) expect(it.ordine).toBeNull();
  });

  it('amestecă variantele unui complement simplu, dar numai la cerere', async () => {
    const cu = await genereaza(ana, {
      mod: 'exersare',
      nr: 6,
      amesteca_optiuni: true,
      filtre: { tipuri: ['simplu'] },
    });
    const amestecate = await pozitii(ana, cu.run_id);
    expect(amestecate).toHaveLength(4);
    for (const it of amestecate) {
      const chei = it.ordine!.split(',');
      expect(new Set(chei).size).toBe(chei.length);
    }

    const fara = await genereaza(ana, { mod: 'exersare', nr: 6, filtre: { tipuri: ['simplu'] } });
    for (const it of await pozitii(ana, fara.run_id)) expect(it.ordine).toBeNull();
  });

  it('pune o limită de timp absolută doar când i se cere o durată', async () => {
    const cu = await genereaza(ana, { mod: 'simulare', nr: 3, durata_minute: 180 });
    const fara = await genereaza(ana, { mod: 'exersare', nr: 3 });

    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ id: string; minute: number | null }>(
        `select id::text, extract(epoch from (ends_at - started_at)) / 60 as minute
         from test_runs where id = any ($1::uuid[])`,
        [[cu.run_id, fara.run_id]],
      ),
    );
    const peId = new Map(r.rows.map((x) => [x.id, x.minute]));
    expect(Math.round(Number(peId.get(cu.run_id)))).toBe(180);
    expect(peId.get(fara.run_id)).toBeNull();
  });

  /** Filtrele pe utilizator sunt ale celui care cheamă, nu ale nimănui altcuiva. */
  it('„nevăzute" scoate exact grilele la care omul ăsta a răspuns', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source)
         values ($1, 'bio-nervos-01', 'A', false, 'sesiune')`,
        [ana],
      ),
    );

    const alAnei = await genereaza(ana, { mod: 'nevazute', nr: 10 });
    const aleAnei = await pozitii(ana, alAnei.run_id);
    expect(aleAnei.map((x) => x.question_id)).not.toContain('bio-nervos-01');
    expect(aleAnei).toHaveLength(5);

    // Bogdan n-a răspuns nimic, deci pentru el sunt toate nevăzute.
    const alLuiBogdan = await genereaza(bogdan, { mod: 'nevazute', nr: 10 });
    expect(await pozitii(bogdan, alLuiBogdan.run_id)).toHaveLength(6);
  });

  /**
   * „Ultimul răspuns e greșit", nu „a fost greșit vreodată": altfel o grilă
   * învățată între timp rămâne în coadă pentru totdeauna.
   */
  it('„greșeli" ia ultimul răspuns, nu istoria', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source, answered_at)
         values ($1, 'bio-nervos-01', 'A', false, 'sesiune', now() - interval '2 days'),
                ($1, 'bio-osos-01', 'A', false, 'sesiune', now() - interval '2 days')`,
        [ana],
      ),
    );

    const doar = await genereaza(ana, { mod: 'greseli', nr: 10 });
    expect((await pozitii(ana, doar.run_id)).map((x) => x.question_id).sort()).toEqual([
      'bio-nervos-01',
      'bio-osos-01',
    ]);

    // Între timp o rezolvă corect: iese din coadă.
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source)
         values ($1, 'bio-nervos-01', 'B', true, 'sesiune')`,
        [ana],
      ),
    );

    const dupa = await genereaza(ana, { mod: 'greseli', nr: 10 });
    expect((await pozitii(ana, dupa.run_id)).map((x) => x.question_id)).toEqual(['bio-osos-01']);
  });

  it('„favorite" ia doar ce a marcat omul', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query('insert into favorite (user_id, question_id) values ($1, $2)', [ana, 'bio-osos-01']),
    );

    const rez = await genereaza(ana, { mod: 'favorite', nr: 10 });
    expect((await pozitii(ana, rez.run_id)).map((x) => x.question_id)).toEqual(['bio-osos-01']);

    await expect(genereaza(bogdan, { mod: 'favorite', nr: 10 })).rejects.toThrow(/fara_candidati/i);
  });

  /**
   * Cusătura de abonament, verificată prin efect. Predicatul e în `where`, deci
   * o grilă închisă nu e rând — nu rând ascuns pe care clientul l-ar putea cere
   * pe altă cale.
   */
  it('nu trage o grilă premium pentru un cont fără abonament', async () => {
    await baza.db.query("update questions set acces = 'premium' where materie_id = 'bio'");

    const rez = await genereaza(ana, { mod: 'exersare', nr: 10 });
    const items = await pozitii(ana, rez.run_id);
    expect(items).toHaveLength(2);

    const bio = await baza.db.query<{ n: number }>(
      `select count(*)::int as n from questions where id = any ($1::text[]) and materie_id = 'bio'`,
      [items.map((x) => x.question_id)],
    );
    expect(bio.rows[0]!.n).toBe(0);

    await baza.db.query("update profiles set abonament_pana = now() + interval '30 days' where id = $1", [ana]);
    const cu = await genereaza(ana, { mod: 'exersare', nr: 10 });
    expect(await pozitii(ana, cu.run_id)).toHaveLength(6);
  });

  it('nu pune în lucrare nicio ciornă și nicio grilă retrasă', async () => {
    await baza.db.query("update questions set status = 'ciorna' where id = 'bio-nervos-01'");
    await baza.db.query("update questions set status = 'retrasa' where id = 'bio-osos-01'");

    const rez = await genereaza(ana, { mod: 'exersare', nr: 10 });
    const ids = (await pozitii(ana, rez.run_id)).map((x) => x.question_id);
    expect(ids).not.toContain('bio-nervos-01');
    expect(ids).not.toContain('bio-osos-01');
    expect(ids).toHaveLength(4);
  });

  it('refuză un mod care nu există', async () => {
    await expect(genereaza(ana, { mod: 'ghicit', nr: 3 })).rejects.toThrow(/mod_necunoscut/i);
  });

  it('refuză un număr fără sens', async () => {
    await expect(genereaza(ana, { mod: 'exersare', nr: 0 })).rejects.toThrow(/nr_invalid/i);
  });
});

describe('testele predefinite', () => {
  type TestPublic = {
    id: string;
    nume: string;
    mod_selectie: 'fix' | 'dupa_regula';
    nr_grile: number;
    durata_minute: number | null;
    acces: 'liber' | 'premium';
    disponibil: boolean;
  };

  const fix = (schimbari: Record<string, unknown> = {}) => ({
    id: 'admitere-2026',
    centru_id: 'umfcd',
    nume: 'Admitere UMFCD 2026',
    descriere: 'Lucrarea oficială, în ordinea publicată.',
    mod_selectie: 'fix',
    durata_minute: 180,
    acces: 'liber',
    publicat: true,
    grile: ['bio-osos-01', 'chim-alcooli-01', 'bio-nervos-01'],
    ...schimbari,
  });

  const regula = (schimbari: Record<string, unknown> = {}) => ({
    id: 'simulare-biologie',
    centru_id: 'umfcd',
    nume: 'Simulare de biologie',
    descriere: 'Două grile de biologie, trase din nou la fiecare pornire.',
    mod_selectie: 'dupa_regula',
    durata_minute: 60,
    acces: 'liber',
    publicat: true,
    regula: {
      filtre: { materii: ['bio'] },
      nr: 2,
      amesteca_grile: true,
      amesteca_optiuni: false,
      strict: true,
    },
    ...schimbari,
  });

  const salveaza = async (userId: string, payload: object) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ id: string }>('select public.salveaza_test_predefinit($1::jsonb) as id', [
        JSON.stringify(payload),
      ]),
    );
    return r.rows[0]!.id;
  };

  const lista = async (userId: string) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ teste: TestPublic[] }>('select public.lista_teste_predefinite() as teste'),
    );
    return r.rows[0]!.teste;
  };

  const genereaza = async (userId: string, testId: string) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ rezultat: { run_id: string; nr_obtinut: number } }>(
        `select public.genereaza_test(
           jsonb_build_object('mod', 'test_predefinit', 'test_id', $1::text)
         ) as rezultat`,
        [testId],
      ),
    );
    return r.rows[0]!.rezultat;
  };

  const ordine = async (runId: string) => {
    const r = await baza.db.query<{ question_id: string }>(
      'select question_id from test_run_items where run_id = $1 order by position',
      [runId],
    );
    return r.rows.map((x) => x.question_id);
  };

  const definitiaLucrarii = async (runId: string) => {
    const r = await baza.db.query<{ test_predefinit_id: string | null }>(
      'select test_predefinit_id from test_runs where id = $1',
      [runId],
    );
    return r.rows[0]!.test_predefinit_id;
  };

  it('lasă numai administratorul să salveze o definiție', async () => {
    await expect(salveaza(ana, fix())).rejects.toThrow(/administrator/i);

    await baza.faAdmin(ana);
    await expect(salveaza(ana, fix())).resolves.toBe('admitere-2026');
  });

  it('arată elevului numai testele publicate, fără lista secretă de poziții', async () => {
    await baza.faAdmin(ana);
    await salveaza(ana, fix());
    await salveaza(ana, regula({ id: 'simulare-ciorna', publicat: false }));

    const vazute = await lista(bogdan);
    expect(vazute.map((x) => x.id)).toEqual(['admitere-2026']);
    expect(vazute[0]).toMatchObject({ nr_grile: 3, durata_minute: 180, disponibil: true });
    expect(vazute[0]).not.toHaveProperty('grile');

    await expect(
      baza.caUtilizator(bogdan, () => baza.db.query('select * from test_predefinit_items')),
    ).rejects.toThrow(/permission denied/i);
  });

  it('ascunde testul dacă centrul sau colecția lui nu mai sunt publicate', async () => {
    await baza.faAdmin(ana);
    await baza.db.query(`
      insert into colectii (id, centru_id, nume, tip)
      values ('umfcd-2026-mg', 'umfcd', 'Admitere 2026', 'subiect_oficial')
    `);
    await salveaza(ana, fix({ colectie_id: 'umfcd-2026-mg' }));
    expect((await lista(bogdan)).map((x) => x.id)).toEqual(['admitere-2026']);

    await baza.db.query("update colectii set publicat = false where id = 'umfcd-2026-mg'");
    expect(await lista(bogdan)).toEqual([]);

    await baza.db.query("update colectii set publicat = true where id = 'umfcd-2026-mg'");
    await baza.db.query("update centre_admitere set publicat = false where id = 'umfcd'");
    expect(await lista(bogdan)).toEqual([]);
  });

  it('dă aceeași lucrare fixă, în aceeași ordine, oricărui elev', async () => {
    await baza.faAdmin(ana);
    await salveaza(ana, fix());

    const a = await genereaza(ana, 'admitere-2026');
    const b = await genereaza(bogdan, 'admitere-2026');
    const asteptata = ['bio-osos-01', 'chim-alcooli-01', 'bio-nervos-01'];

    expect(await ordine(a.run_id)).toEqual(asteptata);
    expect(await ordine(b.run_id)).toEqual(asteptata);
    expect(await definitiaLucrarii(a.run_id)).toBe('admitere-2026');
  });

  it('nu schimbă o lucrare deja pornită când definiția este editată', async () => {
    await baza.faAdmin(ana);
    await salveaza(ana, fix());
    const pornita = await genereaza(bogdan, 'admitere-2026');

    await salveaza(ana, fix({ grile: ['bio-nervos-01', 'chim-alcooli-01'] }));

    expect(await ordine(pornita.run_id)).toEqual([
      'bio-osos-01',
      'chim-alcooli-01',
      'bio-nervos-01',
    ]);
    const noua = await genereaza(bogdan, 'admitere-2026');
    expect(await ordine(noua.run_id)).toEqual(['bio-nervos-01', 'chim-alcooli-01']);
  });

  it('trage din nou o simulare după reguli, fără să iasă din filtre', async () => {
    await baza.faAdmin(ana);
    await salveaza(ana, regula());

    const variante = new Set<string>();
    for (let i = 0; i < 8; i += 1) {
      const r = await genereaza(i % 2 === 0 ? ana : bogdan, 'simulare-biologie');
      const ids = await ordine(r.run_id);
      expect(ids).toHaveLength(2);
      expect(ids.every((id) => id.startsWith('bio-'))).toBe(true);
      expect(await definitiaLucrarii(r.run_id)).toBe('simulare-biologie');
      variante.add([...ids].sort().join(','));
    }
    expect(variante.size).toBeGreaterThan(1);
  });

  it('nu publică un test fix cu duplicate sau grile care nu sunt publicate', async () => {
    await baza.faAdmin(ana);
    await expect(
      salveaza(ana, fix({ grile: ['bio-nervos-01', 'bio-nervos-01'] })),
    ).rejects.toThrow(/duplicate/i);

    await baza.db.query("update questions set status = 'ciorna' where id = 'bio-nervos-01'");
    await expect(salveaza(ana, fix())).rejects.toThrow(/publicate/i);
  });

  it('nu publică drept liber un test fix care conține grile premium', async () => {
    await baza.faAdmin(ana);
    await baza.db.query("update questions set acces = 'premium' where id = 'bio-nervos-01'");

    await expect(salveaza(ana, fix())).rejects.toThrow(/premium/i);
    await expect(salveaza(ana, fix({ acces: 'premium' }))).resolves.toBe('admitere-2026');
  });

  it('spune că un test premium este închis și refuză generarea fără abonament', async () => {
    await baza.faAdmin(ana);
    await salveaza(ana, fix({ acces: 'premium' }));

    expect((await lista(bogdan))[0]).toMatchObject({ acces: 'premium', disponibil: false });
    await expect(genereaza(bogdan, 'admitere-2026')).rejects.toThrow(/acces_interzis/i);

    await baza.db.query(
      "update profiles set abonament_pana = now() + interval '30 days' where id = $1",
      [bogdan],
    );
    await expect(genereaza(bogdan, 'admitere-2026')).resolves.toMatchObject({ nr_obtinut: 3 });
  });

  it('nu lasă elevul să citească inventarul complet de administrator', async () => {
    await expect(
      baza.caUtilizator(ana, () => baza.db.query('select public.citeste_teste_predefinite_admin()')),
    ).rejects.toThrow(/administrator/i);

    await baza.faAdmin(ana);
    await salveaza(ana, fix());
    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ teste: { id: string; grile: string[] }[] }>(
        'select public.citeste_teste_predefinite_admin() as teste',
      ),
    );
    expect(r.rows[0]!.teste[0]).toMatchObject({
      id: 'admitere-2026',
      grile: ['bio-osos-01', 'chim-alcooli-01', 'bio-nervos-01'],
    });
  });
});

describe('numărătoarea de candidați', () => {
  const numara = async (userId: string, payload: object) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ rezultat: { total: number; pe_materie: { materie_id: string; nr: number }[] } }>(
        'select public.numara_candidati($1::jsonb) as rezultat',
        [JSON.stringify(payload)],
      ),
    );
    return r.rows[0]!.rezultat;
  };

  it('numără toată biblioteca publicată, defalcat pe materii', async () => {
    const r = await numara(ana, { mod: 'exersare' });
    expect(r.total).toBe(6);
    expect(r.pe_materie).toEqual([
      { materie_id: 'bio', nr: 4 },
      { materie_id: 'chim', nr: 2 },
    ]);
  });

  it('scade când se strânge filtrul', async () => {
    const r = await numara(ana, { mod: 'exersare', filtre: { materii: ['bio'] } });
    expect(r.total).toBe(4);
    expect(r.pe_materie).toEqual([{ materie_id: 'bio', nr: 4 }]);
  });

  /**
   * Contorul și generarea trebuie să spună același lucru. Sunt două drumuri la
   * server peste același `where`, iar asistentul arată contorul chiar înainte de
   * a apăsa „Începe" — dacă diverg, minte exact în clipa aia.
   */
  it('e de acord cu ce livrează generarea', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query(
        `insert into attempts (user_id, question_id, chosen, is_correct, source)
         values ($1, 'bio-nervos-01', 'A', false, 'sesiune')`,
        [ana],
      ),
    );

    const contor = await numara(ana, { mod: 'nevazute' });
    const rez = await baza.caUtilizator(ana, () =>
      baza.db.query<{ rezultat: { nr_obtinut: number } }>(
        `select public.genereaza_test('{"mod":"nevazute","nr":100}'::jsonb) as rezultat`,
      ),
    );
    expect(rez.rows[0]!.rezultat.nr_obtinut).toBe(contor.total);
  });

  it('nu e apelabilă de un vizitator fără sesiune', async () => {
    await expect(
      baza.caVizitator(() => baza.db.query(`select public.numara_candidati('{}'::jsonb)`)),
    ).rejects.toThrow(/permission denied/i);
  });
});

/**
 * Rezolvarea lucrării: citire, răspuns, predare.
 *
 * Ce se apără aici e mai ales **ce nu traversează granița**. Azi banca ajunge
 * întreagă în browser cu tot cu `correct`, iar `is_correct` se calculează acolo
 * — deci oricine are cheia publicabilă poate insera oricâte răspunsuri corecte
 * vrea. Testele de mai jos verifică amândouă capetele: că răspunsul corect nu se
 * trimite înainte de a fi câștigat, și că nota o pune serverul.
 */
describe('rezolvarea lucrării', () => {
  type Citire = {
    run: { id: string; mod: string; finished_at: string | null; nr_cerut: number; qi: number };
    grile: {
      position: number;
      question_id: string;
      chosen: string | null;
      revealed: boolean;
      text: string | null;
      optiuni: { key: string; text: string }[] | null;
      correct?: string;
      expl?: string;
      why?: Record<string, string>;
    }[];
  };

  const genereaza = async (userId: string, payload: object) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ rezultat: { run_id: string } }>('select public.genereaza_test($1::jsonb) as rezultat', [
        JSON.stringify(payload),
      ]),
    );
    return r.rows[0]!.rezultat.run_id;
  };

  const citeste = async (userId: string, runId: string) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ t: Citire }>('select public.citeste_test($1::uuid) as t', [runId]),
    );
    return r.rows[0]!.t;
  };

  const raspunde = async (userId: string, payload: object) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ r: Record<string, unknown> }>('select public.raspunde($1::jsonb) as r', [
        JSON.stringify(payload),
      ]),
    );
    return r.rows[0]!.r;
  };

  const preda = async (userId: string, runId: string) => {
    const r = await baza.caUtilizator(userId, () =>
      baza.db.query<{ r: { corecte: number; gresite: number; nr_cerut: number; pct: number; finished_at: string } }>(
        'select public.preda_test($1::uuid) as r',
        [runId],
      ),
    );
    return r.rows[0]!.r;
  };

  /** Răspunsul corect al primei poziții, citit direct din bancă. */
  const corectaLa = async (runId: string, pozitie: number) => {
    const r = await baza.db.query<{ correct: string }>(
      `select q.correct from test_run_items i join questions q on q.id = i.question_id
       where i.run_id = $1 and i.position = $2`,
      [runId, pozitie],
    );
    return r.rows[0]!.correct;
  };

  const gresitaLa = async (runId: string, pozitie: number) => {
    const r = await baza.db.query<{ key: string }>(
      `select o.key from test_run_items i
       join questions q on q.id = i.question_id
       join question_options o on o.question_id = q.id and o.key <> q.correct
       where i.run_id = $1 and i.position = $2 limit 1`,
      [runId, pozitie],
    );
    return r.rows[0]!.key;
  };

  it('nu lasă un elev să citească lucrarea altuia', async () => {
    const alAnei = await genereaza(ana, { mod: 'exersare', nr: 3 });

    await expect(
      baza.caUtilizator(bogdan, () => baza.db.query('select public.citeste_test($1::uuid)', [alAnei])),
    ).rejects.toThrow(/lucrare_inexistenta/i);

    await expect(
      raspunde(bogdan, { run_id: alAnei, pozitie: 0, aleasa: 'A' }),
    ).rejects.toThrow(/lucrare_inexistenta/i);
  });

  it('trimite enunțul și variantele, dar nu răspunsul corect', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });
    const t = await citeste(ana, run);

    expect(t.grile).toHaveLength(3);
    for (const g of t.grile) {
      expect(g.text).not.toBeNull();
      expect(g.optiuni!.length).toBeGreaterThan(0);
      expect(g.correct).toBeUndefined();
      expect(g.expl).toBeUndefined();
      expect(g.why).toBeUndefined();
    }
  });

  /**
   * La exersare explicația vine odată cu verificarea, nu înainte. Regula e una
   * singură — „verificată sau predată" — deci nu are ramuri pe mod care să
   * diveargă.
   */
  it('dă explicația abia după ce grila a fost verificată', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });
    const corecta = await corectaLa(run, 0);

    const r = await raspunde(ana, { run_id: run, pozitie: 0, aleasa: corecta });
    expect(r.corect).toBe(true);
    expect(r.correct).toBe(corecta);
    expect(r.expl).toBeTruthy();

    const t = await citeste(ana, run);
    expect(t.grile[0]!.correct).toBe(corecta);
    expect(t.grile[0]!.revealed).toBe(true);
    // Celelalte, neatinse, rămân fără răspuns.
    expect(t.grile[1]!.correct).toBeUndefined();
  });

  /**
   * Miezul mutării: nota o pune serverul, comparând cu `questions.correct`.
   * Clientul nu mai are ce trimite, deci nu mai are ce falsifica.
   */
  it('pune nota pe server, nu o primește de la client', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });
    const gresita = await gresitaLa(run, 0);

    const r = await raspunde(ana, { run_id: run, pozitie: 0, aleasa: gresita });
    expect(r.corect).toBe(false);

    const jurnal = await baza.caUtilizator(ana, () =>
      baza.db.query<{ is_correct: boolean; chosen: string; source: string }>(
        'select is_correct, chosen, source::text from attempts where run_id = $1',
        [run],
      ),
    );
    expect(jurnal.rows).toHaveLength(1);
    expect(jurnal.rows[0]).toMatchObject({ is_correct: false, chosen: gresita, source: 'sesiune' });
  });

  /** „Am greșit, mai încerc o dată" ar rescrie jurnalul și ar umfla stăpânirea. */
  it('închide grila odată verificată', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });
    const gresita = await gresitaLa(run, 0);
    const corecta = await corectaLa(run, 0);

    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: gresita });
    await expect(raspunde(ana, { run_id: run, pozitie: 0, aleasa: corecta })).rejects.toThrow(
      /raspuns_blocat/i,
    );
  });

  /** Un retry după o întrerupere de rețea nu are voie să dubleze jurnalul. */
  it('nu dublează jurnalul la o repetare a aceluiași răspuns', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });
    const corecta = await corectaLa(run, 0);

    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: corecta });
    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: corecta });

    const n = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from attempts where run_id = $1', [run]),
    );
    expect(n.rows[0]!.n).toBe(1);
  });


  /**
   * Marcarea nu e un răspuns.
   *
   * `raspunde` era singurul drum spre `marked`, iar la exersare dezvăluia
   * necondiționat: un semn pus pe o grilă neatinsă o închidea pe loc, fără
   * răspuns și fără rând în jurnal — adică o scotea definitiv din sesiune, în
   * tăcere. Dezvăluirea ține de răspuns, nu de atingerea rândului.
   */
  it('nu deschide răspunsul când doar se pune un semn pe grilă', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });

    const r = await raspunde(ana, { run_id: run, pozitie: 0, aleasa: null, marcata: true });
    expect(r.correct).toBeUndefined();

    const dupaMarcaj = await citeste(ana, run);
    expect(dupaMarcaj.grile[0]).toMatchObject({ marked: true, revealed: false, chosen: null });
    // Și tot ce ține de răspunsul corect trebuie să lipsească în continuare.
    expect(dupaMarcaj.grile[0]!.correct).toBeUndefined();

    // Grila rămâne de rezolvat, nu blocată.
    const corecta = await corectaLa(run, 0);
    const dupaRaspuns = await raspunde(ana, { run_id: run, pozitie: 0, aleasa: corecta });
    expect(dupaRaspuns.corect).toBe(true);

    const jurnal = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from attempts where run_id = $1', [run]),
    );
    expect(jurnal.rows[0]!.n).toBe(1);
  });

  /** Semnul se poate scoate, iar scoaterea lui nu atinge răspunsul deja dat. */
  it('lasă semnul să fie scos fără să rescrie răspunsul', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });
    const corecta = await corectaLa(run, 0);

    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: corecta, marcata: true });
    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: corecta, marcata: false });

    const dupa = await citeste(ana, run);
    expect(dupa.grile[0]).toMatchObject({ marked: false, revealed: true, chosen: corecta });
  });
  /**
   * Simularea e altfel, și e chiar rostul separării: până la predare nu afli
   * nimic, iar răspunsul se poate schimba.
   */
  it('nu spune nimic la simulare până la predare, dar lasă răspunsul schimbat', async () => {
    const run = await genereaza(ana, { mod: 'simulare', nr: 3, durata_minute: 180 });
    const corecta = await corectaLa(run, 0);
    const gresita = await gresitaLa(run, 0);

    const r = await raspunde(ana, { run_id: run, pozitie: 0, aleasa: gresita });
    expect(r).toEqual({ inregistrat: true });

    const t = await citeste(ana, run);
    expect(t.grile[0]!.correct).toBeUndefined();
    expect(t.grile[0]!.revealed).toBe(false);

    // Se răzgândește — la simulare are voie.
    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: corecta });

    // Și nimic n-a intrat încă în jurnal.
    const n = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from attempts where run_id = $1', [run]),
    );
    expect(n.rows[0]!.n).toBe(0);
  });

  it('la predare scrie jurnalul, dă scorul și deschide răspunsurile', async () => {
    const run = await genereaza(ana, { mod: 'simulare', nr: 3, durata_minute: 180 });
    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: await corectaLa(run, 0) });
    await raspunde(ana, { run_id: run, pozitie: 1, aleasa: await gresitaLa(run, 1) });

    const scor = await preda(ana, run);
    expect(scor).toMatchObject({ corecte: 1, gresite: 1, nr_cerut: 3 });
    // Nedata contează împotrivă: 1 din 3, nu 1 din 2.
    expect(Number(scor.pct)).toBe(33);

    const jurnal = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number; source: string }>(
        "select count(*)::int as n, min(source::text) as source from attempts where run_id = $1",
        [run],
      ),
    );
    expect(jurnal.rows[0]).toMatchObject({ n: 2, source: 'simulare' });

    const t = await citeste(ana, run);
    for (const g of t.grile) expect(g.correct).toBeTruthy();
  });

  /**
   * `source = 'simulare'` era structural imposibil: `AttemptInsert.source` nici
   * nu-l putea exprima, deci rândul „Simulări" din Statistici era mereu zero.
   */
  it('face în sfârșit posibil un răspuns cu sursa „simulare"', async () => {
    const run = await genereaza(ana, { mod: 'simulare', nr: 2, durata_minute: 60 });
    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: await corectaLa(run, 0) });
    await preda(ana, run);

    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>("select count(*)::int as n from attempts where source = 'simulare'"),
    );
    expect(r.rows[0]!.n).toBe(1);
  });

  it('e idempotentă la predare: a doua chemare nu mișcă nimic', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });
    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: await corectaLa(run, 0) });

    const intai = await preda(ana, run);
    const apoi = await preda(ana, run);

    expect(apoi.finished_at).toBe(intai.finished_at);
    expect(apoi.corecte).toBe(intai.corecte);

    const n = await baza.caUtilizator(ana, () =>
      baza.db.query<{ n: number }>('select count(*)::int as n from attempts where run_id = $1', [run]),
    );
    expect(n.rows[0]!.n).toBe(1);
  });

  it('nu mai primește răspunsuri după predare', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });
    await preda(ana, run);

    await expect(raspunde(ana, { run_id: run, pozitie: 1, aleasa: 'A' })).rejects.toThrow(
      /lucrare_predata/i,
    );
  });

  /**
   * Expirarea încheie lucrarea fără s-o piardă, și dă același rezultat după o
   * reîncărcare — garanția pe care `useSimulare` o dă deja în client.
   */
  it('tratează o lucrare expirată ca predată, cu ora expirării', async () => {
    const run = await genereaza(ana, { mod: 'simulare', nr: 3, durata_minute: 60 });
    await raspunde(ana, { run_id: run, pozitie: 0, aleasa: await corectaLa(run, 0) });

    await baza.db.query(
      "update test_runs set started_at = now() - interval '3 hours', ends_at = now() - interval '1 hour' where id = $1",
      [run],
    );

    const t = await citeste(ana, run);
    expect(t.run.finished_at).not.toBeNull();
    // Predată prin expirare: răspunsurile sunt deschise.
    for (const g of t.grile) expect(g.correct).toBeTruthy();

    await expect(raspunde(ana, { run_id: run, pozitie: 1, aleasa: 'A' })).rejects.toThrow(
      /lucrare_predata/i,
    );

    const scor = await preda(ana, run);
    const orasEnds = await baza.db.query<{ ends_at: string }>('select ends_at from test_runs where id = $1', [run]);
    expect(new Date(scor.finished_at).getTime()).toBe(new Date(orasEnds.rows[0]!.ends_at).getTime());
  });

  it('refuză o poziție care nu există în lucrare', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 2 });
    await expect(raspunde(ana, { run_id: run, pozitie: 99, aleasa: 'A' })).rejects.toThrow(
      /pozitie_inexistenta/i,
    );
  });

  /**
   * O grilă retrasă din bibliotecă lasă poziția ei goală, nu o scoate: altfel
   * s-ar renumerota tot ce urmează, iar răspunsurile sunt cheiate pe poziție.
   */
  it('păstrează poziția unei grile dispărute din bibliotecă', async () => {
    const run = await genereaza(ana, { mod: 'exersare', nr: 3 });
    const t0 = await citeste(ana, run);
    const disparuta = t0.grile[1]!.question_id;

    await baza.db.query('delete from questions where id = $1', [disparuta]);

    const t = await citeste(ana, run);
    expect(t.grile.map((g) => g.position)).toEqual([0, 1, 2]);
    expect(t.grile[1]!.question_id).toBe(disparuta);
    expect(t.grile[1]!.text).toBeNull();
    expect(t.grile[1]!.optiuni).toBeNull();
  });
});

describe('coloanele cu răspunsuri', () => {
  it('lasă elevul să citească direct numai catalogul sigur', async () => {
    const grile = await baza.caUtilizator(ana, () =>
      baza.db.query<{ id: string; chapter_id: string; status: string; text: string }>(
        'select id, chapter_id, status, text from public.questions order by id limit 1',
      ),
    );
    const optiuni = await baza.caUtilizator(ana, () =>
      baza.db.query<{ question_id: string; key: string; text: string }>(
        'select question_id, key, text from public.question_options order by question_id, key limit 1',
      ),
    );

    expect(grile.rows).toHaveLength(1);
    expect(optiuni.rows).toHaveLength(1);
  });

  it.each([
    ['răspunsul corect', 'select correct from public.questions limit 1'],
    ['explicația generală', 'select expl from public.questions limit 1'],
    ['explicația opțiunii', 'select why from public.question_options limit 1'],
    ['toate coloanele prin steluță', 'select * from public.questions limit 1'],
  ])('nu lasă elevul să citească direct %s', async (_nume, sql) => {
    await expect(baza.caUtilizator(ana, () => baza.db.query(sql))).rejects.toThrow(
      /permission denied/i,
    );
  });

  it('nu lasă nici administratorul să ocolească funcția de administrare', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () => baza.db.query('select correct from public.questions limit 1')),
    ).rejects.toThrow(/permission denied/i);
  });
});

/**
 * `correct`, `expl` și `why` sunt revocate la nivel de coloană pentru rolul SQL
 * comun tuturor conturilor. „Administrator" e însă rol al aplicației — deci nu
 * există un rol SQL căruia să i se acorde separat, iar drumul administratorului
 * trebuie să fie o funcție care îi verifică profilul.
 */
describe('citirea de administrator', () => {
  it('dă grila întreagă unui administrator', async () => {
    await baza.faAdmin(ana);
    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ g: { id: string; correct: string; expl: string; optiuni: { key: string; why: string | null }[] } }>(
        "select public.citeste_grila_admin('bio-nervos-01') as g",
      ),
    );

    expect(r.rows[0]!.g.id).toBe('bio-nervos-01');
    expect(r.rows[0]!.g.correct).toBeTruthy();
    expect(r.rows[0]!.g.expl).toBeTruthy();
    expect(r.rows[0]!.g.optiuni.length).toBeGreaterThan(0);
  });

  it('nu dă nimic unui elev', async () => {
    await expect(
      baza.caUtilizator(ana, () => baza.db.query("select public.citeste_grila_admin('bio-nervos-01')")),
    ).rejects.toThrow(/administrator/i);
  });

  it('spune limpede când grila nu există', async () => {
    await baza.faAdmin(ana);
    await expect(
      baza.caUtilizator(ana, () => baza.db.query("select public.citeste_grila_admin('nu-exista-01')")),
    ).rejects.toThrow(/nu există/i);
  });

  it('exportă în pagini numai administratorului, cu răspunsurile întregi', async () => {
    await baza.faAdmin(ana);
    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ p: { total: number; grile: { id: string; correct: string; optiuni: unknown[] }[] } }>(
        'select public.exporta_grile_admin(0, 2) as p',
      ),
    );

    expect(r.rows[0]!.p.total).toBe(6);
    expect(r.rows[0]!.p.grile).toHaveLength(2);
    expect(r.rows[0]!.p.grile.every((g) => Boolean(g.correct) && g.optiuni.length > 0)).toBe(true);

    await expect(
      baza.caUtilizator(bogdan, () => baza.db.query('select public.exporta_grile_admin(0, 2)')),
    ).rejects.toThrow(/administrator/i);
  });
});

describe('simularea locală veche', () => {
  const id = '20000000-0000-4000-8000-000000000001';
  const payload = {
    id,
    startedAt: Date.parse('2026-08-27T10:00:00Z'),
    endsAt: Date.parse('2026-08-27T13:00:00Z'),
    finishedAt: null,
    config: { model: 'UMFCD · Medicină', nr: '2' },
    order: ['bio-nervos-01', 'chim-alcooli-01'],
    qi: 1,
    answers: { 0: 'B' },
    marks: { 1: true },
  };

  it('păstrează ordinea, răspunsurile, marcajele și timpul în noua lucrare', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query('select public.importa_simulare_veche($1::jsonb)', [JSON.stringify(payload)]),
    );

    const run = await baza.db.query<{ user_id: string; qi: number; nr_cerut: number; ends_at: string }>(
      'select user_id, qi, nr_cerut, ends_at from test_runs where id = $1',
      [id],
    );
    expect(run.rows[0]).toMatchObject({ user_id: ana, qi: 1, nr_cerut: 2 });
    expect(new Date(run.rows[0]!.ends_at).getTime()).toBe(payload.endsAt);

    const items = await baza.db.query<{ position: number; question_id: string; chosen: string | null; marked: boolean }>(
      'select position, question_id, chosen, marked from test_run_items where run_id = $1 order by position',
      [id],
    );
    expect(items.rows).toEqual([
      { position: 0, question_id: 'bio-nervos-01', chosen: 'B', marked: false },
      { position: 1, question_id: 'chim-alcooli-01', chosen: null, marked: true },
    ]);
  });

  it('este idempotentă și nu poate fi revendicată de alt elev', async () => {
    await baza.caUtilizator(ana, () =>
      baza.db.query('select public.importa_simulare_veche($1::jsonb)', [JSON.stringify(payload)]),
    );
    await baza.caUtilizator(ana, () =>
      baza.db.query('select public.importa_simulare_veche($1::jsonb)', [JSON.stringify(payload)]),
    );

    const items = await baza.db.query<{ n: number }>(
      'select count(*)::integer as n from test_run_items where run_id = $1',
      [id],
    );
    expect(items.rows[0]!.n).toBe(2);

    await expect(
      baza.caUtilizator(bogdan, () =>
        baza.db.query('select public.importa_simulare_veche($1::jsonb)', [JSON.stringify(payload)]),
      ),
    ).rejects.toThrow(/lucrare_inexistenta/i);
  });

  it('nu este apelabilă fără sesiune', async () => {
    await expect(
      baza.caVizitator(() =>
        baza.db.query('select public.importa_simulare_veche($1::jsonb)', [JSON.stringify(payload)]),
      ),
    ).rejects.toThrow(/permission denied/i);
  });
});

/**
 * Mutarea lucrărilor vechi în `test_runs`.
 *
 * Pe o bază proaspătă nu e nimic de mutat, deci testele își fac singure
 * rândurile vechi și cheamă migrarea din nou — ceea ce verifică și
 * idempotența, care e chiar proprietatea de care depinde planul: migrarea se
 * rulează o dată acum și încă o dată în ziua în care trece clientul, ca să
 * prindă sesiunile create între timp.
 */
describe('mutarea lucrărilor vechi', () => {
  const MIGRARE = '0019_mutarea_lucrarilor.sql';

  const ruleazaMutarea = async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync(new URL(`./migrations/${MIGRARE}`, import.meta.url), 'utf8');
    // Prima linie schimbă o coloană deja schimbată; restul e idempotent.
    await baza.db.exec(sql.replace('alter table test_runs alter column nr_cerut drop not null;', ''));
  };

  const sesiuneVeche = async (userId: string, capitole: string[] = ['bio-nervos']) => {
    const r = await baza.db.query<{ id: string }>(
      `insert into sessions (user_id, started_at, finished_at, chapter_ids)
       values ($1, now() - interval '2 days', now() - interval '2 days' + interval '10 minutes', $2)
       returning id`,
      [userId, capitole],
    );
    return r.rows[0]!.id;
  };

  const simulareVeche = async (userId: string, grile: string[]) => {
    const r = await baza.db.query<{ id: string }>(
      `insert into sim_runs (user_id, started_at, ends_at, finished_at, config, question_ids)
       values ($1, now() - interval '3 days', now() - interval '3 days' + interval '3 hours',
               now() - interval '3 days' + interval '2 hours', '{"nr":3}'::jsonb, $2)
       returning id`,
      [userId, grile],
    );
    return r.rows[0]!.id;
  };

  it('mută o sesiune păstrându-i id-ul, dar fără să-i inventeze numărul de grile', async () => {
    const id = await sesiuneVeche(ana, ['bio-nervos', 'bio-osos']);
    await ruleazaMutarea();

    const r = await baza.db.query<{
      id: string;
      mod: string;
      nr_cerut: number | null;
      config: { capitole: string[] };
      ends_at: string | null;
    }>('select id::text, mod::text, nr_cerut, config, ends_at from test_runs where id = $1', [id]);

    expect(r.rows[0]).toMatchObject({
      id,
      mod: 'exersare',
      // Ordinea sesiunii a trăit doar în localStorage: nu se știe câte au fost.
      nr_cerut: null,
      ends_at: null,
    });
    expect(r.rows[0]!.config.capitole).toEqual(['bio-nervos', 'bio-osos']);

    // Și nicio grilă inventată pentru ea.
    const grile = await baza.db.query<{ n: number }>(
      'select count(*)::int as n from test_run_items where run_id = $1',
      [id],
    );
    expect(grile.rows[0]!.n).toBe(0);
  });

  /**
   * Recapitularea scrie tot un rând în `sessions`, deci singurul semn care o
   * deosebește e `attempts.source`. Se derivă, nu se presupune.
   */
  it('recunoaște o recapitulare după jurnalul ei, nu o trece drept exersare', async () => {
    const id = await sesiuneVeche(ana);
    await baza.db.query(
      `insert into attempts (user_id, question_id, chosen, is_correct, source, session_id, client_key)
       values ($1, 'bio-nervos-01', 'A', false, 'recapitulare', $2, $3)`,
      [ana, id, `${id}:0`],
    );

    await ruleazaMutarea();

    const r = await baza.db.query<{ mod: string }>('select mod::text from test_runs where id = $1', [id]);
    expect(r.rows[0]!.mod).toBe('recapitulare');
  });

  /**
   * Simularea se reconstruiește întreagă: `question_ids` e chiar ordinea
   * lucrării. Pozițiile pornesc de la 0, ca `SimRun.order` în client — o
   * deplasare cu unu ar dezlipi fiecare răspuns vechi de grila lui, fiindcă
   * `client_key` e „<lucrare>:<indice>".
   */
  it('reconstruiește simularea poziție cu poziție, numerotând de la zero', async () => {
    const ordine = ['bio-osos-01', 'chim-arene-01', 'bio-nervos-01'];
    const id = await simulareVeche(ana, ordine);
    await ruleazaMutarea();

    const lucrare = await baza.db.query<{ mod: string; nr_cerut: number; ends_at: string | null }>(
      'select mod::text, nr_cerut, ends_at from test_runs where id = $1',
      [id],
    );
    expect(lucrare.rows[0]!.mod).toBe('simulare');
    expect(lucrare.rows[0]!.nr_cerut).toBe(3);
    expect(lucrare.rows[0]!.ends_at).not.toBeNull();

    const grile = await baza.db.query<{ position: number; question_id: string; option_order: unknown }>(
      'select position, question_id, option_order from test_run_items where run_id = $1 order by position',
      [id],
    );
    expect(grile.rows.map((x) => x.position)).toEqual([0, 1, 2]);
    expect(grile.rows.map((x) => x.question_id)).toEqual(ordine);
    // Nimic nu s-a amestecat vreodată: null e valoarea adevărată, nu o umplutură.
    for (const g of grile.rows) expect(g.option_order).toBeNull();
  });

  it('leagă jurnalul vechi de lucrare, fără să-i atingă cheia de idempotență', async () => {
    const sesiune = await sesiuneVeche(ana);
    const simulare = await simulareVeche(ana, ['bio-nervos-01']);
    await baza.db.query(
      `insert into attempts (user_id, question_id, chosen, is_correct, source, session_id, client_key)
       values ($1, 'bio-nervos-01', 'A', false, 'sesiune', $2, $3)`,
      [ana, sesiune, `${sesiune}:0`],
    );
    await baza.db.query(
      `insert into attempts (user_id, question_id, chosen, is_correct, source, sim_run_id, client_key)
       values ($1, 'bio-nervos-01', 'B', true, 'simulare', $2, $3)`,
      [ana, simulare, `${simulare}:0`],
    );

    await ruleazaMutarea();

    const r = await baza.db.query<{ run_id: string; client_key: string }>(
      'select run_id::text, client_key from attempts order by client_key',
    );
    expect(r.rows.every((x) => x.run_id !== null)).toBe(true);
    expect(r.rows.map((x) => x.client_key).sort()).toEqual([`${sesiune}:0`, `${simulare}:0`].sort());
  });

  /**
   * Se rulează de două ori dinadins: o dată acum, o dată în ziua în care trece
   * clientul, ca să prindă sesiunile din fereastra dintre ele.
   */
  it('se poate rula de două ori fără să dubleze nimic', async () => {
    const sesiune = await sesiuneVeche(ana);
    const simulare = await simulareVeche(ana, ['bio-nervos-01', 'bio-osos-01']);

    await ruleazaMutarea();
    // O sesiune apărută între cele două rulări trebuie prinsă de a doua.
    const intreTimp = await sesiuneVeche(bogdan);
    await ruleazaMutarea();

    const n = await baza.db.query<{ lucrari: number; grile: number }>(
      `select (select count(*)::int from test_runs) as lucrari,
              (select count(*)::int from test_run_items) as grile`,
    );
    expect(n.rows[0]).toEqual({ lucrari: 3, grile: 2 });

    const noua = await baza.db.query<{ n: number }>('select count(*)::int as n from test_runs where id = $1', [
      intreTimp,
    ]);
    expect(noua.rows[0]!.n).toBe(1);
    expect(sesiune).not.toBe(simulare);
  });

  /**
   * O lucrare mutată n-are numitor, deci procentul e „nu se știe", nu zero.
   * Fără ramura asta, `preda_test` ar împărți la null și ar întoarce null pe
   * tot obiectul, sau — mai rău — cineva ar pune un 0 ca să nu crape.
   */
  it('dă un procent null la o lucrare fără numitor, în loc să crape', async () => {
    const id = await simulareVeche(ana, ['bio-nervos-01']);
    await ruleazaMutarea();
    await baza.db.query('update test_runs set nr_cerut = null, finished_at = null where id = $1', [id]);

    const r = await baza.caUtilizator(ana, () =>
      baza.db.query<{ s: { pct: number | null; corecte: number; nr_cerut: number | null } }>(
        'select public.preda_test($1::uuid) as s',
        [id],
      ),
    );
    expect(r.rows[0]!.s.pct).toBeNull();
    expect(r.rows[0]!.s.nr_cerut).toBeNull();
    expect(r.rows[0]!.s.corecte).toBe(0);
  });

  /** Copierea nu atinge tabelele vechi: dacă trecerea se dă înapoi, sunt acolo. */
  it('lasă tabelele vechi neatinse', async () => {
    const sesiune = await sesiuneVeche(ana);
    const simulare = await simulareVeche(ana, ['bio-nervos-01']);
    await ruleazaMutarea();

    const r = await baza.db.query<{ sesiuni: number; simulari: number }>(
      `select (select count(*)::int from sessions) as sesiuni,
              (select count(*)::int from sim_runs) as simulari`,
    );
    expect(r.rows[0]).toEqual({ sesiuni: 1, simulari: 1 });
    expect(sesiune).not.toBe(simulare);
  });
});
