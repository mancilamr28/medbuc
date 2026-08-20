/** Pragul sub care recomandăm reluarea capitolului. */
export const PRAG_RELUARE = 70;

/**
 * Culoarea barei unui capitol — singura stare pe care graficul o poate afirma:
 * sub prag sau nu.
 *
 * Aveam trei praguri necorelate în același grafic: culoarea sărea la 65 și 80,
 * linia verticală stătea la 70, iar `capitoleSlabe` (progres.ts), adică
 * definiția reală a unui capitol slab din aplicație, nu folosea niciunul. Ieșea
 * un capitol la 68% desenat „bine", dar în stânga liniei de reluare, și unul la
 * 82% verde fără ca nimic din card să spună de ce.
 *
 * Acum culoarea se citește din `PRAG_RELUARE`, deci nu poate ieși din pas cu
 * linia. N-am pus o a treia treaptă „excelent": aplicația nu definește așa
 * ceva, iar inventarea unui prag nou ar reface exact problema de mai sus.
 */
export const barColor = (pct: number): string => (pct < PRAG_RELUARE ? 'var(--bad)' : 'var(--brand)');
