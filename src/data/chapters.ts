export type MaterieId = 'bio' | 'chim' | 'ant';

export interface Chapter {
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

const chapter = ([nr, name, total, done, pct]: [string, string, number, number, number]): Chapter => ({
  nr,
  name,
  total,
  done,
  pct,
});

export const MATERII: Record<MaterieId, Materie> = {
  bio: {
    id: 'bio',
    name: 'Biologie',
    count: '1 240 grile',
    unit: 'grile',
    rezolvate: 234,
    corecte: 71,
    terminate: 1,
    list: [
      ['01', 'Celula. Țesuturile', 60, 60, 91],
      ['02', 'Analizatorii', 60, 44, 78],
      ['03', 'Sistemul nervos', 84, 61, 72],
      ['04', 'Glandele endocrine', 48, 18, 54],
      ['05', 'Sistemul osos', 60, 12, 61],
      ['06', 'Sistemul muscular', 48, 0, 0],
      ['07', 'Sângele. Hemostaza', 60, 30, 83],
      ['08', 'Sistemul circulator', 72, 9, 66],
      ['09', 'Digestia și absorbția', 72, 0, 0],
      ['10', 'Respirația', 48, 0, 0],
      ['11', 'Excreția', 48, 0, 0],
      ['12', 'Reproducerea', 60, 0, 0],
    ].map((r) => chapter(r as [string, string, number, number, number])),
  },
  chim: {
    id: 'chim',
    name: 'Chimie organică',
    count: '980 grile',
    unit: 'grile',
    rezolvate: 173,
    corecte: 68,
    terminate: 1,
    list: [
      ['01', 'Introducere în chimia organică', 48, 48, 88],
      ['02', 'Alcani', 60, 52, 81],
      ['03', 'Alchene și alchine', 60, 33, 69],
      ['04', 'Arene', 48, 20, 58],
      ['05', 'Alcooli. Fenoli', 60, 14, 63],
      ['06', 'Acizi carboxilici', 60, 6, 50],
      ['07', 'Amine', 48, 0, 0],
      ['08', 'Aminoacizi și proteine', 60, 0, 0],
      ['09', 'Zaharide', 48, 0, 0],
      ['10', 'Izomerie', 36, 0, 0],
    ].map((r) => chapter(r as [string, string, number, number, number])),
  },
  ant: {
    id: 'ant',
    name: 'Subiecte anterioare',
    count: '8 sesiuni',
    unit: 'sesiuni',
    rezolvate: 262,
    corecte: 72,
    terminate: 1,
    list: [
      ['2026', 'Admitere UMFCD · Medicină', 100, 100, 76],
      ['2026', 'Simulare oficială · aprilie', 100, 100, 71],
      ['2025', 'Admitere UMFCD · Medicină', 100, 62, 68],
      ['2025', 'Admitere UMFCD · Medicină dentară', 100, 0, 0],
      ['2024', 'Admitere UMFCD · Medicină', 100, 0, 0],
      ['2024', 'Simulare oficială · martie', 100, 0, 0],
      ['2023', 'Admitere UMFCD · Medicină', 100, 0, 0],
      ['2022', 'Admitere UMFCD · Medicină', 100, 0, 0],
    ].map((r) => chapter(r as [string, string, number, number, number])),
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
const SAVED = new Set(['bio:04', 'bio:07', 'bio:08', 'chim:05', 'chim:06']);

export const isSaved = (materie: MaterieId, c: Chapter): boolean => SAVED.has(`${materie}:${c.nr}`);
