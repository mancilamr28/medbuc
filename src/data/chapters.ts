export type MaterieId = 'bio' | 'chim' | 'ant';

/**
 * Identitatea unui capitol, la fel ca `QuestionId` pentru grile.
 *
 * `nr` nu poate ține locul unui id: la „Subiecte anterioare" e un an, iar în
 * 2026 sunt două sesiuni, deci `nr` se repetă. Nici eticheta nu poate — pe ea
 * se sprijineau cheile notițelor (`medbuc.note.03. Sistemul nervos`), așa că o
 * simplă corectare de titlu orfaniza notița elevului.
 */
export type ChapterId = string;

export interface Chapter {
  id: ChapterId;
  materie: MaterieId;
  /** Numărul capitolului sau anul sesiunii, ex. "04" sau "2026". */
  nr: string;
  name: string;
  /** Câte grile are capitolul în bibliotecă. */
  total: number;
  /** Câte a rezolvat elevul. */
  done: number;
  /** Procentul de răspunsuri corecte; 0 înseamnă capitol neînceput. */
  pct: number;
}

export interface Materie {
  id: MaterieId;
  name: string;
  /** Eticheta scurtă a bibliotecii, ex. "1 240 grile" sau "8 sesiuni". */
  count: string;
  unit: 'grile' | 'sesiuni';
  /** Grile rezolvate, procent corecte și capitole terminate — statisticile elevului. */
  rezolvate: number;
  corecte: number;
  terminate: number;
  list: Chapter[];
}

/** O linie de capitol: id, număr afișat, nume, grile în bibliotecă, rezolvate, procent. */
type ChapterRow = [string, string, string, number, number, number];

const chapterList = (materie: MaterieId, rows: ChapterRow[]): Chapter[] =>
  rows.map(([id, nr, name, total, done, pct]) => ({ id, materie, nr, name, total, done, pct }));

export const MATERII: Record<MaterieId, Materie> = {
  bio: {
    id: 'bio',
    name: 'Biologie',
    count: '1 240 grile',
    unit: 'grile',
    rezolvate: 234,
    corecte: 71,
    terminate: 1,
    list: chapterList('bio', [
      ['bio-celula', '01', 'Celula. Țesuturile', 60, 60, 91],
      ['bio-analizatori', '02', 'Analizatorii', 60, 44, 78],
      ['bio-nervos', '03', 'Sistemul nervos', 84, 61, 72],
      ['bio-endocrin', '04', 'Glandele endocrine', 48, 18, 54],
      ['bio-osos', '05', 'Sistemul osos', 60, 12, 61],
      ['bio-muscular', '06', 'Sistemul muscular', 48, 0, 0],
      ['bio-sange', '07', 'Sângele. Hemostaza', 60, 30, 83],
      ['bio-circulator', '08', 'Sistemul circulator', 72, 9, 66],
      ['bio-digestie', '09', 'Digestia și absorbția', 72, 0, 0],
      ['bio-respiratie', '10', 'Respirația', 48, 0, 0],
      ['bio-excretie', '11', 'Excreția', 48, 0, 0],
      ['bio-reproducere', '12', 'Reproducerea', 60, 0, 0],
    ]),
  },
  chim: {
    id: 'chim',
    name: 'Chimie organică',
    count: '980 grile',
    unit: 'grile',
    rezolvate: 173,
    corecte: 68,
    terminate: 1,
    list: chapterList('chim', [
      ['chim-introducere', '01', 'Introducere în chimia organică', 48, 48, 88],
      ['chim-alcani', '02', 'Alcani', 60, 52, 81],
      ['chim-alchene', '03', 'Alchene și alchine', 60, 33, 69],
      ['chim-arene', '04', 'Arene', 48, 20, 58],
      ['chim-alcooli', '05', 'Alcooli. Fenoli', 60, 14, 63],
      ['chim-acizi', '06', 'Acizi carboxilici', 60, 6, 50],
      ['chim-amine', '07', 'Amine', 48, 0, 0],
      ['chim-aminoacizi', '08', 'Aminoacizi și proteine', 60, 0, 0],
      ['chim-zaharide', '09', 'Zaharide', 48, 0, 0],
      ['chim-izomerie', '10', 'Izomerie', 36, 0, 0],
    ]),
  },
  ant: {
    id: 'ant',
    name: 'Subiecte anterioare',
    count: '8 sesiuni',
    unit: 'sesiuni',
    rezolvate: 262,
    corecte: 72,
    terminate: 1,
    // Aici `nr` e anul, iar 2026 are două sesiuni: id-ul e singurul lucru unic.
    list: chapterList('ant', [
      ['ant-2026-mg', '2026', 'Admitere UMFCD · Medicină', 100, 100, 76],
      ['ant-2026-simulare', '2026', 'Simulare oficială · aprilie', 100, 100, 71],
      ['ant-2025-mg', '2025', 'Admitere UMFCD · Medicină', 100, 62, 68],
      ['ant-2025-md', '2025', 'Admitere UMFCD · Medicină dentară', 100, 0, 0],
      ['ant-2024-mg', '2024', 'Admitere UMFCD · Medicină', 100, 0, 0],
      ['ant-2024-simulare', '2024', 'Simulare oficială · martie', 100, 0, 0],
      ['ant-2023-mg', '2023', 'Admitere UMFCD · Medicină', 100, 0, 0],
      ['ant-2022-mg', '2022', 'Admitere UMFCD · Medicină', 100, 0, 0],
    ]),
  },
};

