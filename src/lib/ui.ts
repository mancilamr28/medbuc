import type { CSSProperties } from 'react';

export type SX = CSSProperties;

export const SANS = "'Public Sans',sans-serif";
export const SERIF = 'Newsreader,Georgia,serif';

/** Eticheta mică, majuscule spațiate, folosită drept titlu de secțiune. */
export const eyebrow = (color = 'var(--fg3)', size = 10.5): SX => ({
  font: `600 ${size}px/1 ${SANS}`,
  letterSpacing: '.12em',
  textTransform: 'uppercase',
  color,
});

/** Titlul serif al ecranului. */
export const pageTitle: SX = {
  margin: 0,
  font: `400 34px/1.1 ${SERIF}`,
  letterSpacing: '-.015em',
};

export const pageLead: SX = {
  margin: '7px 0 0',
  font: `400 14px/1.5 ${SANS}`,
  color: 'var(--fg2)',
};

/** Butonul dintr-un grup segmentat (Focus / Dens, Evoluție / Pe capitole…). */
export const segButton = (active: boolean): SX => ({
  padding: '8px 13px',
  border: 0,
  borderRadius: 8,
  cursor: 'pointer',
  font: `${active ? 600 : 500} 12.5px ${SANS}`,
  whiteSpace: 'nowrap',
  background: active ? 'var(--surf)' : 'transparent',
  color: active ? 'var(--fg)' : 'var(--fg3)',
  boxShadow: active ? '0 1px 2px rgba(20,20,45,.12)' : 'none',
});

export const segGroup: SX = {
  display: 'flex',
  gap: 6,
  padding: 4,
  background: 'var(--surf2)',
  border: '1px solid var(--line)',
  borderRadius: 11,
};

export const navItem = (active: boolean): SX => ({
  display: 'flex',
  alignItems: 'center',
  gap: 11,
  width: '100%',
  padding: '9px 10px',
  border: 0,
  borderRadius: 9,
  cursor: 'pointer',
  textAlign: 'left',
  font: `${active ? 600 : 400} 13.5px ${SANS}`,
  background: active ? 'var(--brandS)' : 'transparent',
  color: active ? 'var(--brand)' : 'var(--fg2)',
});

export const navDot = (active: boolean): SX => ({
  width: 5,
  height: 5,
  borderRadius: 2,
  flex: '0 0 auto',
  background: active ? 'var(--brand)' : 'var(--line2)',
});

export const mobileNavItem = (active: boolean): SX => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 5,
  padding: '8px 4px',
  border: 0,
  borderRadius: 9,
  cursor: 'pointer',
  font: `${active ? 600 : 400} 11px ${SANS}`,
  background: active ? 'var(--brandS)' : 'transparent',
  color: active ? 'var(--brand)' : 'var(--fg3)',
});

export const mobileNavDot = (active: boolean): SX => ({
  width: 6,
  height: 6,
  borderRadius: 2,
  background: active ? 'var(--brand)' : 'var(--line2)',
});

/** Procentul de corecte: gri când capitolul e neînceput, roșu sub 65, verde peste 80. */
export const pctPill = (pct: number, width = 44): SX => ({
  font: `600 13px ${SANS}`,
  color: pct === 0 ? 'var(--fg3)' : pct >= 80 ? 'var(--ok)' : pct >= 65 ? 'var(--fg2)' : 'var(--bad)',
  width,
  textAlign: 'right',
  flex: '0 0 auto',
  fontVariantNumeric: 'tabular-nums',
});

export const progressTrack = (height = 6, width: string | number = '100%'): SX => ({
  width,
  height,
  borderRadius: 99,
  background: 'var(--surf3)',
  overflow: 'hidden',
  flex: '0 0 auto',
});

export const progressFill = (pct: number, color = 'var(--brand)'): SX => ({
  display: 'block',
  width: `${Math.max(0, Math.min(100, pct))}%`,
  height: '100%',
  background: color,
  borderRadius: 99,
});

/** Pastila colorată folosită pentru stări (În curs, Publicată, Raportată…). */
export const statusChip = (bg: string, color: string): SX => ({
  font: `600 10.5px/1 ${SANS}`,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  padding: '5px 9px',
  borderRadius: 99,
  whiteSpace: 'nowrap',
  background: bg,
  color,
});

export const cardPad = (padding: number | string = 20): SX => ({ padding });

export const stack = (gap: number): SX => ({ display: 'flex', flexDirection: 'column', gap });

export const autoGrid = (min: number, gap = 18): SX => ({
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`,
  gap,
});

/** Coloana principală + coloana laterală; pe ecrane mici cade pe o singură coloană. */
export const twoCol = (desktop: boolean, ratio = '2.2fr'): SX => ({
  display: 'grid',
  gridTemplateColumns: desktop ? `minmax(0,${ratio}) minmax(0,1fr)` : 'minmax(0,1fr)',
  gap: 18,
  alignItems: 'start',
});

export const sideStack: SX = { display: 'grid', gap: 18, alignContent: 'start', minWidth: 0 };

export const label: SX = {
  display: 'block',
  font: `600 10.5px/1 ${SANS}`,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: 'var(--fg3)',
  marginBottom: 8,
};
