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
}

export interface Materie {
  id: MaterieId;
  name: string;
  unit: 'grile' | 'sesiuni';
  list: Chapter[];
}

/** O linie de capitol: id, numărul afișat, numele. */
type ChapterRow = [string, string, string];

const chapterList = (materie: MaterieId, rows: ChapterRow[]): Chapter[] =>
  rows.map(([id, nr, name]) => ({ id, materie, nr, name }));

export const MATERII: Record<MaterieId, Materie> = {
  bio: {
    id: 'bio',
    name: 'Biologie',
    unit: 'grile',
    list: chapterList('bio', [
      ['bio-celula', '01', 'Celula. Țesuturile'],
      ['bio-analizatori', '02', 'Analizatorii'],
      ['bio-nervos', '03', 'Sistemul nervos'],
      ['bio-endocrin', '04', 'Glandele endocrine'],
      ['bio-osos', '05', 'Sistemul osos'],
      ['bio-muscular', '06', 'Sistemul muscular'],
      ['bio-sange', '07', 'Sângele. Hemostaza'],
      ['bio-circulator', '08', 'Sistemul circulator'],
      ['bio-digestie', '09', 'Digestia și absorbția'],
      ['bio-respiratie', '10', 'Respirația'],
      ['bio-excretie', '11', 'Excreția'],
      ['bio-reproducere', '12', 'Reproducerea'],
    ]),
  },
  chim: {
    id: 'chim',
    name: 'Chimie organică',
    unit: 'grile',
    list: chapterList('chim', [
      ['chim-introducere', '01', 'Introducere în chimia organică'],
      ['chim-alcani', '02', 'Alcani'],
      ['chim-alchene', '03', 'Alchene și alchine'],
      ['chim-arene', '04', 'Arene'],
      ['chim-alcooli', '05', 'Alcooli. Fenoli'],
      ['chim-acizi', '06', 'Acizi carboxilici'],
      ['chim-amine', '07', 'Amine'],
      ['chim-aminoacizi', '08', 'Aminoacizi și proteine'],
      ['chim-zaharide', '09', 'Zaharide'],
      ['chim-izomerie', '10', 'Izomerie'],
    ]),
  },
  ant: {
    id: 'ant',
    name: 'Subiecte anterioare',
    unit: 'sesiuni',
    // Aici `nr` e anul, iar 2026 are două sesiuni: id-ul e singurul lucru unic.
    list: chapterList('ant', [
      ['ant-2026-mg', '2026', 'Admitere UMFCD · Medicină'],
      ['ant-2026-simulare', '2026', 'Simulare oficială · aprilie'],
      ['ant-2025-mg', '2025', 'Admitere UMFCD · Medicină'],
      ['ant-2025-md', '2025', 'Admitere UMFCD · Medicină dentară'],
      ['ant-2024-mg', '2024', 'Admitere UMFCD · Medicină'],
      ['ant-2024-simulare', '2024', 'Simulare oficială · martie'],
      ['ant-2023-mg', '2023', 'Admitere UMFCD · Medicină'],
      ['ant-2022-mg', '2022', 'Admitere UMFCD · Medicină'],
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