export const MATERIE_TABS: { id: MaterieId; label: string }[] = [
  { id: 'bio', label: 'Biologie' },
  { id: 'chim', label: 'Chimie organică' },
  { id: 'ant', label: 'Subiecte anterioare' },
];

/** Numele afișat în administrare → cheia internă a materiei. */
export const MATERIE_BY_NAME: Record<string, MaterieId> = {
  Biologie: 'bio',
  'Chimie organică': 'chim',
  'Subiecte anterioare': 'ant',
};

export const chapterLabel = (c: Chapter): string => `${c.nr}. ${c.name}`;

/** Capitolele salvate de elev, pentru filtrul „Doar capitolele salvate”. */
const SAVED = new Set<ChapterId>([
  'bio-endocrin',
  'bio-sange',
  'bio-circulator',
  'chim-alcooli',
  'chim-acizi',
]);

export const isSaved = (c: Chapter): boolean => SAVED.has(c.id);

/**
 * Construită după `MATERII`, ca și `QUESTION_BY_ID` după `QUESTIONS`: mutată mai
 * sus, ar fi o zonă moartă temporală și ar arunca la import.
 */
export const CHAPTER_BY_ID: ReadonlyMap<ChapterId, Chapter> = (() => {
  const map = new Map<ChapterId, Chapter>();
  for (const materie of Object.values(MATERII)) {
    for (const c of materie.list) {
      if (map.has(c.id)) throw new Error(`Id de capitol duplicat: ${c.id}`);
      map.set(c.id, c);
    }
  }
  return map;
})();

export const chapterById = (id: ChapterId): Chapter | undefined => CHAPTER_BY_ID.get(id);

export const isChapterId = (v: unknown): v is ChapterId =>
  typeof v === 'string' && CHAPTER_BY_ID.has(v);

/** Eticheta completă a unui capitol, ex. „03. Sistemul nervos”. */
export const chapterLabelById = (id: ChapterId): string => {
  const c = chapterById(id);
  return c ? chapterLabel(c) : id;
};

/** Numele materiei din care face parte capitolul, ex. „Biologie”. */
export const materieNameOf = (id: ChapterId): string => {
  const c = chapterById(id);
  return c ? MATERII[c.materie].name : '';
};
