/**
 * Acordul numeralului în română.
 *
 * „6 grile", dar „20 de grile": prepoziția apare când ultimele două cifre sunt
 * peste 19 sau exact 00 (100 de grile, 101 grile, 120 de grile). Fără regula
 * asta, orice text construit din numere sună a traducere.
 */
export const needsDe = (n: number): boolean => {
  const ultimele = Math.abs(Math.trunc(n)) % 100;
  return ultimele === 0 ? Math.abs(n) >= 100 : ultimele > 19;
};

/**
 * Numeralul cu substantivul acordat, ex. `numar(1, 'grilă', 'grile')` → „1 grilă",
 * `numar(346, 'zi', 'zile')` → „346 de zile".
 */
export const numar = (n: number, singular: string, plural: string): string => {
  if (Math.abs(n) === 1) return `${n} ${singular}`;
  return `${n} ${needsDe(n) ? 'de ' : ''}${plural}`;
};
