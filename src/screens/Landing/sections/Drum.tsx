import { useInView } from '../motion';
import { Marcaj } from '../parts/Marcaj';
import { Reveal } from '../parts/Reveal';

/**
 * Parcursul lung, ca imagine.
 *
 * O linie luminoasă care urcă spre examen, cu patru etape pe ea. Se desenează
 * o dată, când secțiunea intră în ecran — `stroke-dashoffset` peste o cale cu
 * `pathLength="1"`, deci o singură proprietate animată, pe compozitor.
 *
 * Nu promite nimic despre admitere. Etapele descriu ce faci, nu ce obții:
 * o pagină care sugerează un loc garantat la facultate minte, iar aplicația nu
 * are voie să mintă nici în cifre, nici în copy.
 */

const ETAPE = [
  { nume: 'Înveți', text: 'Capitol cu capitol, cu notițele tale lângă.' },
  { nume: 'Exersezi', text: 'Grile cu explicație, fără cronometru.' },
  { nume: 'Simulezi', text: 'Lucrare întreagă, în condiții de examen.' },
  { nume: 'Perfecționezi', text: 'Te întorci la ce ți-a scăpat.' },
];

/**
 * Punctele pe care le atinge linia.
 *
 * X-urile sunt exact centrele celor patru coloane ale grilei de etichete de
 * dedesubt (12,5% / 37,5% / 62,5% / 87,5% din 900), ca fiecare etichetă să cadă
 * fix sub punctul ei. Alese la ochi, s-ar vedea decalate tocmai la capete.
 */
const PUNCTE = [
  { x: 112.5, y: 150 },
  { x: 337.5, y: 116 },
  { x: 562.5, y: 78 },
  { x: 787.5, y: 22 },
];

/** Linia de bază a eticheteor: unde cad reperele verticale. */
const BAZA = 186;

export function Drum() {
  const [ref, vazut] = useInView<HTMLDivElement>({ prag: 0.35 });

  return (
    <section className="lp-sectiune lp-wrap" id="parcurs">
      {/* Antet pe două coloane, spre deosebire de secțiunile dinainte: le ține
          diferite între ele și scurtează teancul de dinaintea graficului. */}
      <div className="lp-antet2">
        <Reveal fel="rand">
          <Marcaj nr="03">Parcursul</Marcaj>
          <h2 className="lp-h2" style={{ maxWidth: '14ch' }}>
            Un examen se pregătește în luni, nu în seri.
          </h2>
        </Reveal>
        <Reveal fel="sus" indice={1}>
          <p className="lp-lead" style={{ margin: 0 }}>
            Aplicația nu-ți promite un loc la medicină. Îți ține evidența a ceea ce ai făcut deja, ca drumul până acolo
            să fie vizibil, nu o senzație.
          </p>
        </Reveal>
      </div>

      <div className="lp-drum" ref={ref} data-vazut={vazut}>
        {/* viewBox-ul are spațiu peste linie pentru eticheta de la capăt. */}
        <svg className="lp-drum__svg" viewBox="0 -34 900 224" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="lpDrumGradient" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.62 0.165 282)" />
              <stop offset="46%" stopColor="oklch(0.72 0.155 233)" />
              <stop offset="100%" stopColor="oklch(0.855 0.125 178)" />
            </linearGradient>
            <filter id="lpDrumGlow" x="-40%" y="-140%" width="180%" height="380%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          {/* Linia de sub: arată tot drumul, inclusiv partea nedesenată încă. */}
          <path className="lp-drum__traseu-fund" d={TRASEU} strokeDasharray="3 7" />

          {/* Aceeași cale, blurată, ca halou. */}
          <path d={TRASEU} stroke="url(#lpDrumGradient)" strokeWidth="4" filter="url(#lpDrumGlow)" opacity="0.5" />
          <path className="lp-drum__traseu" d={TRASEU} pathLength={1} />

          {PUNCTE.map((p, i) => {
            const ultim = i === PUNCTE.length - 1;
            return (
              <g key={p.x}>
                {/* Reperul care coboară spre eticheta lui: fără el, numele
                    etapelor plutesc sub o linie de care nu se leagă. */}
                <line
                  className="lp-drum__reper"
                  x1={p.x}
                  y1={p.y + 15}
                  x2={p.x}
                  y2={BAZA}
                  stroke="var(--lp-line2)"
                  strokeWidth="1"
                  strokeDasharray="2 5"
                />
                <circle cx={p.x} cy={p.y} r="13" fill="oklch(0.145 0.028 262)" />
                <circle cx={p.x} cy={p.y} r="13" stroke={ultim ? 'var(--lp-teal)' : 'var(--lp-line2)'} strokeWidth="1" />
                <circle cx={p.x} cy={p.y} r="4.5" fill={ultim ? 'var(--lp-teal)' : 'var(--lp-cyan)'} />
              </g>
            );
          })}

          {/* Capătul: examenul. */}
          <text
            x="787.5"
            y="-12"
            textAnchor="middle"
            fill="var(--lp-fg3)"
            style={{ font: "500 12px 'Public Sans', sans-serif", letterSpacing: '0.1em' }}
          >
            UMFCD
          </text>
        </svg>

        <div className="lp-drum__etape">
          {ETAPE.map((e, i) => (
            <Reveal key={e.nume} fel="sus" indice={i} className="lp-etapa">
              <div className="lp-etapa__nume">{e.nume}</div>
              <div className="lp-etapa__text">{e.text}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Curba care leagă cele patru puncte. Urcă tot mai abrupt spre examen. */
const TRASEU =
  'M112.5 150 C 200 156, 252 122, 337.5 116 S 480 100, 562.5 78 S 704 58, 787.5 22';
