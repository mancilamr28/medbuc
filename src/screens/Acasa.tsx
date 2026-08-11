import { ChapterChart } from '../components/ChapterChart';
import { Progress } from '../components/Progress';
import { ScoreChart } from '../components/ScoreChart';
import { Segmented } from '../components/Segmented';
import {
  ACTIVITY,
  EXAM_DATE,
  EXAM_DATE_LABEL,
  EXAM_DATE_SHORT,
  SRS,
  SRS_TOTAL,
  STUDENT,
  WEAKNESS,
} from '../data/profile';
import { usePersistentState } from '../lib/hooks';
import { daysUntil, formatDay } from '../lib/time';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle, pctPill } from '../lib/ui';
import { useApp } from '../state/AppState';

type Variant = 'a' | 'b';

const cardTitle = { font: `600 15px/1.2 ${SANS}` } as const;
const cardSub = { marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' } as const;

export function Acasa() {
  const { go, session } = useApp();
  const [dash, setDash] = usePersistentState<Variant>('medbuc.dash', 'a');
  const [chart, setChart] = usePersistentState<Variant>('medbuc.chart', 'a');

  const daysLeft = daysUntil(EXAM_DATE);
  const ramase = session.total - Object.keys(session.revealed).length;

  const chartTabs = (
    <Segmented
      items={[
        { id: 'a' as Variant, label: 'Evoluție' },
        { id: 'b' as Variant, label: 'Pe capitole' },
      ]}
      value={chart}
      onChange={setChart}
      ariaLabel="Felul graficului"
    />
  );

  const weakness = WEAKNESS.map((w) => (
    <button
      key={w.cap}
      type="button"
      className="row-btn"
      onClick={() => go('grile')}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 8px',
        borderTop: '1px solid var(--line)',
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', font: `500 13.5px/1.3 ${SANS}` }}>{w.cap}</span>
        <span style={{ display: 'block', marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
          {w.materie} · {w.total} grile rezolvate
        </span>
      </span>
      <Progress pct={w.pct} width={96} color={w.pct < 55 ? 'var(--bad)' : 'var(--acc)'} label={`${w.cap}: ${w.pct}%`} />
      <span style={pctPill(w.pct)}>{w.pct}%</span>
    </button>
  ));

  return (
    <div className="screen">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 22,
        }}
      >
        <div>
          <h1 style={pageTitle}>Bună, {STUDENT.firstName}</h1>
          <p style={pageLead}>
            Ai {STUDENT.streak} de zile de studiu constant. Astăzi merită să te uiți la{' '}
            <b style={{ color: 'var(--fg)', fontWeight: 600 }}>Glandele endocrine</b> — acolo pierzi cele mai multe
            puncte.
          </p>
        </div>
        <Segmented
          items={[
            { id: 'a' as Variant, label: 'Focus' },
            { id: 'b' as Variant, label: 'Dens' },
          ]}
          value={dash}
          onChange={setDash}
          ariaLabel="Densitatea paginii principale"
        />
      </div>

      {dash === 'a' ? (
        <div style={{ ...autoGrid(290), alignItems: 'start' }}>
          <div style={{ gridColumn: '1/-1', ...autoGrid(280) }}>
            <div className="card hero-card" style={{ padding: 24 }}>
              <div style={eyebrow('var(--acc)', 11)}>Continuă</div>
              <div style={{ marginTop: 12, font: `400 23px/1.25 ${SERIF}` }}>Biologie · 04. Glandele endocrine</div>
              <div style={{ marginTop: 6, font: `400 13.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
                Sesiune întreruptă acum 2 zile · {ramase} grile rămase din 24
              </div>
              <div style={{ marginTop: 16 }}>
                <Progress pct={75} label="Progresul capitolului" />
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => go('grile')}
                  style={{ padding: '12px 18px', font: `600 14px ${SANS}` }}
                >
                  Reia sesiunea →
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => go('materii')}
                  style={{ padding: '12px 16px', font: `500 14px ${SANS}` }}
                >
                  Alt capitol
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 18, alignContent: 'start', minWidth: 0 }}>
              <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                  <div style={eyebrow(undefined, 11)}>Până la examen</div>
                  <div style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>{EXAM_DATE_LABEL}</div>
                </div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ font: `500 42px/1 ${SERIF}`, letterSpacing: '-.02em' }}>{daysLeft}</span>
                  <span style={{ font: `400 14px ${SANS}`, color: 'var(--fg2)' }}>zile</span>
                </div>
                <div style={{ marginTop: 14, display: 'flex', gap: 3 }} aria-hidden="true">
                  {Array.from({ length: 24 }, (_, i) => (
                    <span
                      key={i}
                      style={{
                        flex: 1,
                        height: 20,
                        borderRadius: 3,
                        background: i < 5 ? 'var(--brand)' : i < 19 ? 'var(--brandS2)' : 'var(--surf3)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: 9, font: `400 12px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
                  Ritmul actual acoperă materia cu 5 săptămâni înainte de examen.
                </div>
              </div>

              <div className="card" style={{ padding: 20 }}>
                <div style={eyebrow(undefined, 11)}>Obiectivul de azi</div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ font: `500 28px/1 ${SERIF}` }}>{STUDENT.obiectivZi.rezolvate}</span>
                    <span style={{ font: `400 13px ${SANS}`, color: 'var(--fg2)' }}>
                      / {STUDENT.obiectivZi.total} grile
                    </span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <Progress
                      pct={(STUDENT.obiectivZi.rezolvate / STUDENT.obiectivZi.total) * 100}
                      color="var(--acc)"
                      label="Obiectivul de azi"
                    />
                  </div>
                  <div style={{ marginTop: 8, font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
                    Încă {STUDENT.obiectivZi.total - STUDENT.obiectivZi.rezolvate} grile și ziua e închisă.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={cardTitle}>Unde pierzi puncte</div>
            <div style={cardSub}>Procent de răspunsuri corecte, ultimele 300 de grile</div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column' }}>{weakness}</div>
            <button
              type="button"
              className="dashed-btn"
              onClick={() => go('grile')}
              style={{ marginTop: 16, width: '100%', padding: 11, font: `500 13px ${SANS}` }}
            >
              Test din capitolele slabe · 30 grile
            </button>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={cardTitle}>De recapitulat astăzi</div>
                <div style={cardSub}>Repetare inteligentă · programate pe {formatDay()}</div>
              </div>
              <div
                style={{
                  font: `500 11.5px ${SANS}`,
                  color: 'var(--acc)',
                  background: 'var(--accS)',
                  borderRadius: 99,
                  padding: '5px 10px',
                  whiteSpace: 'nowrap',
                }}
              >
                {SRS_TOTAL} de itemi
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SRS.map((s) => (
                <div
                  key={s.title}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'var(--surf2)',
                    borderRadius: 11,
                  }}
                >
                  <span
                    style={{
                      flex: '0 0 auto',
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: 'var(--surf)',
                      border: '1px solid var(--line)',
                      display: 'grid',
                      placeItems: 'center',
                      font: `600 13px ${SANS}`,
                    }}
                  >
                    {s.count}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', font: `500 13.5px/1.3 ${SANS}` }}>{s.title}</span>
                    <span
                      style={{ display: 'block', marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}
                    >
                      {s.meta}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => go('recapitulare')}
                style={{ flex: 1, minWidth: 150, padding: '12px 16px', font: `600 13.5px ${SANS}` }}
              >
                Începe recapitularea
              </button>
              <button type="button" className="btn-ghost" style={{ padding: '12px 14px', font: `500 13.5px ${SANS}` }}>
                Amână
              </button>
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1/-1', padding: '20px 20px 8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 14,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={cardTitle}>Evoluția scorului</div>
                <div style={cardSub}>Punctaj estimat la admitere, pe baza testelor rezolvate</div>
              </div>
              {chartTabs}
            </div>
            <div style={{ marginTop: 18 }}>{chart === 'a' ? <ScoreChart /> : <ChapterChart />}</div>
          </div>
        </div>
      ) : (
        <DashDens chartTabs={chartTabs} chart={chart} daysLeft={daysLeft} weakness={WEAKNESS} />
      )}
    </div>
  );
}

/** Varianta densă: cifrele mari sus, apoi lista de acțiuni și activitatea. */
function DashDens({
  chartTabs,
  chart,
  daysLeft,
  weakness,
}: {
  chartTabs: React.ReactNode;
  chart: Variant;
  daysLeft: number;
  weakness: typeof WEAKNESS;
}) {
  const { go } = useApp();

  const stat = (label: string, value: string, suffix: React.ReactNode) => (
    <div className="card-flat" style={{ padding: '15px 16px', borderRadius: 12 }}>
      <div style={eyebrow()}>{label}</div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ font: `500 26px/1 ${SERIF}` }}>{value}</span>
        {suffix}
      </div>
    </div>
  );

  const muted = (text: string) => <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>{text}</span>;

  const todo = [
    {
      n: 1,
      bg: 'var(--brand)',
      fg: 'var(--onBrand)',
      title: 'Termină Glandele endocrine',
      meta: '6 grile rămase · sesiune întreruptă acum 2 zile',
      cta: 'Reia →',
      onClick: () => go('grile'),
    },
    {
      n: 2,
      bg: 'var(--accS)',
      fg: 'var(--acc)',
      title: 'Recapitulare programată',
      meta: '46 de itemi · endocrin, alcooli, greșeli din simulare',
      cta: 'Începe →',
      onClick: () => go('recapitulare'),
    },
    {
      n: 3,
      bg: 'var(--surf3)',
      fg: 'var(--fg2)',
      title: 'Test din capitolele slabe',
      meta: '30 de grile alese automat din 4 capitole',
      cta: 'Generează →',
      onClick: () => go('grile'),
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={autoGrid(158, 14)}>
        {stat('Punctaj estimat', String(STUDENT.punctajEstimat), (
          <span style={{ font: `500 11.5px ${SANS}`, color: 'var(--ok)' }}>+3 față de iulie</span>
        ))}
        {stat('Grile rezolvate', STUDENT.grileRezolvate, muted('total'))}
        {stat('Răspunsuri corecte', String(STUDENT.procentCorecte), muted('%'))}
        {stat('Zile la rând', String(STUDENT.streak), muted('zile'))}
        <div
          style={{
            background: 'var(--brand)',
            border: '1px solid var(--brand)',
            borderRadius: 12,
            padding: '15px 16px',
            color: 'var(--onBrand)',
          }}
        >
          <div style={{ ...eyebrow(), color: 'inherit', opacity: 0.75 }}>Până la examen</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ font: `500 26px/1 ${SERIF}` }}>{daysLeft}</span>
            <span style={{ font: `400 11.5px ${SANS}`, opacity: 0.8 }}>zile · {EXAM_DATE_SHORT}</span>
          </div>
        </div>
      </div>

      <div style={{ ...autoGrid(300, 14), alignItems: 'start' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '15px 18px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <span style={{ font: `600 14px ${SANS}` }}>Ce ai de făcut azi</span>
            {muted('3 acțiuni · ~55 min')}
          </div>
          {todo.map((t, i) => (
            <button
              key={t.n}
              type="button"
              className="row-btn"
              onClick={t.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '15px 18px',
                borderBottom: i < todo.length - 1 ? '1px solid var(--line)' : 0,
              }}
            >
              <span
                style={{
                  flex: '0 0 auto',
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  background: t.bg,
                  color: t.fg,
                  display: 'grid',
                  placeItems: 'center',
                  font: `600 12px ${SANS}`,
                }}
              >
                {t.n}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', font: `500 13.5px/1.3 ${SANS}` }}>{t.title}</span>
                <span style={{ display: 'block', marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                  {t.meta}
                </span>
              </span>
              <span style={{ font: `500 12.5px ${SANS}`, color: 'var(--brand)' }}>{t.cta}</span>
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ font: `600 14px ${SANS}` }}>Unde pierzi puncte</span>
            {muted('ultimele 300 de grile')}
          </div>
          <div style={{ marginTop: 6 }}>
            {weakness.map((w) => (
              <button
                key={w.cap}
                type="button"
                className="row-btn row-btn--fade"
                onClick={() => go('grile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 0',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <span className="truncate" style={{ flex: 1, minWidth: 0, font: `500 13px/1.3 ${SANS}` }}>
                  {w.cap}
                </span>
                <Progress
                  pct={w.pct}
                  width={70}
                  height={5}
                  color={w.pct < 55 ? 'var(--bad)' : 'var(--acc)'}
                  label={`${w.cap}: ${w.pct}%`}
                />
                <span style={pctPill(w.pct)}>{w.pct}%</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div style={{ font: `600 14px ${SANS}` }}>Activitate recentă</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 13 }}>
            {ACTIVITY.map((a) => (
              <div key={a.strong + a.when} style={{ display: 'flex', gap: 12 }}>
                <span
                  style={{
                    flex: '0 0 auto',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: a.color,
                    marginTop: 6,
                  }}
                />
                <span>
                  <span style={{ display: 'block', font: `400 13px/1.4 ${SANS}`, color: 'var(--fg2)' }}>
                    {a.text}
                    <b style={{ color: 'var(--fg)', fontWeight: 600 }}>{a.strong}</b>
                    {a.after}
                  </span>
                  <span
                    style={{ display: 'block', font: `400 11.5px ${SANS}`, color: 'var(--fg3)', marginTop: 2 }}
                  >
                    {a.when}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '18px 18px 6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ font: `600 14px ${SANS}` }}>Evoluția scorului</div>
          {chartTabs}
        </div>
        <div style={{ marginTop: 14 }}>{chart === 'a' ? <ScoreChart /> : <ChapterChart />}</div>
      </div>
    </div>
  );
}
