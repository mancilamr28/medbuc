import { describe, expect, it } from 'vitest';
import { PUBLIC_ROUTES, SCREENS, publicViewFor, screenFor } from './router';

/**
 * Rutarea publică.
 *
 * `publicViewFor` e o funcție pură peste hash-ul deja curățat tocmai ca să
 * poată fi testată aici, în proiectul `node`, fără DOM. Fiecare caz de mai jos
 * corespunde unui comportament vizibil: ce vede un vizitator care ajunge pe
 * adresa principală, ce vede unul care dă clic pe „Creează cont" și unde
 * ajunge unul care are un link direct într-o pagină a aplicației.
 */
describe('publicViewFor', () => {
  it('trimite adresa principală la pagina de prezentare', () => {
    expect(publicViewFor('')).toBe('landing');
  });

  it('deschide direct ruta publică cerută', () => {
    for (const ruta of PUBLIC_ROUTES) {
      expect(publicViewFor(ruta)).toBe(ruta);
    }
  });

  /**
   * Un link direct într-o pagină a aplicației cere autentificare, nu prezentare.
   * Fără asta, cine primește `#/grile` de la un coleg ar ateriza pe pagina de
   * marketing și ar trebui să caute singur formularul de login.
   */
  it('cere autentificare pentru orice ecran al aplicației', () => {
    for (const ecran of SCREENS) {
      expect(publicViewFor(ecran)).toBe('autentificare');
    }
  });

  it('cade pe prezentare pentru orice altceva', () => {
    expect(publicViewFor('bla')).toBe('landing');
    expect(publicViewFor('ce-poti-face')).toBe('landing');
    // Fragmentul de la linkul de resetare, consumat de supabase-js înainte de
    // rutare: nu trebuie să însemne nimic aici.
    expect(publicViewFor('access_token=x&type=recovery')).toBe('landing');
  });

  /**
   * Cele două spații de rute trebuie să rămână disjuncte. O rută publică ajunsă
   * și în `SCREENS` ar fi de negăsit: `publicViewFor` verifică întâi rutele
   * publice, dar `readHash` ar începe să o considere un ecran valid și ar duce
   * un utilizator autentificat pe un ecran care nu are implementare.
   */
  it('nu suprapune rutele publice peste ecranele aplicației', () => {
    for (const ruta of PUBLIC_ROUTES) {
      expect(SCREENS).not.toContain(ruta);
    }
  });
});

describe('screenFor', () => {
  it('păstrează ecranele valide și cade pe acasă pentru restul', () => {
    expect(screenFor('grile')).toBe('grile');
    expect(screenFor('')).toBe('acasa');
    // Rutele publice nu sunt ecrane, deci după autentificare cad singure pe
    // `acasa` — de asta nu există logică de redirect după login.
    expect(screenFor('inregistrare')).toBe('acasa');
  });
});
