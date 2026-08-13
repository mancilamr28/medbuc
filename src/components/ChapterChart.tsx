import { MATERII } from '../data/chapters';
import { SANS } from '../lib/ui';
import { PRAG_RELUARE, barColor } from './chartTokens';
import { useApp } from '../state/AppState';

/** Procentul de corecte pe capitolele începute din materia selectată. */
export function ChapterChart() {
  const { materie } = useApp();
  // Subiectele anterioare nu sunt capitole de studiu — arătăm biologia.
  const rows = MATERII[materie === 'ant' ? 'bio' : materie].list.filter((c) => c.done > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingBottom: 14 }}>
      {rows.map((c) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="truncate"
            style={{ flex: '0 0 auto', width: 168, font: `400 12.5px ${SANS}`, color: 'var(--fg2)' }}
          >
            {c.name}
          </span>
          <span
            style={{
              flex: 1,
              height: 20,
              background: 'var(--surf2)',
              borderRadius: 5,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 0,
                width: `${c.pct}%`,
                background: barColor(c.pct),
                opacity: 0.85,
                borderRadius: 5,
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: `${PRAG_RELUARE}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: 'var(--fg3)',
                opacity: 0.5,
              }}
            />
          </span>
          <span
            className="tabular"
            style={{
              flex: '0 0 auto',
              width: 38,
              textAlign: 'right',
              font: `600 12.5px ${SANS}`,
              color: 'var(--fg)',
            }}
          >
            {c.pct}%
          </span>
        </div>
      ))}
      <div style={{ marginTop: 4, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
        Linia verticală marchează {PRAG_RELUARE}% — pragul sub care recomandăm reluarea capitolului.
      </div>
    </div>
  );
}
