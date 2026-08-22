import type { Taxonomie } from '../../../lib/taxonomie';
import { Marcaj } from '../parts/Marcaj';
import { Panou } from '../parts/Panou';
import { Reveal } from '../parts/Reveal';
import { PreviewGrila } from '../visual/PreviewGrila';

/**
 * Ce poate face un elev în aplicație.
 *
 * Compoziție asimetrică, nu o grilă de șase carduri identice: un panou mare cu
 * macheta funcțională a grilelor, două panouri mici lângă el.
 *
 * Fiecare rând din liste corespunde unui comportament care chiar există în
 * `Grile.tsx` (configurarea sesiunii, inclusă) și `Simulari.tsx`. Nu apar aici
 * statisticile, planul de învățare sau repetarea inteligentă — sunt ecrane „în
 * lucru", iar o pagină de prezentare care le promite ar minți la fel de tare ca
 * un procent inventat.
 */

const DESPRE_GRILE = [
  'Explicație pentru fiecare variantă, nu doar pentru cea corectă.',
  'Răspunsul se blochează după verificare, ca la examen.',
  'Răspunzi de la tastatură: A–E, apoi Enter.',
  'Notiță proprie pe fiecare capitol, salvată pe dispozitiv.',
];

export function Capabilitati({ taxonomie }: { taxonomie: Taxonomie }) {
  return (
    <section className="lp-sectiune lp-wrap" id="ce-poti-face">
      <Reveal fel="rand">
        <Marcaj nr="01">Ce poți face</Marcaj>
      </Reveal>
      <Reveal fel="rand" indice={1}>
        <h2 className="lp-h2">Tot ce-ți trebuie ca să exersezi serios.</h2>
      </Reveal>
      <Reveal fel="sus" indice={2}>
        <p className="lp-lead">
          Trei lucruri, făcute până la capăt, în loc de zece pornite. Restul apar pe măsură ce sunt gata.
        </p>
      </Reveal>

      <div className="lp-cap">
        <Reveal fel="stanga" className="lp-cap__mare">
          <Panou>
            <span className="lp-chip lp-chip--cyan">Grile</span>
            <h3 className="lp-h3" style={{ marginTop: 14 }}>
              Exersezi cu explicația în față
            </h3>
            <p className="lp-corp" style={{ marginTop: 8 }}>
              Încearcă aici, chiar acum — e o grilă adevărată din bancă.
            </p>

            <div style={{ marginTop: 20 }}>
              <PreviewGrila />
            </div>

            <ul className="lp-cap__lista">
              {DESPRE_GRILE.map((t) => (
                <li key={t}>
                  <Bifa />
                  {t}
                </li>
              ))}
            </ul>
          </Panou>
        </Reveal>

        <Reveal fel="dreapta" indice={1} className="lp-cap__mic">
          <Panou>
            <span className="lp-chip">Sesiune nouă</span>
            <h3 className="lp-h3" style={{ marginTop: 14 }}>
              Alegi exact de unde exersezi
            </h3>

            {/* Cifrele scoase din text: se citesc dintr-o privire. Se numără din
                taxonomia citită din bază, deci o materie nouă apare de la sine.
                Cât timp încă se încarcă nu se afișează nimic — un „0 capitole"
                ar fi o cifră falsă, iar aici tocmai asta e regula. */}
            {taxonomie.materii.length > 0 && (
              <div className="lp-mini">
                {taxonomie.materii.map((m) => (
                  <div key={m.id}>
                    <span className="lp-mini__n">{m.list.length}</span>
                    <span className="lp-mini__e">capitole {m.name}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="lp-corp" style={{ marginTop: 18 }}>
              Materie, apoi scop — toată programa, capitole anume sau punctele tale slabe — apoi sursa grilelor.
              Un capitol încă fără grile scrise o spune, nu se preface plin.
            </p>
          </Panou>
        </Reveal>

        <Reveal fel="dreapta" indice={2} className="lp-cap__mic">
          <Panou>
            <span className="lp-chip">Simulări</span>
            <h3 className="lp-h3" style={{ marginTop: 14 }}>
              O lucrare care nu te așteaptă
            </h3>
            <p className="lp-corp" style={{ marginTop: 8 }}>
              Alegi modelul, numărul de grile și timpul, apoi pornește cronometrul. Curge din ora de final, nu dintr-un
              contor: dacă închizi fila, timpul merge mai departe. Lucrarea se predă o dată, cu confirmare.
            </p>
          </Panou>
        </Reveal>
      </div>
    </section>
  );
}

function Bifa() {
  return (
    <svg className="lp-cap__bifa" width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 8.4l3 3 6-6.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
