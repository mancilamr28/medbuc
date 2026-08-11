import { SANS, SCORE_LABEL_FILL } from './chartTokens';
import { SCORES, SCORE_MONTHS, SCORE_TARGET } from '../data/profile';
import { useApp } from '../state/AppState';

const W = 720;
const H = 190;
const PAD = 26;
const MIN = 45;
const MAX = 100;

/** Evoluția punctajului estimat, cu linia punctată a țintei. */
export function ScoreChart() {
  const { theme } = useApp();
  const dark = theme === 'dark';

  const pts = SCORES.map((s, i): [number, number] => [
    PAD + i * ((W - PAD * 2) / (SCORES.length - 1)),
    H - PAD - ((s - MIN) / (MAX - MIN)) * (H - PAD * 2),
  ]);
  const last = pts[pts.length - 1]!;
  const first = pts[0]!;

  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${last[0].toFixed(1)} ${H - PAD} L${first[0].toFixed(1)} ${H - PAD} Z`;
  const targetY = H - PAD - ((SCORE_TARGET - MIN) / (MAX - MIN)) * (H - PAD * 2);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={`Punctaj estimat, de la ${SCORES[0]} la ${SCORES[SCORES.length - 1]} din 100. Ținta este ${SCORE_TARGET}.`}
      >
        <defs>
          <linearGradient id="mbFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={dark ? 0.35 : 0.18} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <line
          x1={PAD}
          y1={targetY}
          x2={W - PAD}
          y2={targetY}
          stroke="var(--acc)"
          strokeWidth={1}
          strokeDasharray="5 5"
        />
        <text
          x={W - PAD}
          y={targetY - 8}
          textAnchor="end"
          style={{ font: `500 11px ${SANS}`, fill: 'var(--acc)' }}
        >
          ținta ta · {SCORE_TARGET}
        </text>
        <path d={area} fill="url(#mbFill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={i === pts.length - 1 ? 5 : 3}
            fill={i === pts.length - 1 ? 'var(--brand)' : 'var(--surf)'}
            stroke="var(--brand)"
            strokeWidth={2}
          />
        ))}
        <text
          x={last[0]}
          y={last[1] - 14}
          textAnchor="end"
          style={{ font: `600 12px ${SANS}`, fill: SCORE_LABEL_FILL }}
        >
          {SCORES[SCORES.length - 1]}
        </text>
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px 26px 14px',
          font: `400 11.5px ${SANS}`,
          color: 'var(--fg3)',
        }}
      >
        {SCORE_MONTHS.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}
