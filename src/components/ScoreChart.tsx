import { useId } from 'react';
import { MIN_GRILE_EVOLUTIE, type PunctEvolutie } from '../lib/progres';
import { numar } from '../lib/text';
import { SANS } from '../lib/ui';

const W = 720;
const H = 226;
const STANGA = 42;
const DREAPTA = 18;
const SUS = 22;
const JOS = 38;
const REPERE = [0, 25, 50, 75, 100] as const;

const yPentru = (pct: number): number => SUS + ((100 - pct) / 100) * (H - SUS - JOS);

function indexEtichete(lungime: number): Set<number> {
  if (lungime <= 6) return new Set(Array.from({ length: lungime }, (_, index) => index));
  const pas = Math.ceil((lungime - 1) / 5);
  const rezultat = new Set<number>([0, lungime - 1]);
  for (let index = pas; index < lungime - 1; index += pas) rezultat.add(index);
  return rezultat;
}

/**
 * Tendința zilnică a stăpânirii bibliotecii.
 *
 * Componenta nu primește scoruri arbitrare, ci punctele deja protejate de
 * `calculeazaProgres`: cel mult unul pe zi și numai după ce există un eșantion
 * minim de grile distincte. SVG-ul arată scara completă 0–100, ca o schimbare
 * mică să nu pară vizual mai dramatică decât este.
 */
export function ScoreChart({
  points,
  grileDistincte,
}: {
  points: readonly PunctEvolutie[];
  grileDistincte: number;
}) {
  const gradientId = useId().replaceAll(':', '');

  if (points.length === 0) {
    const ramase = Math.max(0, MIN_GRILE_EVOLUTIE - grileDistincte);
    const progres = Math.min(100, (grileDistincte / MIN_GRILE_EVOLUTIE) * 100);
    return (
      <div style={{ padding: '22px 16px 26px', textAlign: 'center' }}>
        <div style={{ font: `500 13.5px/1.4 ${SANS}`, color: 'var(--fg2)' }}>
          Avem nevoie de {numar(MIN_GRILE_EVOLUTIE, 'grilă distinctă', 'grile distincte')}
        </div>
        <div style={{ margin: '12px auto 0', maxWidth: 280, height: 7, borderRadius: 99, background: 'var(--surf2)', overflow: 'hidden' }}>
          <div style={{ width: `${progres}%`, height: '100%', borderRadius: 99, background: 'var(--brand)' }} />
        </div>
        <div style={{ marginTop: 9, font: `400 12.5px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
          {grileDistincte === 0
            ? 'Rezolvă grile diferite pentru prima măsurătoare.'
            : `Ai ${grileDistincte} din ${MIN_GRILE_EVOLUTIE}; mai ${ramase === 1 ? 'lipsește' : 'lipsesc'} ${numar(ramase, 'grilă', 'grile')}.`}
        </div>
      </div>
    );
  }

  const latime = W - STANGA - DREAPTA;
  const pts = points.map((punct, index): [number, number] => [
    points.length === 1 ? STANGA + latime / 2 : STANGA + index * (latime / (points.length - 1)),
    yPentru(punct.pct),
  ]);
  const ultimul = points[points.length - 1]!;
  const ultimulPunct = pts[pts.length - 1]!;
  const linie = pts.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const zona = points.length > 1
    ? `${linie} L${ultimulPunct[0].toFixed(1)} ${H - JOS} L${pts[0]![0].toFixed(1)} ${H - JOS} Z`
    : '';
  const etichete = indexEtichete(points.length);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: '2px 8px 4px' }}>
        <div>
          <span className="tabular" style={{ font: `600 28px/1 ${SANS}` }}>{ultimul.pct}%</span>
          <span style={{ marginLeft: 8, font: `500 12px ${SANS}`, color: 'var(--fg2)' }}>stăpânire curentă</span>
        </div>
        <div style={{ font: `500 11.5px ${SANS}`, color: 'var(--fg2)' }}>
          {numar(ultimul.grile, 'grilă distinctă', 'grile distincte')} · {numar(points.length, 'zi măsurată', 'zile măsurate')}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={`Stăpânirea grilelor a ajuns la ${ultimul.pct}% pe baza a ${numar(ultimul.grile, 'grilă distinctă', 'grile distincte')}.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {REPERE.map((reper) => {
          const y = yPentru(reper);
          return (
            <g key={reper}>
              <line x1={STANGA} y1={y} x2={W - DREAPTA} y2={y} stroke="var(--line)" strokeWidth={1} />
              <text x={STANGA - 10} y={y + 4} textAnchor="end" style={{ font: `400 10.5px ${SANS}`, fill: 'var(--fg2)' }}>
                {reper}%
              </text>
            </g>
          );
        })}

        {zona && <path d={zona} fill={`url(#${gradientId})`} />}
        {points.length > 1 && (
          <path d={linie} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {pts.map(([x, y], index) => {
          const punct = points[index]!;
          const esteUltimul = index === points.length - 1;
          return (
            <g key={punct.id}>
              <circle cx={x} cy={y} r={esteUltimul ? 5.5 : 3.5} fill={esteUltimul ? 'var(--brand)' : 'var(--surf)'} stroke="var(--brand)" strokeWidth={2}>
                <title>{punct.eticheta}: {punct.pct}% din {numar(punct.grile, 'grilă', 'grile')}</title>
              </circle>
              {etichete.has(index) && (
                <text
                  x={x}
                  y={H - 11}
                  textAnchor={index === 0 && points.length > 1 ? 'start' : esteUltimul && points.length > 1 ? 'end' : 'middle'}
                  style={{ font: `400 10.5px ${SANS}`, fill: 'var(--fg2)' }}
                >
                  {punct.eticheta}
                </text>
              )}
            </g>
          );
        })}

        <text
          x={ultimulPunct[0]}
          y={Math.max(14, ultimulPunct[1] - 13)}
          textAnchor={points.length === 1 ? 'middle' : 'end'}
          style={{ font: `600 11.5px ${SANS}`, fill: 'var(--fg)' }}
        >
          {ultimul.pct}%
        </text>
      </svg>

      <div style={{ margin: '-2px 8px 14px', paddingTop: 11, borderTop: '1px solid var(--line)', font: `400 11.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
        Fiecare grilă are aceeași greutate. Contează primul răspuns al zilei, iar repetările imediate nu schimbă procentul.
      </div>
    </div>
  );
}
