/**
 * Datele contului și ale examenului. Într-o versiune cu backend acestea vin din
 * API; până atunci sunt centralizate aici, ca ecranele să nu le repete.
 */

/** Sesiunea de admitere pentru care se pregătește contul. */
export const EXAM_DATE = new Date(2027, 6, 25); // 25 iulie 2027
export const EXAM_DATE_LABEL = '25 iulie 2027';
export const EXAM_DATE_SHORT = '25 iul 2027';

export const STUDENT = {
  name: 'Andrei Popescu',
  initials: 'AP',
  firstName: 'Andrei',
  liceu: 'Colegiul „Sf. Sava”',
  streak: 22,
  grileRezolvate: '1 407',
  punctajEstimat: 81,
  procentCorecte: 71,
  obiectivZi: { rezolvate: 32, total: 40 },
};

export const CONT_ROWS: { label: string; value: string }[] = [
  { label: 'Nume', value: 'Andrei Popescu' },
  { label: 'E-mail', value: 'andrei.popescu@gmail.com' },
  { label: 'Liceu', value: 'Colegiul Național „Sf. Sava”, București' },
  { label: 'Clasa', value: 'a XII-a' },
];

export const EXAMEN_ROWS: { label: string; value: string }[] = [
  { label: 'Facultate', value: 'UMFCD „Carol Davila”, București' },
  { label: 'Specializare', value: 'Medicină generală' },
  { label: 'Sesiunea', value: EXAM_DATE_LABEL },
  { label: 'Probe', value: 'Biologie · Chimie organică' },
  { label: 'Punctaj țintă', value: '85 din 100' },
];

/** Punctajul estimat, lună de lună — sursa graficului de evoluție. */
export const SCORES = [58, 61, 60, 66, 69, 67, 73, 71, 78, 81];
export const SCORE_MONTHS = ['mai', 'iunie', 'iulie', 'august'];
export const SCORE_TARGET = 85;

export interface Weakness {
  cap: string;
  materie: string;
  total: number;
  pct: number;
}

export const WEAKNESS: Weakness[] = [
  { cap: '04. Glandele endocrine', materie: 'Biologie', total: 18, pct: 54 },
  { cap: '06. Acizi carboxilici', materie: 'Chimie', total: 6, pct: 50 },
  { cap: '04. Arene', materie: 'Chimie', total: 20, pct: 58 },
  { cap: '05. Sistemul osos', materie: 'Biologie', total: 12, pct: 61 },
];

/** Repetare inteligentă — ce e programat pentru astăzi. */
export const SRS = [
  { count: 24, title: 'Glandele endocrine · noțiuni greșite', meta: 'A 3-a repetare · ultima acum 6 zile' },
  { count: 14, title: 'Flashcarduri · Alcooli și fenoli', meta: 'A 2-a repetare · ultima acum 3 zile' },
  { count: 8, title: 'Grile greșite la simularea din iulie', meta: 'Prima repetare' },
];

export const SRS_TOTAL = SRS.reduce((n, s) => n + s.count, 0);

export const ACTIVITY = [
  { color: 'var(--ok)', text: 'Test ', strong: 'Sistemul nervos', after: ' · 24 grile · 79%', when: 'ieri, 19:40' },
  { color: 'var(--acc)', text: 'Recapitulare · ', strong: '32 de flashcarduri', after: '', when: 'ieri, 08:15' },
  { color: 'var(--brand)', text: 'Simulare ', strong: 'UMFCD 2025', after: ' · 68 / 100', when: 'acum 3 zile' },
  { color: 'var(--line2)', text: 'Ai terminat capitolul ', strong: 'Celula. Țesuturile', after: '', when: 'acum 5 zile' },
];

export const PLAN_PARAMS = [
  { label: 'Data examenului', value: EXAM_DATE_LABEL },
  { label: 'Zile de studiu', value: '5 pe săptămână' },
  { label: 'Ritm calculat', value: '48 grile / zi' },
  { label: 'Nivel actual', value: '71% corecte' },
];

export type PlanStare = 'În curs' | 'Programată' | 'Simulare';

export interface PlanWeek {
  w: string;
  stare: PlanStare;
  caps: string[];
  target: string;
  pct: number;
}

export const PLAN_WEEKS: PlanWeek[] = [
  {
    w: 'S1 · 12–18 august',
    stare: 'În curs',
    caps: ['04. Glandele endocrine', '05. Sistemul osos'],
    target: '240 grile',
    pct: 62,
  },
  {
    w: 'S2 · 19–25 august',
    stare: 'Programată',
    caps: ['06. Sistemul muscular', '05. Alcooli. Fenoli'],
    target: '260 grile',
    pct: 0,
  },
  {
    w: 'S3 · 26 aug – 1 sept',
    stare: 'Programată',
    caps: ['08. Sistemul circulator', '06. Acizi carboxilici'],
    target: '260 grile',
    pct: 0,
  },
  {
    w: 'S4 · 2–8 septembrie',
    stare: 'Simulare',
    caps: ['Recapitulare capitole 01–08', 'Simulare UMFCD · 100 grile'],
    target: '100 grile + simulare',
    pct: 0,
  },
];

export const SIMULARI_ANTERIOARE = [
  { title: 'UMFCD 2025 · Medicină', meta: 'acum 3 zile · 2h 41m', score: 68 },
  { title: 'Simulare oficială · aprilie', meta: '12 iulie · 2h 55m', score: 71 },
  { title: 'UMFCD 2026 · Medicină', meta: '28 iunie · 2h 38m', score: 76 },
];

export const ADMIN_STATS = [
  { label: 'Grile publicate', value: '2 220' },
  { label: 'În așteptare', value: '37' },
  { label: 'Raportate de elevi', value: '6' },
  { label: 'Adăugate luna asta', value: '148' },
];

export type QueueStare = 'În așteptare' | 'Raportată' | 'Publicată';

export const ADMIN_QUEUE: { text: string; meta: string; stare: QueueStare }[] = [
  {
    text: 'Fibrele musculare netede se caracterizează prin…',
    meta: 'Biologie · 06. Sistemul muscular · complement simplu',
    stare: 'În așteptare',
  },
  {
    text: 'Referitor la acidul acetic sunt corecte afirmațiile…',
    meta: 'Chimie · 06. Acizi carboxilici · complement grupat',
    stare: 'În așteptare',
  },
  { text: 'Nefronul este format din…', meta: 'Biologie · 11. Excreția · complement simplu', stare: 'Raportată' },
  { text: 'Glucoza este o…', meta: 'Chimie · 09. Zaharide · flashcard', stare: 'Publicată' },
];
