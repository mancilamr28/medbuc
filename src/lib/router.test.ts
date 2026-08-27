import { describe, expect, it } from 'vitest';
import {
  PUBLIC_ROUTES,
  SCREENS,
  SECTIUNI_ADMIN,
  idLucrareDin,
  intentieTestNouDin,
  publicViewFor,
  screenFor,
  sectiuneAdminPentru,
} from './router';

describe('intenția asistentului de test', () => {
  it('păstrează felul și capitolul cerute din adresă', () => {
    expect(intentieTestNouDin('simulare', 'bio-nervos')).toEqual({
      mod: 'simulare',
      capitol: 'bio-nervos',
    });
  });

  it('cade pe exersare și ignoră capitolul când felul nu există', () => {
    expect(intentieTestNouDin('inventat', 'bio-nervos')).toEqual({
      mod: 'exersare',
      capitol: null,
    });
  });
});

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

/**
 * Al doilea segment, folosit doar de Administrare.
 *
 * Secțiunile nu sunt ecrane: nu apar în `SCREENS`, deci nici în `Sidebar`, nici
 * în `MobileNav`, iar `go()` n-are ce face cu ele. Testele de aici țin cele două
 * spații separate — dacă o secțiune ar ajunge `Screen`, `go('colectii')` ar
 * deveni apelabil de oriunde din aplicație.
 */
describe('secțiunile de administrare', () => {
  it('cad pe „grile" pentru orice nu recunosc, inclusiv gol', () => {
    expect(sectiuneAdminPentru('')).toBe('grile');
    expect(sectiuneAdminPentru('inventat')).toBe('grile');
    expect(sectiuneAdminPentru('colectii')).toBe('colectii');
  });

  it('nu se suprapun cu ecranele aplicației', () => {
    const ecrane = new Set<string>(SCREENS);
    for (const s of SECTIUNI_ADMIN) {
      // `grile` există în ambele spații, dar înseamnă lucruri diferite și e citit
      // din segmente diferite; restul n-au voie să se atingă.
      if (s === 'grile') continue;
      expect(ecrane.has(s), `secțiunea ${s} nu are voie să fie și ecran`).toBe(false);
    }
  });
});

/**
 * Ecranul se citește din **primul** segment.
 *
 * Înainte se citea tot hash-ul ca un singur nume, ceea ce mergea cât timp
 * fiecare ecran era o frunză. Cu `#/admin/colectii`, `admin/colectii` nu e
 * niciun `Screen` și cădea pe `acasa` — altă pagină decât cea cerută, tăcut.
 */
describe('rutarea pe două segmente', () => {
  it('recunoaște ecranul chiar când hash-ul are un al doilea segment', () => {
    expect(screenFor('admin')).toBe('admin');
    expect(screenFor('admin/colectii')).toBe('acasa');
  });

  it('trimite spre autentificare un link adânc deschis fără sesiune', () => {
    expect(publicViewFor('admin')).toBe('autentificare');
    expect(publicViewFor('inregistrare')).toBe('inregistrare');
    expect(publicViewFor('altceva')).toBe('landing');
  });
});

/**
 * Id-ul lucrării stă în adresă, nu în `localStorage`: lucrarea trăiește pe
 * server, deci adresa e de-ajuns ca să o redeschizi, iar o a doua sursă locală
 * de adevăr ar trebui migrată mai târziu.
 */
describe('id-ul lucrării din adresă', () => {
  it('citește un uuid din al doilea segment', () => {
    expect(idLucrareDin('0f5b9c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b')).toBe(
      '0f5b9c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5b',
    );
  });

  /**
   * Forma se verifică aici, nu la server: un segment inventat în bara de adrese
   * trebuie să dea „n-am ce deschide", nu un drum la bază cu un `uuid` invalid.
   */
  it('refuză orice nu e uuid, inclusiv lipsa segmentului', () => {
    expect(idLucrareDin(undefined)).toBeNull();
    expect(idLucrareDin('')).toBeNull();
    expect(idLucrareDin('ultima')).toBeNull();
    expect(idLucrareDin('0f5b9c2e-1a3d-4e5f-8a9b-0c1d2e3f4a5')).toBeNull();
    expect(idLucrareDin('../../questions')).toBeNull();
  });
});
