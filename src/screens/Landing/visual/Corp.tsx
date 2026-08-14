import type { CSSProperties } from 'react';
import { usePointerGlow } from '../motion';

/**
 * Obiectul central al eroului.
 *
 * Nu e decor abstract ales pentru că arată futurist: cele două probe de la
 * admitere sunt Biologie și Chimie organică, așa că din compoziție fac parte un
 * nucleu cu ramificații neuronale, câteva celule și un ciclu hexagonal —
 * benzenul. Cine dă examenul recunoaște ambele.
 *
 * Patru straturi cu factori de paralaxă diferiți (`--f`), fiecare cu propria
 * plutire, dau adâncimea. Totul e SVG și CSS: un obiect ca ăsta în WebGL ar
 * costa o bibliotecă de câteva sute de kilobytes pentru un desen care nu se
 * rotește niciodată complet.
 */

/** Punctele de pe orbite și particulele din jur, ca să nu fie scrise de mână în JSX. */
const ORBITALE = [
  { r: 168, unghi: -28, marime: 4.5 },
  { r: 168, unghi: 132, marime: 3 },
  { r: 132, unghi: 62, marime: 3.5 },
  { r: 132, unghi: 228, marime: 2.5 },
];

const PARTICULE = [
  { x: 96, y: 74, r: 2.4, d: 7, i: 0 },
  { x: 318, y: 108, r: 1.8, d: 9, i: 1.2 },
  { x: 344, y: 236, r: 2.8, d: 8, i: 0.5 },
  { x: 74, y: 268, r: 2, d: 11, i: 2.1 },
  { x: 152, y: 344, r: 2.4, d: 9, i: 1.6 },
  { x: 268, y: 336, r: 1.6, d: 12, i: 0.8 },
  { x: 46, y: 172, r: 1.6, d: 10, i: 2.6 },
  { x: 356, y: 168, r: 2.2, d: 8, i: 1.9 },
];

/** Dendritele: pornesc din nucleu și se ramifică. Fiecare se desenează la încărcare. */
const TRASEE = [
  'M200 200 C 176 168, 150 152, 118 140 S 78 118, 62 96',
  'M200 200 C 228 174, 262 164, 296 158 S 340 146, 356 128',
  'M200 200 C 214 236, 236 262, 268 282 S 306 312, 314 340',
  'M200 200 C 172 228, 142 244, 106 252 S 62 268, 48 292',
  'M200 200 C 196 160, 202 126, 216 96',
  'M200 200 C 158 206, 122 214, 92 200',
];

/** Nodurile de la capătul ramificațiilor. */
const NODURI = [
  { x: 62, y: 96, r: 4 },
  { x: 356, y: 128, r: 3.4 },
  { x: 314, y: 340, r: 4.2 },
  { x: 48, y: 292, r: 3 },
  { x: 216, y: 96, r: 3.6 },
  { x: 92, y: 200, r: 3 },
  { x: 118, y: 140, r: 2.4 },
  { x: 296, y: 158, r: 2.4 },
  { x: 268, y: 282, r: 2.4 },
];

/** Vârfurile unui hexagon regulat — ciclul benzenic. */
const hexagon = (cx: number, cy: number, r: number): string =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

const pePoarta = (r: number, unghiGrade: number) => {
  const a = (unghiGrade * Math.PI) / 180;
  return { x: 200 + r * Math.cos(a), y: 200 + r * Math.sin(a) };
};

