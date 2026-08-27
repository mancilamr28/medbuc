import type { ChapterId } from '../data/chapters';
import { TAXONOMIE_GOALA, type Taxonomie } from '../lib/taxonomie';
import { TIPURI_GOALE, type TipuriGrile } from '../lib/tipuriGrile';
import { numar } from '../lib/text';
import { OPTION_KEYS, type OptionKey, type QuestionSursa, type QuestionType } from '../data/questions';
import type { GrilaCuStare, GrilaDeSalvat, QuestionStatus } from '../lib/continut';

/**
 * Ciorna din formularul de Administrare, plus regulile ei.
 *
 * Separată de componentă fiindcă e logică pură peste un obiect: se testează fără
 * randare și fără rețea, ca `scoreOf`. Validările de aici le repetă pe cele din
 * `salveaza_grila` (migrarea 0006) — nu ca să le înlocuiască, ci ca autorul să
 * vadă problema în formular, nu într-un mesaj de eroare de la server. Baza
 * rămâne cea care decide: formularul e o sugestie, cererea poate veni de oriunde.
 */
export interface Ciorna {
  id: string;
  capId: ChapterId;
  tip: QuestionType;
  text: string;
  /** Cele patru afirmații ale complementului grupat; ignorate la simplu. */
  enunturi: string[];
  /** Toate cele cinci litere sunt în formular; cele lăsate goale nu se salvează. */
  opts: Record<OptionKey, { text: string; why: string }>;
  correct: OptionKey;
  expl: string;
  src: string;
  sursa: QuestionSursa;
  /** Id-ul colecției din care vine grila, sau gol. */
  colectie: string;
  /** Anul subiectului, ca text în formular; gol dacă nu se aplică. */
  an: string;
}

/** Cele cinci litere, goale. Exportată fiindcă și importul în masă umple aceeași formă. */
export const opturiGoale = (): Ciorna['opts'] =>
  Object.fromEntries(OPTION_KEYS.map((k) => [k, { text: '', why: '' }])) as Ciorna['opts'];

export const ciornaGoala = (capId: ChapterId = 'bio-celula'): Ciorna => ({
  id: '',
  capId,
  tip: 'simplu',
  text: '',
  enunturi: ['', '', '', ''],
  opts: opturiGoale(),
  correct: 'A',
  expl: '',
  src: '',
  sursa: 'materie',
  colectie: '',
  an: '',
});

/** Umple formularul dintr-o grilă existentă, pentru editare. */
export function dinGrila(g: GrilaCuStare): Ciorna {
  const opts = opturiGoale();
  for (const [k, text] of g.opts) opts[k] = { text, why: g.why[k] ?? '' };

  return {
    id: g.id,
    capId: g.capId,
    tip: g.tip,
    text: g.text,
    enunturi: [0, 1, 2, 3].map((i) => g.enunturi?.[i] ?? ''),
    opts,
    correct: g.correct,
    expl: g.expl,
    src: g.src,
    sursa: g.sursa,
    colectie: g.colectieId,
    an: g.an === undefined ? '' : String(g.an),
  };
}

/** Literele completate, în ordinea alfabetului. */
export const variantScrise = (c: Ciorna): OptionKey[] =>
  OPTION_KEYS.filter((k) => c.opts[k].text.trim() !== '');

/**
 * Ce e în neregulă cu ciorna, în limba în care o citește autorul.
 *
 * Lista goală înseamnă că se poate salva. Mesajele sunt în aceeași ordine în care
 * apar câmpurile, ca ochiul să meargă de sus în jos.
 */
