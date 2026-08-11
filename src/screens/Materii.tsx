import { Progress } from '../components/Progress';
import { Switch } from '../components/Switch';
import { MATERII, MATERIE_TABS, isSaved, type Chapter } from '../data/chapters';
import { useIsDesktop } from '../lib/hooks';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle, pctPill, sideStack } from '../lib/ui';
import { useApp, type FilterId } from '../state/AppState';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'neterminate', label: 'Doar capitolele neterminate' },
  { id: 'greseli', label: 'Doar grilele greșite anterior' },
  { id: 'bookmark', label: 'Doar capitolele salvate' },
  { id: 'verificate', label: 'Include grilele neverificate' },
];

export function Materii() {
  const { materie, setMaterie, filters, toggleFilter, go } = useApp();
  const isDesktop = useIsDesktop();
  const mat = MATERII[materie];

  /**
   * Primele trei filtre restrâng lista de capitole. Al patrulea lărgește
   * bazinul de grile al sesiunii, deci nu schimbă ce capitole se văd.
   */
  const chapters = mat.list.filter((c: Chapter) => {
    if (filters.neterminate && c.done >= c.total) return false;
    if (filters.greseli && (c.done === 0 || c.pct === 100)) return false;
    if (filters.bookmark && !isSaved(materie, c)) return false;
    return true;
  });

  const stats = [
    { label: 'Grile disponibile', value: mat.count.split(' ').slice(0, -1).join(' '), unit: mat.unit },
    { label: 'Rezolvate', value: String(mat.rezolvate), unit: 'grile' },
    { label: 'Corecte', value: String(mat.corecte), unit: '%' },
    { label: 'Capitole terminate', value: String(mat.terminate), unit: `din ${mat.list.length}` },
  ];

  return (
    <div className="screen">
      <h1 style={pageTitle}>Materii și capitole</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        Bibliografia UMFCD pentru admiterea 2027, împărțită pe capitole. Alege de unde vrei să exersezi.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--line)',
          paddingBottom: 14,
          marginBottom: 18,
        }}
      >
        {MATERIE_TABS.map((t) => {
          const active = materie === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setMaterie(t.id)}
              aria-pressed={active}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 15px',
                border: `1px solid ${active ? 'var(--brand)' : 'var(--line)'}`,
                borderRadius: 10,
                cursor: 'pointer',
                font: `${active ? 600 : 500} 13.5px ${SANS}`,
                background: active ? 'var(--brand)' : 'var(--surf)',
                color: active ? 'var(--onBrand)' : 'var(--fg2)',
              }}
            >
              {t.label}
              <span
                style={{
                  font: `500 11px ${SANS}`,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background: active ? 'rgba(255,255,255,.2)' : 'var(--surf3)',
                  color: active ? 'var(--onBrand)' : 'var(--fg3)',
                }}
              >
                {MATERII[t.id].list.length}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: 18 }}>
        <div style={autoGrid(150, 14)}>
          {stats.map((s) => (
            <div key={s.label} className="card-flat" style={{ padding: '16px 18px' }}>
              <div style={eyebrow()}>{s.label}</div>
              <div style={{ marginTop: 9, display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ font: `500 27px/1 ${SERIF}`, letterSpacing: '-.01em' }}>{s.value}</span>
                <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'minmax(0,2.4fr) minmax(0,1fr)' : 'minmax(0,1fr)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div className="card" style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '16px 20px',
                borderBottom: '1px solid var(--line)',
              }}
            >
              <div style={{ font: `600 14px ${SANS}` }}>{mat.name} · capitole</div>
              <button type="button" className="btn-ghost" style={{ padding: '7px 12px', font: `500 12.5px ${SANS}`, borderRadius: 9 }}>
                Selectează tot
              </button>
            </div>

            {chapters.map((c) => (
              <div
                key={`${c.nr}-${c.name}`}
                className="list-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div style={{ width: 30, flex: '0 0 30px', font: `500 13px ${SANS}`, color: 'var(--fg3)' }}>{c.nr}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `500 14px/1.3 ${SANS}` }}>{c.name}</div>
                  <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, maxWidth: 220 }}>
                      <Progress
                        pct={(c.done / c.total) * 100}
                        height={5}
                        color={c.pct >= 80 ? 'var(--ok)' : 'var(--brand)'}
                        label={`${c.name}: ${c.done} din ${c.total} grile`}
                      />
                    </div>
                    <div style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>
                      {c.done} / {c.total} grile
                    </div>
                  </div>
                </div>
                <div style={pctPill(c.pct)}>{c.pct}%</div>
                <button
                  type="button"
                  className="practice-btn"
                  onClick={() => go('grile')}
                  style={{ padding: '8px 14px', font: `500 12.5px ${SANS}`, whiteSpace: 'nowrap' }}
                >
                  Exersează
                </button>
              </div>
            ))}

            {chapters.length === 0 && (
              <div style={{ padding: '28px 20px', font: `400 13.5px/1.6 ${SANS}`, color: 'var(--fg3)' }}>
                Niciun capitol nu trece de filtrele active. Oprește un filtru din dreapta ca să vezi din nou lista.
              </div>
            )}
          </div>

          <div style={sideStack}>
            <div className="card-flat" style={{ padding: 20 }}>
              <div style={eyebrow(undefined, 11)}>Filtrează capitolele</div>
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {FILTERS.map((f) => (
                  <Switch key={f.id} on={filters[f.id]} onToggle={() => toggleFilter(f.id)}>
                    <span style={{ flex: 1, font: `400 13px/1.4 ${SANS}`, color: 'var(--fg2)', textAlign: 'left' }}>
                      {f.label}
                    </span>
                  </Switch>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--brandS)', border: '1px solid var(--brandS2)', borderRadius: 14, padding: 20 }}>
              <div style={{ font: `400 19px/1.3 ${SERIF}`, color: 'var(--fg)' }}>Nu știi de unde să începi?</div>
              <p style={{ margin: '8px 0 14px', font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
                Planul tău de învățare are 3 capitole programate săptămâna asta, alese după cât timp mai e până la
                examen.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => go('plan')}
                style={{ width: '100%', padding: 11, font: `600 13.5px ${SANS}` }}
              >
                Vezi planul săptămânii
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
