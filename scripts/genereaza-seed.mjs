/**
 * Scrie `supabase/seed.sql` din datele reale ale aplicației.
 *
 * Conținutul nu se transcrie de mână: cele șase grile au împreună treizeci de
 * explicații per variantă, iar o virgulă mutată la copiere ar strica o grilă
 * fără ca nimic să semnaleze. Generatorul importă chiar modulele din `src/data`,
 * deci seed-ul nu poate rămâne în urma bibliotecii.
 *
 *   node scripts/genereaza-seed.mjs
 *
 * Modulele sunt TypeScript și se importă între ele fără extensie, ceea ce Node
 * nu acceptă direct — le trecem prin esbuild, care e deja instalat cu Vite.
 */
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { outputFiles } = await build({
  stdin: {
    contents: `export * from './src/data/chapters';\nexport * from './src/data/questions';\n`,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  write: false,
});

const cod = outputFiles[0].text;
const modul = await import(`data:text/javascript;base64,${Buffer.from(cod).toString('base64')}`);
const { MATERII, QUESTIONS, OPTION_KEYS } = modul;

/** Ghilimele simple dublate — singura scăpare de care are nevoie un literal SQL. */
const sql = (value) => (value === undefined || value === null ? 'null' : `'${String(value).replaceAll("'", "''")}'`);

const sqlArray = (values) =>
  values === undefined ? 'null' : `array[${values.map(sql).join(', ')}]::text[]`;

const linii = [];
const scrie = (...s) => linii.push(...s);

scrie(
  '-- GENERAT DE scripts/genereaza-seed.mjs — nu edita direct.',
  '-- Sursa e src/data/; rulează din nou generatorul după ce adaugi conținut.',
  '--',
  '-- Idempotent: se poate rula peste o bază care are deja datele. Grilele se',
  '-- actualizează la valorile din cod, deci o corectură făcută în sursă ajunge',
  '-- în bază fără migrare nouă.',
  '',
  'begin;',
  '',
);

scrie('-- materii ---------------------------------------------------------------', '');
Object.values(MATERII).forEach((m, i) => {
  scrie(
    `insert into materii (id, name, unit, position) values (${sql(m.id)}, ${sql(m.name)}, ${sql(m.unit)}, ${i})`,
    '  on conflict (id) do update set name = excluded.name, unit = excluded.unit, position = excluded.position;',
  );
});

scrie('', '-- capitole --------------------------------------------------------------', '');
Object.values(MATERII).forEach((m) => {
  m.list.forEach((c, i) => {
    scrie(
      `insert into chapters (id, materie_id, nr, name, position) values (${sql(c.id)}, ${sql(m.id)}, ${sql(c.nr)}, ${sql(c.name)}, ${i})`,
      '  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;',
    );
  });
});

scrie(
  '',
  '-- grile ------------------------------------------------------------------',
  '--',
  '-- `questions_correct_exists` e o cheie externă amânată: grila se inserează',
  '-- înaintea variantelor ei, iar verificarea se face la commit.',
  '',
);

for (const q of QUESTIONS) {
  scrie(
    'insert into questions (id, chapter_id, tip, status, text, enunturi, correct, expl, src) values (',
    `  ${sql(q.id)}, ${sql(q.capId)}, ${sql(q.tip)}, 'publicata',`,
    `  ${sql(q.text)},`,
    `  ${sqlArray(q.enunturi)},`,
    `  ${sql(q.correct)},`,
    `  ${sql(q.expl)},`,
    `  ${sql(q.src)}`,
    ') on conflict (id) do update set',
    '  chapter_id = excluded.chapter_id, tip = excluded.tip, text = excluded.text,',
    '  enunturi = excluded.enunturi, correct = excluded.correct, expl = excluded.expl, src = excluded.src;',
    '',
  );

  for (const [key, text] of q.opts) {
    scrie(
      `insert into question_options (question_id, key, text, why) values (${sql(q.id)}, ${sql(key)}, ${sql(text)}, ${sql(q.why[key])})`,
      '  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;',
    );
  }

  // O variantă ștearsă din cod trebuie să dispară și din bază, altfel rămâne
  // afișată la elevi la nesfârșit.
  const scrise = q.opts.map(([k]) => k);
  const lipsa = OPTION_KEYS.filter((k) => !scrise.includes(k));
  if (lipsa.length > 0) {
    scrie(
      `delete from question_options where question_id = ${sql(q.id)} and key in (${lipsa.map(sql).join(', ')});`,
    );
  }
  scrie('');
}

scrie('commit;', '');

const iesire = resolve(root, 'supabase/seed.sql');
writeFileSync(iesire, linii.join('\n'), 'utf8');

console.log(
  `Scris ${iesire}: ${Object.keys(MATERII).length} materii, ` +
    `${Object.values(MATERII).reduce((n, m) => n + m.list.length, 0)} capitole, ${QUESTIONS.length} grile.`,
);
