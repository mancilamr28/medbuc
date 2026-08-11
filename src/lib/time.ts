/** Zile întregi rămase până la o dată, calculate pe zile calendaristice. */
export function daysUntil(target: Date, from: Date = new Date()): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');

/** mm:ss, sau h:mm:ss când sesiunea trece de o oră. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Data de azi, scrisă ca „11 august” — folosită în antetul recapitulării. */
const MONTHS = [
  'ianuarie',
  'februarie',
  'martie',
  'aprilie',
  'mai',
  'iunie',
  'iulie',
  'august',
  'septembrie',
  'octombrie',
  'noiembrie',
  'decembrie',
];

export function formatDay(d: Date = new Date()): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
