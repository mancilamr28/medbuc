import { numar } from '../lib/text';

/** Minimul cerut de Supabase; verificat și aici, ca omul să afle înainte de cerere. */
export const LUNGIME_MINIMA_PAROLA = 6;

/**
 * Ce e în neregulă cu schimbarea cerută, sau `null` dacă e în regulă.
 *
 * Pură, ca `mesajEroare`: regulile astea sunt exact genul de text care se scrie
 * o dată și apoi nu mai e citit de nimeni, iar „6 caractere" lângă un numeral
 * variabil e chiar acordul care s-a rupt de cinci ori până acum.
 */
export function valideazaParolaNoua(
  curenta: string,
  noua: string,
  confirmare: string,
): string | null {
  if (curenta === '') return 'Scrie parola actuală.';
  if (noua.length < LUNGIME_MINIMA_PAROLA) {
    return `Parola nouă trebuie să aibă cel puțin ${numar(LUNGIME_MINIMA_PAROLA, 'caracter', 'caractere')}.`;
  }
  if (noua === curenta) return 'Parola nouă e aceeași cu cea de acum.';
  if (noua !== confirmare) return 'Confirmarea nu se potrivește cu parola nouă.';
  return null;
}
