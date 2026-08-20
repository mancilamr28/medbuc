import { useId, useState } from 'react';
import { MIN_GRILE_EVOLUTIE, type PunctEvolutie } from '../lib/progres';
import { numar } from '../lib/text';
import { SANS } from '../lib/ui';
import { TabelGrafic } from './TabelGrafic';

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
  // Ziua citită acum, prin mouse sau prin tastatură — aceleași detalii pe
  // amândouă. Declarat înaintea ieșirii timpurii, ca hook-urile să rămână
  // necondiționate.
  const [activ, setActiv] = useState<number | null>(null);

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

  /**
   * Zonele de nimerire: fiecare zi ia banda până la jumătatea distanței spre
   * vecini, pe toată înălțimea graficului. Cititorul țintește o zi, nu un punct
   * de 7px.
   *
   * Măsurat pe telefon (viewport 375px, desen de 285px): 28px prima bandă, 24px
   * cele din mijloc, 19px ultima — marginea din dreapta e mai îngustă decât cea
   * din stânga. Cu 12 zile într-un desen de 285px nu încap douăsprezece ținte de
   * 24px oricum; ultima zi e însă singura al cărei procent se vede oricum, și în
   * antet, și scris lângă punct, deci e cea mai puțin dependentă de hover.
   */
  const benzi = pts.map(([x], index) => {
    // Capetele iau și marginile, până la marginea desenului: altfel prima și
    // ultima zi rămân cu o bandă pe jumătate — măsurat pe un card de 380px,
    // 14px față de 28px la cele din mijloc, adică exact ținta imposibil de
    // nimerit pe care stratul ăsta o repară.
    const stanga = index === 0 ? 0 : (pts[index - 1]![0] + x) / 2;
    const dreapta = index === points.length - 1 ? W : (pts[index + 1]![0] + x) / 2;
    return { x: stanga, latime: Math.max(1, dreapta - stanga) };
  });

  const punctActiv = activ === null ? null : points[activ] ?? null;
  const pozitieActiva = activ === null ? null : pts[activ] ?? null;

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

      <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        // `role="img"` ar face SVG-ul frunză în arborele de accesibilitate, iar
        // punctele focalizabile de mai jos n-ar mai fi anunțate deloc. `group`
        // le expune, păstrând rezumatul ca nume al întregului grafic.
        role="group"
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

        {pozitieActiva && (
          <line
            x1={pozitieActiva[0]}
            y1={SUS}
            x2={pozitieActiva[0]}
            y2={H - JOS}
            stroke="var(--line2)"
            strokeWidth={1}
          />
        )}

        {pts.map(([x, y], index) => {
          const punct = points[index]!;
          const esteUltimul = index === points.length - 1;
          const esteActiv = activ === index;
          return (
            <g key={punct.id}>
              <circle
                cx={x}
                cy={y}
                r={esteActiv ? 6.5 : esteUltimul ? 5.5 : 3.5}
                fill={esteActiv || esteUltimul ? 'var(--brand)' : 'var(--surf)'}
                stroke={esteActiv ? 'var(--surf)' : 'var(--brand)'}
                strokeWidth={esteActiv ? 2.5 : 2}
              />
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

        {benzi.map((banda, index) => {
          const punct = points[index]!;
          return (
            <rect
              key={punct.id}
              x={banda.x}
              y={SUS}
              width={banda.latime}
              height={H - SUS - JOS}
              fill="transparent"
              tabIndex={0}
              aria-label={`${punct.eticheta}: ${punct.pct}% din ${numar(punct.grile, 'grilă distinctă', 'grile distincte')}.`}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActiv(index)}
              onMouseLeave={() => setActiv((precedent) => (precedent === index ? null : precedent))}
              onFocus={() => setActiv(index)}
              onBlur={() => setActiv((precedent) => (precedent === index ? null : precedent))}
            />
          );
        })}
      </svg>

      {punctActiv && pozitieActiva && (() => {
        const procX = (pozitieActiva[0] / W) * 100;
        const procY = (pozitieActiva[1] / H) * 100;
        // Lângă capete se ancorează pe margine, ca să nu iasă din card. Sus se
        // răstoarnă dedesubtul punctului: altfel, la un procent mare, caseta
        // acoperă antetul cardului.
        const catreX = procX < 25 ? '0' : procX > 75 ? '-100%' : '-50%';
        const catreY = procY < 38 ? 'calc(0% + 14px)' : 'calc(-100% - 12px)';
        return (
        <div
          style={{
            position: 'absolute',
            left: `${procX}%`,
            top: `${procY}%`,
            transform: `translate(${catreX}, ${catreY})`,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            background: 'var(--surf)',
            border: '1px solid var(--line)',
            borderRadius: 9,
            padding: '8px 10px',
            boxShadow: '0 6px 18px rgb(20 20 45 / 14%)',
          }}
        >
          <div style={{ font: `600 14px/1.2 ${SANS}`, color: 'var(--fg)' }}>{punctActiv.pct}%</div>
          <div style={{ marginTop: 2, font: `400 11.5px ${SANS}`, color: 'var(--fg2)' }}>
            {punctActiv.eticheta} · {numar(punctActiv.grile, 'grilă distinctă', 'grile distincte')}
          </div>
        </div>
        );
      })()}
      </div>

      <div style={{ margin: '-2px 8px 14px', paddingTop: 11, borderTop: '1px solid var(--line)', font: `400 11.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
        Fiecare grilă are aceeași greutate. Contează primul răspuns al zilei, iar repetările imediate nu schimbă procentul.
      </div>

      <div style={{ margin: '0 8px 8px' }}>
        <TabelGrafic
          rezumat="Stăpânirea grilelor, zi cu zi."
          coloane={['Ziua', 'Stăpânire', 'Grile distincte']}
          randuri={points.map((punct) => ({
            id: punct.id,
            antet: punct.eticheta,
            valori: [`${punct.pct}%`, String(punct.grile)],
          }))}
        />
      </div>
    </div>
  );
}
