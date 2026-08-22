import { TAXONOMIE_GOALA } from '../../lib/taxonomie';
import { useContentOptional } from '../../state/contentState';
import { Nav } from './parts/Nav';
import { Capabilitati } from './sections/Capabilitati';
import { CtaFinal } from './sections/CtaFinal';
import { Cifre } from './sections/Cifre';
import { Drum } from './sections/Drum';
import { Hero } from './sections/Hero';
import { Parcurs } from './sections/Parcurs';
import { Subsol } from './sections/Subsol';
import { Fundal } from './visual/Fundal';
import './landing.css';

/**
 * Pagina publică — ce vede cineva care ajunge pe MedBuc fără cont.
 *
 * Două reguli țin toată mapa asta în picioare și e ușor să fie stricate din
 * greșeală:
 *
 * 1. **Nimic de aici nu importă `useApp()` sau `useAuth()`.** Pagina se
 *    randează exclusiv când nu există sesiune, iar navigarea aplicației (`go`)
 *    duce către rute care cer autentificare — un `go('acasa')` pus aici ar
 *    arunca vizitatorul în formularul de login. Navigarea se face prin
 *    `CtaAuth`, singurul care știe rutele publice.
 *
 * 2. **Nimic din afara acestui director nu importă din el.** `App.tsx` îl
 *    încarcă prin `lazy`; un import static de oriunde altundeva ar readuce tot
 *    chunk-ul — pagină, stiluri, machete — în bundle-ul principal, pe care îl
 *    descarcă și elevii autentificați care nu văd niciodată ecranul ăsta.
 *
 * `Landing.test.tsx` verifică prima regulă pe fișiere, pentru că un test de
 * randare n-ar prinde-o.
 *
 * Taxonomia se citește o singură dată, aici, și coboară prin prop-uri. Nu încalcă
 * regula 1: interdicția e pe `useApp`/`useAuth` fiindcă amândouă aduc navigarea
 * aplicației cu ele; `useContentOptional` aduce doar date, nu `go()`, și nu
 * aruncă în afara provider-ului. Materiile și capitolele publicate se citesc și
 * fără sesiune (migrarea 0009), tocmai ca pagina asta să nu mai numere dintr-o
 * listă compilată care se învechește.
 */
export function Landing() {
  const taxonomie = useContentOptional()?.taxonomie ?? TAXONOMIE_GOALA;

  return (
    <div className="lp">
      <Fundal />
      <Nav />
      <main>
        <Hero />
        <Cifre taxonomie={taxonomie} />
        <Capabilitati taxonomie={taxonomie} />
        <Parcurs />
        <Drum />
        <CtaFinal />
      </main>
      <Subsol />
    </div>
  );
}
