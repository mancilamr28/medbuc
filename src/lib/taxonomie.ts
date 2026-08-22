import type { Chapter, ChapterId, Materie, MaterieId } from '../data/chapters';
import { chapterLabel } from '../data/chapters';

/**
 * Materiile și capitolele, citite din bază.
 *
 * Erau o constantă compilată în `src/data/chapters.ts`, iar baza avea propriile
 * tabele — două surse de adevăr care au și divergit: în bază există materia
 * `ant` cu 8 capitole, în fișier tipul era `MaterieId = 'bio' | 'chim'`. Nimic
 * n-a semnalat, fiindcă `chapterLabelById` cădea pe id-ul brut: capitolele alea
 * se afișau „ant-2026-mg" în loc de titlu.
 *
 * Taxonomia circulă acum **ca valoare, nu ca import** — exact cum banca de grile
 * ajunge deja parametru în `AppProvider`. Asta ține funcțiile pure testabile fără
 * rețea și face imposibilă întoarcerea la o listă compilată care se învechește.
 *
 * Modulul e **pur**: citirea din bază stă în `continut.ts`, lângă `incarcaGrile`.
 * Nu e stil — generatorul de seed importă fișierul ăsta prin esbuild cu
 * `platform: 'neutral'`, iar un `import('./supabase')` de aici, chiar și dinamic,
 * trage tot clientul Supabase în bundle și oprește `npm run seed`.
 */

/** Un capitol care încă n-are pereche în bază își arată id-ul, nu dispare. */
export interface Taxonomie {
  materii: Materie[];
  capitole: Chapter[];
  capitol: (id: ChapterId) => Chapter | undefined;
  /** „03. Sistemul nervos”; id-ul brut dacă nu se cunoaște capitolul. */
  eticheta: (id: ChapterId) => string;
  /** „Biologie”; gol dacă nu se cunoaște capitolul. */
  numeMaterie: (id: ChapterId) => string;
  esteCapitol: (v: unknown) => v is ChapterId;
  materie: (id: MaterieId) => Materie | undefined;
}

export interface RandMaterie {
  id: string;
  name: string;
  position: number;
}

export interface RandCapitol {
  id: string;
  materie_id: string;
  nr: string;
  name: string;
  position: number;
}

/**
 * Pură peste rândurile primite, ca să poată fi testată fără rețea.
 *
 * Ordinea vine din `position`, nu din cum s-a nimerit în tabel. Un capitol care
 * arată spre o materie inexistentă e păstrat în `capitole` — se poate rezolva
 * după id — dar nu intră în nicio materie, ca să nu inventeze una.
 */
export function construiesteTaxonomie(
  materii: readonly RandMaterie[],
  capitole: readonly RandCapitol[],
): Taxonomie {
  const dupaPozitie = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

  const capitoleSortate = [...capitole].sort(dupaPozitie);
  const listaMaterii = [...materii].sort(dupaPozitie).map<Materie>((m) => ({
    id: m.id,
    name: m.name,
    list: capitoleSortate
      .filter((c) => c.materie_id === m.id)
      .map<Chapter>((c) => ({ id: c.id, materie: m.id, nr: c.nr, name: c.name })),
  }));

  const capitolDupaId = new Map<ChapterId, Chapter>();
  const numeMateriei = new Map<MaterieId, string>(listaMaterii.map((m) => [m.id, m.name]));
  for (const c of capitoleSortate) {
    capitolDupaId.set(c.id, { id: c.id, materie: c.materie_id, nr: c.nr, name: c.name });
  }

  const materieDupaId = new Map<MaterieId, Materie>(listaMaterii.map((m) => [m.id, m]));

  return {
    materii: listaMaterii,
    capitole: [...capitolDupaId.values()],
    capitol: (id) => capitolDupaId.get(id),
    eticheta: (id) => {
      const c = capitolDupaId.get(id);
      return c ? chapterLabel(c) : id;
    },
    numeMaterie: (id) => {
      const c = capitolDupaId.get(id);
      return c ? (numeMateriei.get(c.materie) ?? '') : '';
    },
    esteCapitol: (v): v is ChapterId => typeof v === 'string' && capitolDupaId.has(v),
    materie: (id) => materieDupaId.get(id),
  };
}

/**
 * Taxonomia goală, pentru momentul dinaintea primei citiri.
 *
 * Nu e un caz special de tratat peste tot: fiecare funcție cade deja înapoi pe
 * id-ul brut, deci un ecran randat prea devreme arată id-uri, nu se strică.
 */
export const TAXONOMIE_GOALA: Taxonomie = construiesteTaxonomie([], []);
