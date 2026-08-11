export { SANS } from '../lib/ui';

/** Culoarea etichetei ultimei valori din graficul de evoluție. */
export const SCORE_LABEL_FILL = 'var(--fg)';

/** Pragul sub care recomandăm reluarea capitolului. */
export const PRAG_RELUARE = 70;

export const barColor = (pct: number): string =>
  pct >= 80 ? 'var(--ok)' : pct >= 65 ? 'var(--brand)' : 'var(--bad)';