export function valideaza(
  c: Ciorna,
  taxonomie: Taxonomie = TAXONOMIE_GOALA,
  tipuri: TipuriGrile = TIPURI_GOALE,
): string[] {
  const probleme: string[] = [];
  const scrise = variantScrise(c);
  const tip = tipuri.tip(c.tip);

  if (c.id.trim() === '') probleme.push('Grila are nevoie de un identificator.');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id.trim())) {
    probleme.push('Identificatorul poate conține doar litere mici, cifre și cratime.');
  }

  if (c.capId.trim() === '') probleme.push('Alege un capitol.');
  else if (taxonomie.capitole.length > 0 && !taxonomie.capitol(c.capId)) {
    probleme.push('Alege un capitol.');
  }
  if (c.text.trim() === '') probleme.push('Enunțul nu poate fi gol.');

  // Regulile de format vin din tip, nu dintr-un `if` pe „grupat": un format nou
  // e un rând în `question_types`, iar validarea trebuie să-l urmeze de la sine.
  if (tip?.cereEnunturi && tip.nrEnunturi !== null) {
    const scrieri = c.enunturi.filter((e) => e.trim() !== '').length;
    if (scrieri !== tip.nrEnunturi) {
      probleme.push(`${tip.nume} are nevoie de exact ${numar(tip.nrEnunturi, 'afirmație', 'afirmații')}.`);
    }
  }

  const minim = tip?.nrOptiuniMin ?? 2;
  if (scrise.length < minim) {
    probleme.push(`Scrie cel puțin ${numar(minim, 'variantă', 'variante')}.`);
  }
  if (tip && scrise.length > tip.nrOptiuniMax) {
    probleme.push(`${tip.nume} are cel mult ${numar(tip.nrOptiuniMax, 'variantă', 'variante')}.`);
  }
  if (!scrise.includes(c.correct)) {
    probleme.push('Răspunsul corect trebuie să fie una dintre variantele scrise.');
  }

  if (c.expl.trim() === '') probleme.push('Explicația generală nu poate fi goală.');

  if (c.an.trim() !== '') {
    const an = Number(c.an.trim());
    if (!Number.isInteger(an) || an < 2015 || an > 2100) {
      probleme.push('Anul subiectului trebuie să fie un an valid.');
    }
  }

  return probleme;
}

/** Ciorna, pregătită pentru `salveaza_grila`. Variantele goale nu pleacă spre bază. */
export function catreSalvare(
  c: Ciorna,
  status: QuestionStatus,
  tipuri: TipuriGrile = TIPURI_GOALE,
): GrilaDeSalvat {
  const cereEnunturi = tipuri.tip(c.tip)?.cereEnunturi ?? c.tip === 'grupat';
  const opts = variantScrise(c).map((k) => {
    const why = c.opts[k].why.trim();
    return { key: k, text: c.opts[k].text.trim(), ...(why ? { why } : {}) };
  });

  return {
    id: c.id.trim(),
    capId: c.capId,
    tip: c.tip,
    status,
    text: c.text.trim(),
    ...(cereEnunturi ? { enunturi: c.enunturi.map((e) => e.trim()) } : {}),
    correct: c.correct,
    expl: c.expl.trim(),
    src: c.src.trim(),
    sursa: c.sursa,
    colectie: c.colectie.trim(),
    ...(c.an.trim() !== '' ? { an: Number(c.an.trim()) } : {}),
    opts,
  };
}

/**
 * Următorul identificator liber dintr-un capitol, ex. `bio-nervos-07`.
 *
 * Doar o sugestie, editabilă: id-ul e identitatea grilei peste tot unde e salvată
 * — în lucrări, în `attempts` — deci merită ales, nu generat orbește. Se uită la
 * ce există ca să nu propună un id deja luat.
 */
export function idSugerat(capId: ChapterId, existente: readonly { id: string }[]): string {
  const prefix = `${capId}-`;
  const luate = existente
    .filter((q) => q.id.startsWith(prefix))
    .map((q) => Number.parseInt(q.id.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));

  const urmator = (luate.length > 0 ? Math.max(...luate) : 0) + 1;
  return `${prefix}${String(urmator).padStart(2, '0')}`;
}
