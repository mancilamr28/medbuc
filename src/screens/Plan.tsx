import { Progress } from '../components/Progress';
import { EXAM_DATE, PLAN_PARAMS, PLAN_WEEKS, type PlanStare } from '../data/profile';
import { useIsDesktop } from '../lib/hooks';
import { daysUntil } from '../lib/time';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle, sideStack, statusChip, twoCol } from '../lib/ui';

const stareChip = (stare: PlanStare) =>
  stare === 'În curs'
    ? statusChip('var(--brandS)', 'var(--brand)')
    : stare === 'Simulare'
      ? statusChip('var(--accS)', 'var(--acc)')
      : statusChip('var(--surf2)', 'var(--fg3)');

export function Plan() {
  const isDesktop = useIsDesktop();
  const daysLeft = daysUntil(EXAM_DATE);

  return (
    <div className="screen">
      <h1 style={pageTitle}>Planul meu de învățare</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        Generat automat din data examenului și din rezultatele tale de până acum. Se recalculează singur când rămâi în
        urmă.
      </p>

      <div style={twoCol(isDesktop)}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div style={autoGrid(130)}>
              {PLAN_PARAMS.map((p) => (
                <div key={p.label}>
                  <div style={eyebrow()}>{p.label}</div>
                  <div style={{ marginTop: 8, font: `400 17px/1.3 ${SERIF}`, color: 'var(--fg)' }}>{p.value}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 20,
                paddingTop: 18,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <button type="button" className="btn-primary" style={{ padding: '11px 16px', font: `600 13.5px ${SANS}` }}>
                Regenerează planul
              </button>
              <button type="button" className="btn-ghost" style={{ padding: '11px 16px', font: `500 13.5px ${SANS}` }}>
                Ajustează ritmul
              </button>
              <button type="button" className="btn-ghost" style={{ padding: '11px 16px', font: `500 13.5px ${SANS}` }}>
                Marchează zile libere
              </button>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--line)', font: `600 14px ${SANS}` }}>
              Următoarele patru săptămâni
            </div>
            {PLAN_WEEKS.map((p) => (
              <div key={p.w} style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ font: `600 13.5px ${SANS}` }}>{p.w}</span>
                  <span style={stareChip(p.stare)}>{p.stare}</span>
                  <span style={{ marginLeft: 'auto', font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>{p.target}</span>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {p.caps.map((c) => (
                    <span
                      key={c}
                      style={{
                        font: `400 12.5px ${SANS}`,
                        color: 'var(--fg2)',
                        background: 'var(--surf2)',
                        borderRadius: 8,
                        padding: '6px 10px',
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Progress pct={p.pct} height={5} label={`${p.w}: ${p.pct}% din obiectiv`} />
                  </div>
                  <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>
                    {p.pct > 0 ? `${p.pct}% din obiectiv` : 'neînceput'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={sideStack}>
          <div className="card-flat" style={{ padding: 20 }}>
            <div style={eyebrow(undefined, 11)}>Cum s-a calculat</div>
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                font: `400 13px/1.55 ${SANS}`,
                color: 'var(--fg2)',
              }}
            >
              <div>
                Din cele {daysLeft} de zile rămase am scăzut zilele de școală încărcate și 3 săptămâni de recapitulare
                finală.
              </div>
              <div>Capitolele unde stai sub 65% primesc de două ori mai mult timp decât cele stăpânite.</div>
              <div>La fiecare patru săptămâni intră o simulare completă, ca să vezi unde te afli.</div>
            </div>
          </div>

          <div style={{ background: 'var(--accS)', border: '1px solid var(--acc)', borderRadius: 14, padding: 20 }}>
            <div style={{ font: `400 18px/1.3 ${SERIF}`, color: 'var(--fg)' }}>Ai rămas în urmă cu 1 zi</div>
            <p style={{ margin: '8px 0 14px', font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
              Recuperăm automat: adăugăm 12 grile pe zi în următoarele patru zile, fără să atingem restul planului.
            </p>
            <button
              type="button"
              style={{
                width: '100%',
                padding: 11,
                border: '1px solid var(--acc)',
                borderRadius: 10,
                background: 'transparent',
                color: 'var(--acc)',
                font: `600 13px ${SANS}`,
                cursor: 'pointer',
              }}
            >
              Acceptă recuperarea
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
