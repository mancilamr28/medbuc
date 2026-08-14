import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Cele două reguli care țin pagina de prezentare separată de aplicație.
 *
 * Niciuna nu s-ar vedea într-un test de randare, pentru că ambele eșuează
 * tăcut: prima produce o navigare greșită doar la clic, a doua nu produce
 * nimic vizibil, doar un bundle mai mare pentru toți ceilalți. De aceea sunt
 * verificate pe fișiere, în stilul aserției pe `index.html` din
 * `AppState.test.tsx`.
 */
const RADACINA = join(process.cwd(), 'src', 'screens', 'Landing');

function fisiere(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((intrare) => {
    const cale = join(dir, intrare.name);
    if (intrare.isDirectory()) return fisiere(cale);
    return /\.tsx?$/.test(intrare.name) && !intrare.name.endsWith('.test.ts') ? [cale] : [];
  });
}

describe('izolarea paginii de prezentare', () => {
  /**
   * Pagina se randează exclusiv fără sesiune, iar `go()` duce spre rute care
   * cer autentificare: un `go('acasa')` strecurat aici — de pildă prin
   * componenta `Logo`, care îl apelează — ar arunca vizitatorul din pagina de
   * prezentare direct în formularul de login, la un clic pe siglă.
   */
  it('nu folosește starea aplicației sau a sesiunii', () => {
    // Se caută importul, nu orice apariție a numelui: hook-ul nu poate fi apelat
    // fără el, iar comentariile care explică tocmai regula asta îl pomenesc.
    const vinovate = fisiere(RADACINA).filter((cale) => {
      const text = readFileSync(cale, 'utf8');
      return /import[^;]*\b(useApp|useAuth)\b[^;]*from/.test(text);
    });

    expect(vinovate).toEqual([]);
  });

  /**
   * `App.tsx` o încarcă prin `lazy`. Un import static de oriunde din afara
   * directorului ar readuce tot chunk-ul — pagină, stiluri, machete — în
   * bundle-ul principal, pe care îl descarcă și elevii autentificați care nu
   * văd niciodată ecranul ăsta.
   */
  it('nu e importată static din afara directorului ei', () => {
    const restul = fisiere(join(process.cwd(), 'src')).filter((c) => !c.startsWith(RADACINA));

    const vinovate = restul.filter((cale) => {
      const text = readFileSync(cale, 'utf8');
      // `import(...)` dinamic e permis; `from '...'` static, nu.
      return /from\s+['"][^'"]*screens\/Landing/.test(text);
    });

    expect(vinovate).toEqual([]);
  });
});
