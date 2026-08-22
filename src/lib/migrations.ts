import { chapterLabel, type ChapterId } from '../data/chapters';
import { CAPITOLE_SEED } from '../data/taxonomieSeed';

export const NOTE_PREFIX = 'medbuc.note.';

/**
 * Eticheta veche a capitolului („03. Sistemul nervos”) → id-ul lui.
 *
 * Construită din taxonomia de pornire, nu din cea citită la runtime, și asta e
 * deliberat: migrarea rulează o singură dată, din `main.tsx`, **înainte de
 * primul render** — deci înainte ca vreo cerere să fi ajuns la bază. Mai mult,
 * cheile pe care le repară sunt istorice: etichetele care contează sunt cele
 * care existau când notițele au fost scrise. O hartă care se mișcă odată cu baza
 * ar repara azi altceva decât ieri.
 */
const ID_BY_LABEL: ReadonlyMap<string, ChapterId> = new Map(
  CAPITOLE_SEED.map((c) => [chapterLabel({ id: c.id, materie: c.materie_id, nr: c.nr, name: c.name }), c.id]),
);

export interface NoteMove {
  from: string;
  to: string;
}

/**
 * Notițele erau salvate sub `medbuc.note.<eticheta capitolului>`. De când
 * capitolele au id, cheia e `medbuc.note.<id>`, deci cele vechi trebuie mutate
 * — altfel notițele scrise până acum ar rămâne în storage, dar invizibile.
 *
 * Funcție pură peste lista de chei, ca să poată fi testată fără `localStorage`.
 * O cheie a cărei etichetă nu mai există (capitol scos) rămâne pe loc: e mai
 * bine să zacă acolo decât să ștergem textul cuiva.
 */
export function noteKeyMoves(keys: readonly string[]): NoteMove[] {
  const existing = new Set(keys);
  const moves: NoteMove[] = [];

  for (const key of keys) {
    if (!key.startsWith(NOTE_PREFIX)) continue;
    const id = ID_BY_LABEL.get(key.slice(NOTE_PREFIX.length));
    if (id === undefined) continue;

    const to = `${NOTE_PREFIX}${id}`;
    // Dacă există deja o notiță pe cheia nouă, ea e cea recentă; n-o acoperim.
    if (existing.has(to)) continue;
    moves.push({ from: key, to });
  }

  return moves;
}

/** Aplică mutările în `localStorage`. Rulează o dată, la pornire. */
export function migrateNoteKeys(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null) keys.push(key);
    }

    for (const { from, to } of noteKeyMoves(keys)) {
      const value = localStorage.getItem(from);
      if (value === null) continue;
      localStorage.setItem(to, value);
      localStorage.removeItem(from);
    }
  } catch {
    // Mod privat sau cotă depășită: notițele rămân unde sunt, aplicația pornește.
  }
}
