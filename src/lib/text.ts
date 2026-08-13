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

/** Primul prenume dintr-un nume complet; fără nume, partea dinaintea @ din email. */
export const primulNume = (nume: string | null, email: string): string => {
  const prim = nume?.trim().split(/\s+/)[0];
  if (prim) return prim;
  return email.split('@')[0] ?? email;
};

/** Inițialele unui nume, ex. „Andrei Popescu" → „AP". Fără nume, un singur caracter din email. */
export const initialeDin = (nume: string | null, email: string): string => {
  const cuvinte = nume?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (cuvinte.length > 0) {
    return cuvinte
      .slice(0, 2)
      .map((c) => c[0]!.toUpperCase())
      .join('');
  }
  return email[0]?.toUpperCase() ?? '?';
};