export function Corp() {
  const ref = usePointerGlow<HTMLDivElement>();

  return (
    <div className="lp-obiect" ref={ref} aria-hidden="true">
      <div className="lp-obiect__aura" />
      <svg className="lp-obiect__svg" viewBox="0 0 400 400" fill="none">
        <defs>
          <radialGradient id="lpNucleu" cx="42%" cy="36%" r="72%">
            <stop offset="0%" stopColor="oklch(0.97 0.05 200)" />
            <stop offset="42%" stopColor="oklch(0.82 0.14 218)" />
            <stop offset="100%" stopColor="oklch(0.52 0.17 255)" />
          </radialGradient>
          <radialGradient id="lpCelula" cx="34%" cy="30%" r="76%">
            <stop offset="0%" stopColor="oklch(0.85 0.12 190)" stopOpacity="0.34" />
            <stop offset="70%" stopColor="oklch(0.6 0.16 245)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="oklch(0.6 0.16 245)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lpFir" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.86 0.13 205)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="oklch(0.6 0.17 258)" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="lpInel" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.86 0.12 178)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="oklch(0.6 0.17 262)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Strat 1 — orbitele. Cel mai depărtat, deci se mișcă cel mai puțin. */}
        <g className="lp-paralax" style={{ '--f': 5 } as CSSProperties}>
          <g className="lp-strat lp-strat--3">
            <circle cx="200" cy="200" r="168" stroke="url(#lpInel)" strokeWidth="1" strokeDasharray="2 9" />
            <circle cx="200" cy="200" r="132" stroke="var(--lp-line2)" strokeWidth="1" />
            <ellipse
              cx="200"
              cy="200"
              rx="176"
              ry="104"
              stroke="url(#lpInel)"
              strokeWidth="1"
              transform="rotate(-24 200 200)"
              opacity="0.55"
            />
            <g className="lp-orbita" style={{ '--durata': '46s' } as CSSProperties}>
              {ORBITALE.map((o, i) => {
                const { x, y } = pePoarta(o.r, o.unghi);
                return <circle key={i} cx={x} cy={y} r={o.marime} fill="var(--lp-teal)" opacity="0.75" />;
              })}
            </g>
          </g>
        </g>

        {/* Strat 2 — celulele translucide. */}
        <g className="lp-paralax" style={{ '--f': 10 } as CSSProperties}>
          <g className="lp-strat lp-strat--2">
            <circle cx="278" cy="272" r="74" fill="url(#lpCelula)" />
            <circle cx="278" cy="272" r="74" stroke="oklch(0.85 0.12 190 / 0.22)" strokeWidth="1" />
            <circle cx="292" cy="258" r="13" stroke="oklch(0.85 0.12 190 / 0.34)" strokeWidth="1" />
            <circle cx="122" cy="146" r="52" fill="url(#lpCelula)" />
            <circle cx="122" cy="146" r="52" stroke="oklch(0.85 0.12 190 / 0.2)" strokeWidth="1" />
            <circle cx="112" cy="136" r="9" stroke="oklch(0.85 0.12 190 / 0.32)" strokeWidth="1" />
            <circle cx="118" cy="300" r="34" fill="url(#lpCelula)" />
            <circle cx="118" cy="300" r="34" stroke="oklch(0.85 0.12 190 / 0.18)" strokeWidth="1" />
          </g>
        </g>

        {/* Strat 3 — rețeaua neuronală și nucleul. */}
        <g className="lp-paralax" style={{ '--f': 17 } as CSSProperties}>
          <g className="lp-strat lp-strat--1">
            {TRASEE.map((d, i) => (
              <path
                key={d}
                className="lp-traseu"
                d={d}
                pathLength={1}
                stroke="url(#lpFir)"
                strokeWidth="1.4"
                strokeLinecap="round"
                style={{ '--intarziere': `${0.35 + i * 0.13}s` } as CSSProperties}
              />
            ))}
            {NODURI.map((n) => (
              <circle key={`${n.x}-${n.y}`} cx={n.x} cy={n.y} r={n.r} fill="var(--lp-cyan)" opacity="0.85" />
            ))}

            {/* Nucleul: cercuri concentrice care se strâng spre un miez luminos. */}
            <circle cx="200" cy="200" r="46" stroke="oklch(0.72 0.155 233 / 0.28)" strokeWidth="1" />
            <circle cx="200" cy="200" r="32" stroke="oklch(0.845 0.132 213 / 0.4)" strokeWidth="1" />
            <circle cx="200" cy="200" r="19" fill="url(#lpNucleu)" />
            <circle cx="193" cy="192" r="6" fill="oklch(1 0 0 / 0.55)" />
          </g>
        </g>

        {/* Strat 4 — ciclul benzenic și particulele. Cel mai apropiat, cel mai mobil. */}
        <g className="lp-paralax" style={{ '--f': 26 } as CSSProperties}>
          <g className="lp-strat lp-strat--2">
            <g className="lp-orbita lp-orbita--invers" style={{ '--durata': '68s' } as CSSProperties}>
              <polygon
                points={hexagon(310, 116, 30)}
                stroke="var(--lp-teal)"
                strokeWidth="1.3"
                strokeLinejoin="round"
                opacity="0.75"
              />
              <circle cx="310" cy="116" r="17" stroke="var(--lp-teal)" strokeWidth="1.1" opacity="0.45" />
              {hexagon(310, 116, 30)
                .split(' ')
                .map((p) => {
                  const [x, y] = p.split(',');
                  return <circle key={p} cx={x} cy={y} r="2.6" fill="var(--lp-teal)" opacity="0.9" />;
                })}
            </g>

            {PARTICULE.map((p) => (
              <circle
                key={`${p.x}-${p.y}`}
                className="lp-particula"
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill="var(--lp-cyan)"
                style={{ '--durata': `${p.d}s`, '--intarziere': `${p.i}s` } as CSSProperties}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
