import type { CodLucrare, ModTest } from '../lib/lucrari';
import { numar } from '../lib/text';

/**
 * Frazele ecranului de lucrare, ca funcții pure.
 *
 * Două motive, amândouă din `CLAUDE.md`. Acordul cu numeralul: un text scris
 * direct în JSX nu poate fi verificat la 1, 2 și 20, iar „1 grilă corecte" a
 * plecat în producție de cinci ori. Și traducerea codurilor: motorul întoarce
 * coduri (`fara_candidati`, `lucrare_predata`) tocmai ca ecranul să poată
 * ramifica — dar cuvintele se aleg **aici**, unde se știe contextul, fiindcă
 * „n-am găsit nicio grilă" sună altfel la exersare decât la greșelile tale.
 */

const TITLURI: Record<string, string> = {
  exersare: 'Exersare',
  simulare: 'Simulare',
  recapitulare: 'Recapitulare',
  test_predefinit: 'Test predefinit',
  greseli: 'Greșelile mele',
  favorite: 'Favoritele mele',
  nevazute: 'Grile noi',
};

/** Numele modului; id-ul brut dacă vine unul necunoscut, ca peste tot. */
export const titluMod = (mod: ModTest): string => TITLURI[mod] ?? mod;

/**
 * De ce nu se poate deschide lucrarea.
 *
 * Lista e închisă, la fel ca `CODURI_LUCRARE`: un cod nou trebuie să ajungă
 * aici deliberat, nu să cadă tăcut pe fraza generală și să lase elevul fără
 * explicație.
 */
export function mesajCodLucrare(cod: CodLucrare | null): string {
  switch (cod) {
    case 'lucrare_inexistenta':
      return 'Lucrarea asta nu există sau nu e a ta.';
    case 'lucrare_predata':
      return 'Lucrarea e deja predată.';
    case 'neautentificat':
      return 'Sesiunea ta a expirat. Intră din nou în cont.';
    case 'raspuns_blocat':
      return 'Grila a fost deja verificată, răspunsul nu se mai schimbă.';
    case 'pozitie_inexistenta':
      return 'Grila asta nu e în lucrare.';
    case 'test_predefinit_inexistent':
      return 'Testul nu mai este disponibil.';
    case 'test_predefinit_indisponibil':
      return 'Testul este temporar indisponibil deoarece una dintre grile trebuie verificată.';
    case 'acces_interzis':
      return 'Testul acesta necesită acces premium.';
    case 'fara_candidati':
    case 'insuficient_strict':
    case 'mod_necunoscut':
    case 'nr_invalid':
      return 'Lucrarea nu a putut fi compusă.';
    default:
      return 'Nu am putut deschide lucrarea.';
  }
}

/**
 * Scorul în cuvinte.
 *
 * Numitorul e ce s-a cerut, nu câte grile au intrat în lucrare — așa scrie
 * `genereaza_test` în `nr_cerut`, ca o lucrare livrată mai scurtă să nu umfle
 * tăcut procentul. Lucrările mutate din tabelele vechi n-au numitor deloc:
 * atunci se spune doar câte au fost corecte, nu se inventează unul.
 */
export const frazaScor = (corecte: number, nrCerut: number | null): string =>
  nrCerut === null
    ? numar(corecte, 'grilă corectă', 'grile corecte')
    : `${numar(corecte, 'grilă corectă', 'grile corecte')} din ${nrCerut}`;

/** Câte au rămas fără răspuns, pe panoul de rezultat. */
export const frazaFaraRaspuns = (n: number): string =>
  n === 0 ? 'Ai răspuns la toate' : numar(n, 'grilă fără răspuns', 'grile fără răspuns');

/**
 * Antetul lucrării: al doilea rând, sub numele modului.
 *
 * `total` e câte grile are chiar lucrarea, `nrCerut` e din cât se socotește.
 * Când diferă — banca n-a avut destule — se spun amândouă, fiindcă exact acolo
 * diferența e informația utilă.
 */
export function detaliuLucrare(total: number, nrCerut: number | null): string {
  if (nrCerut === null || nrCerut === total) return numar(total, 'grilă', 'grile');
  // Adjectivul stă înăuntrul lui `numar()`, nu lipit după el: „1 grilă,
  // socotite din 20" e chiar forma greșită care a plecat de cinci ori.
  return `${numar(total, 'grilă socotită', 'grile socotite')} din ${nrCerut}`;
}
