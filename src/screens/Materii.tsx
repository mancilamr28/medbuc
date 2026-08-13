import { MATERII, MATERIE_TABS } from '../data/chapters';
import { chapterQuestionCount, materieQuestionCount } from '../data/questions';
import { useIsDesktop } from '../lib/hooks';
import { numar } from '../lib/text';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle, sideStack } from '../lib/ui';
import { useApp } from '../state/AppState';

/**
 * Lista de capitole.
 *
 * Filtrele („doar capitolele neterminate", „doar grilele greșite anterior",
 * „doar capitolele salvate") și barele de progres au fost scoase: se sprijineau
 * pe `done` și `pct`, cifre scrise de mână care nu se schimbau niciodată. Se
 * întorc când există răspunsuri înregistrate din care să iasă.
 */
export function Materii() {
  const { materie, setMaterie, go } = useApp();
  const isDesktop = useIsDesktop();
  const mat = MATERII[materie];
  const chapters = mat.list;

  const stats = [
    { label: 'Capitole', value: String(mat.list.length), unit: mat.unit === 'sesiuni' ? 'sesiuni' : 'capitole' },
    { label: 'Grile scrise', value: String(materieQuestionCount(mat.id)), unit: 'grile' },
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
            </div>

            {/* Un capitol fără grile scrise nu se poate exersa — butonul o spune,
                în loc să deschidă o sesiune din alt capitol. */}
            {chapters.map((c) => {
              const scrise = chapterQuestionCount(c.id);
              return (
                <div
                  key={c.id}
                  className="list-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <div style={{ width: 30, flex: '0 0 30px', font: `500 13px ${SANS}`, color: 'var(--fg3)' }}>
                    {c.nr}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `500 14px/1.3 ${SANS}` }}>{c.name}</div>
                    <div style={{ marginTop: 4, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                      {scrise === 0 ? 'Nicio grilă scrisă încă' : `${numar(scrise, 'grilă', 'grile')} scrise`}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="practice-btn"
                    onClick={() => go('grile')}
                    disabled={scrise === 0}
                    style={{
                      padding: '8px 14px',
                      font: `500 12.5px ${SANS}`,
                      whiteSpace: 'nowrap',
                      opacity: scrise === 0 ? 0.45 : 1,
                      cursor: scrise === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Exersează
                  </button>
                </div>
              );
            })}

          </div>

          <div style={sideStack}>
            <div style={{ background: 'var(--brandS)', border: '1px solid var(--brandS2)', borderRadius: 14, padding: 20 }}>
              <div style={{ font: `400 19px/1.3 ${SERIF}`, color: 'var(--fg)' }}>Nu știi de unde să începi?</div>
              <p style={{ margin: '8px 0 14px', font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
                Începe cu primul capitol din materie. După câteva sesiuni vei vedea aici unde stai bine și unde nu.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => go('grile')}
                style={{ width: '100%', padding: 11, font: `600 13.5px ${SANS}` }}
              >
                Începe o sesiune
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
