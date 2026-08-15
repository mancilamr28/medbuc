import { useMemo } from 'react';
import { MATERII, MATERIE_TABS, chapterLabel, type ChapterId } from '../data/chapters';
import { numaraGrile } from '../lib/continut';
import { useIsDesktop } from '../lib/hooks';
import { numar } from '../lib/text';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle, sideStack } from '../lib/ui';
import { useApp } from '../state/AppState';
import { useContentOptional } from '../state/ContentContext';

/**
 * Lista de capitole.
 *
 * Filtrele („doar capitolele neterminate", „doar grilele greșite anterior",
 * „doar capitolele salvate") și barele de progres au fost scoase: se sprijineau
 * pe `done` și `pct`, cifre scrise de mână care nu se schimbau niciodată. Se
 * întorc când există răspunsuri înregistrate din care să iasă.
 */
export function Materii() {
  const { materie, setMaterie, go, questions, session } = useApp();
  const isDesktop = useIsDesktop();
  // Capitolele sunt statice, deci ecranul se desenează întreg imediat; doar
  // numărătorile așteaptă biblioteca, iar cât timp o așteaptă arată „—", nu 0.
  const loading = useContentOptional()?.loading ?? false;
  // Numărătoarea se face pe biblioteca întreagă, nu pe `session.banca`: aceea
  // e restrânsă la capitolele sesiunii curente, deci după un „Exersează" toate
  // celelalte capitole ar apărea cu zero grile scrise.
  const { peCapitol, peMaterie } = useMemo(() => numaraGrile(questions), [questions]);
  const mat = MATERII[materie];
  const chapters = mat.list;
  const grileMaterie = peMaterie.get(mat.id) ?? 0;

  /** Deschide o sesiune nouă pe capitolele date și trece pe ecranul de grile. */
  const exerseaza = (capitole: ChapterId[]) => {
    session.start(capitole);
    go('grile');
  };

  const stats = [
    { label: 'Capitole', value: String(mat.list.length), unit: mat.unit === 'sesiuni' ? 'sesiuni' : 'capitole' },
    { label: 'Grile scrise', value: loading ? '—' : String(grileMaterie), unit: 'grile' },
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
              const scrise = peCapitol.get(c.id) ?? 0;
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
                      {/* Adjectivul intră în `numar()`, nu se lipește după: altfel iese
                          „1 grilă scrise", fiindcă acordul se face cu numărul, nu cu substantivul. */}
                      {scrise === 0
                        ? 'Nicio grilă scrisă încă'
                        : numar(scrise, 'grilă scrisă', 'grile scrise')}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="practice-btn"
                    onClick={() => exerseaza([c.id])}
                    disabled={scrise === 0}
                    aria-label={`Exersează ${chapterLabel(c)}`}
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
                {/* Textul spunea „începe cu primul capitol", dar butonul deschidea
                    biblioteca întreagă. Acum spune ce face butonul de sub el. */}
                {grileMaterie === 0
                  ? `Nu e scrisă încă nicio grilă la ${mat.name}. Alege altă materie sau revino după ce se publică.`
                  : `Ia toate capitolele deodată: ${numar(grileMaterie, 'grilă', 'grile')} din ${mat.name}, în ordine.`}
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => exerseaza(mat.list.map((c) => c.id))}
                disabled={grileMaterie === 0}
                style={{ width: '100%', padding: 11, font: `600 13.5px ${SANS}` }}
              >
                Exersează toată materia
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
