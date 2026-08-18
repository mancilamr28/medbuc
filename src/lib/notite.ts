import { CHAPTER_BY_ID, isChapterId, type ChapterId } from '../data/chapters';
import { NOTE_PREFIX } from './migrations';

const capIdDinCheie = (key: string): ChapterId | null => {
  if (!key.startsWith(NOTE_PREFIX)) return null;
  const id = key.slice(NOTE_PREFIX.length);
  return isChapterId(id) ? id : null;
};

const areTextNegol = (raw: string | null): boolean => {
  if (raw === null) return false;
  try {
    const value = JSON.parse(raw) as unknown;
    return typeof value === 'string' && value.trim() !== '';
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
