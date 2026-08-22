import { CHAPTER_BY_ID, isChapterId, type ChapterId } from '../data/chapters';
import { NOTE_PREFIX } from './migrations';

const capIdDinCheie = (key: string): ChapterId | null => {
  if (!key.startsWith(NOTE_PREFIX)) return null;
  const id = key.slice(NOTE_PREFIX.length);
  return isChapterId(id) ? id : null;
};

/**
 * Notița așa cum stă pe disc, de când are și un moment al scrierii.
 *
 * Textul singur nu ajungea: cu notițele ținute și pe cont, cineva care scrie pe
 * telefon și deschide laptopul are două versiuni, iar fără o oră a fiecăreia
 * n-ai cum să alegi între ele decât ghicind.
 */
export interface NotitaLocala {
  body: string;
  /** Milisecunde. `0` pentru notițele scrise înainte să existe câmpul. */
  updatedAt: number;
}

/** Forma veche — doar textul — încă zace în `localStorage` la mulți. */
export type NotitaStocata = string | NotitaLocala;

export const esteNotitaStocata = (v: unknown): v is NotitaStocata =>
  typeof v === 'string' ||
  (typeof v === 'object' &&
    v !== null &&
    typeof (v as NotitaLocala).body === 'string' &&
    typeof (v as NotitaLocala).updatedAt === 'number');

/**
 * Aduce orice formă salvată la cea curentă.
 *
 * O notiță veche primește `updatedAt: 0`, adică „mai veche decât orice": dacă
 * pe cont există deja una, aceea câștigă. Textul local nu se șterge niciodată,
 * doar nu mai e cel afișat.
 */
export const normalizeazaNotita = (stocata: NotitaStocata): NotitaLocala =>
  typeof stocata === 'string' ? { body: stocata, updatedAt: 0 } : stocata;

/** Notița citită de pe cont. */
export interface NotitaBaza {
  chapter_id: string;
  body: string;
  updated_at: string;
}

export type Provenienta = 'local' | 'cont' | 'goala';

export interface NotitaAleasa {
  body: string;
  updatedAt: number;
  /** De unde vine textul afișat — hotărăște și dacă local trebuie urcat. */
  provenienta: Provenienta;
}

/**
 * Alege între ce e pe dispozitiv și ce e pe cont: câștigă cea scrisă ultima.
 *
 * La egalitate câștigă contul, fiindcă acolo a ajuns deja — altfel o notiță
 * scrisă și sincronizată pe alt dispozitiv ar fi rescrisă de copia locală
 * identică, la fiecare deschidere, fără să se schimbe nimic.
 */
export function alegeNotita(local: NotitaLocala | null, server: NotitaBaza | null): NotitaAleasa {
  const serverLa = server ? Date.parse(server.updated_at) : Number.NaN;
  const areServer = server !== null && Number.isFinite(serverLa);
  const areLocal = local !== null && local.body.trim() !== '';

  if (areServer && (!areLocal || serverLa >= local.updatedAt)) {
    return { body: server.body, updatedAt: serverLa, provenienta: 'cont' };
  }
  if (areLocal) return { body: local.body, updatedAt: local.updatedAt, provenienta: 'local' };
  return { body: '', updatedAt: 0, provenienta: 'goala' };
}

const areTextNegol = (raw: string | null): boolean => {
  if (raw === null) return false;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!esteNotitaStocata(value)) return false;
    return normalizeazaNotita(value).body.trim() !== '';
  } catch {
    return false;
  }
};

/**
 * Capitolele cu notiță nevidă, în ordinea din bibliografie — nu ordinea de
 * scriere din `localStorage`, care n-are niciun sens pentru elev. Pură peste
 * `keys` și un `getValue` injectat, ca să poată fi testată fără `localStorage`
 * real, la fel ca `noteKeyMoves` din migrations.ts. O cheie al cărei capitol
 * nu mai există (`isChapterId` fals) e exclusă, nu doar neordonată.
 */
export function capitoleCuNotita(
  keys: readonly string[],
  getValue: (key: string) => string | null,
): ChapterId[] {
  const gasite = new Set<ChapterId>();
  for (const key of keys) {
    const capId = capIdDinCheie(key);
    if (capId && areTextNegol(getValue(key))) gasite.add(capId);
  }
  return Array.from(CHAPTER_BY_ID.keys()).filter((id) => gasite.has(id));
}

/** Citește direct din `localStorage`. Rulează o singură dată, la montarea ecranului. */
export function citesteCapitoleCuNotita(): ChapterId[] {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null) keys.push(key);
    }
    return capitoleCuNotita(keys, (k) => localStorage.getItem(k));
  } catch {
    // Mod privat sau storage indisponibil: ecranul pornește cu lista goală.
    return [];
  }
}
