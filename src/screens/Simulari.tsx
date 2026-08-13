import { useMemo, useState } from 'react';
import { AnswerOptions } from '../components/AnswerOptions';
import { Progress } from '../components/Progress';
import { Segmented } from '../components/Segmented';
import { EmptyState } from '../components/EmptyState';
import { questionCap, questionMaterie, tipLabel } from '../data/questions';
import { useIsDesktop } from '../lib/hooks';
import { formatClock } from '../lib/time';
import {
  SANS,
  SERIF,
  autoGrid,
  eyebrow,
  label,
  pageLead,
  pageTitle,
  sideStack,
  statusChip,
  twoCol,
} from '../lib/ui';
import { SIM_FIELDS, questionAtPosition } from '../state/useSimulare';
import { useApp } from '../state/AppState';

export function Simulari() {
  const { sim } = useApp();
  if (sim.phase === 'rezultat') return <SimRezultat />;
  return sim.phase === 'config' ? <SimConfig /> : <SimRun />;
}

/** Prima regulă urmează durata aleasă, nu o valoare fixă. */
const reguliPentru = (durata: string): string[] => [
  `Cronometru fix de ${durata}, afișat permanent.`,
  'Nicio explicație și niciun răspuns corect până la predarea lucrării.',
  'Punctaj UMFCD: grila corectă valorează 1 punct, cea greșită sau nemarcată valorează 0. Fără penalizări.',
  'Poți marca grile și reveni la ele cât timp mai ai minute.',
];

function SimConfig() {
  const { sim } = useApp();
  const isDesktop = useIsDesktop();

  return (
    <div className="screen">
      <h1 style={pageTitle}>Simulare de admitere</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        Aceleași reguli ca la examenul UMFCD. Odată pornită, cronometrul nu se oprește.
      </p>

      <div style={twoCol(isDesktop)}>
        <div className="card" style={{ padding: 22 }}>
          <div style={autoGrid(220, 16)}>
            {SIM_FIELDS.map((f) => (
              <label key={f.key} style={{ display: 'block' }}>
                <span style={label}>{f.label}</span>
                <select
                  className="field"
                  value={sim.config[f.key]}
                  onChange={(e) => sim.setConfig(f.key, e.target.value)}
                  style={{ padding: '11px 12px', font: `400 13.5px ${SANS}`, cursor: 'pointer' }}
                >
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 22, padding: 18, background: 'var(--surf2)', borderRadius: 12 }}>
            <div style={{ font: `600 12.5px ${SANS}`, marginBottom: 12 }}>Reguli de examen</div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                font: `400 13px/1.5 ${SANS}`,
                color: 'var(--fg2)',
              }}
            >
              {reguliPentru(sim.config.durata).map((r) => (
                <div key={r} style={{ display: 'flex', gap: 10 }}>
                  <span aria-hidden="true" style={{ color: 'var(--brand)', fontWeight: 600 }}>
                    ·
                  </span>
                  {r}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={sim.start}
            style={{ marginTop: 20, width: '100%', padding: 15, borderRadius: 12, font: `600 15px ${SANS}` }}
          >
            Începe simularea · {sim.config.nr} de grile, {sim.config.durata}
          </button>
          <div style={{ marginTop: 10, textAlign: 'center', font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
            Dacă închizi fereastra, timpul curge mai departe.
          </div>
        </div>

        <div style={sideStack}>
          {/* Istoricul era o listă fixă de trei lucrări care nu fuseseră date
              niciodată. Se completează când `finish()` chiar salvează rezultate. */}
          <div className="card-flat" style={{ padding: 20 }}>
            <div style={eyebrow(undefined, 11)}>Simulările tale</div>
            <EmptyState
              title="Nicio simulare dată încă"
              hint="Lucrările predate apar aici, cu punctajul și timpul în care le-ai terminat."
              padding="22px 4px 6px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Fereastra de 24 de grile din navigator care conține grila curentă. */
const navWindow = (qi: number, total: number) => {
  const size = Math.min(24, total);
  const start = Math.min(Math.floor(qi / size) * size, Math.max(0, total - size));
  return { start, end: Math.min(start + size, total) };
};

function SimRun() {
  const { sim } = useApp();
  const isDesktop = useIsDesktop();
  const { start, end } = navWindow(sim.qi, sim.total);
  const run = sim.run;
  const [confirmaPredarea, setConfirmaPredarea] = useState(false);
  const faraRaspuns = sim.total - sim.completed;

  return (
    <div className="screen">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          padding: '14px 18px',
          background: 'var(--fg)',
          color: 'var(--bg)',
          borderRadius: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ ...eyebrow(), color: 'inherit', letterSpacing: '.1em', opacity: 0.7, fontSize: 12 }}>
          Simulare în desfășurare
        </div>
        <div style={{ flex: 1, minWidth: 60 }} />
        <div style={{ font: `400 12.5px ${SANS}`, opacity: 0.8 }}>
          {sim.completed} din {sim.total} completate
        </div>
        <div
          className="tabular"
          style={{ font: `500 22px/1 ${SERIF}`, letterSpacing: '.02em' }}
          aria-label="Timp rămas"
        >
          {formatClock(sim.secondsLeft)}
        </div>
        {confirmaPredarea ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ font: `400 12.5px/1.4 ${SANS}`, opacity: 0.85 }}>
              {faraRaspuns > 0
                ? `Mai ai ${faraRaspuns} ${faraRaspuns === 1 ? 'grilă' : 'de grile'} fără răspuns. Predai?`
                : 'Predai lucrarea?'}
            </span>
            <button
              type="button"
              onClick={() => setConfirmaPredarea(false)}
              style={{
                padding: '10px 14px',
                border: '1px solid currentColor',
                borderRadius: 9,
                background: 'transparent',
                color: 'inherit',
                font: `500 13px ${SANS}`,
                cursor: 'pointer',
              }}
            >
              Nu încă
            </button>
            <button
              type="button"
              onClick={sim.finish}
              style={{
                padding: '10px 16px',
                border: 0,
                borderRadius: 9,
                background: 'var(--bg)',
                color: 'var(--fg)',
                font: `600 13px ${SANS}`,
                cursor: 'pointer',
              }}
            >
              Da, predau
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmaPredarea(true)}
            style={{
              padding: '10px 16px',
              border: 0,
              borderRadius: 9,
              background: 'var(--bg)',
              color: 'var(--fg)',
              font: `600 13px ${SANS}`,
              cursor: 'pointer',
            }}
          >
            Predă lucrarea
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'minmax(0,1fr) 260px' : 'minmax(0,1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div className="card" style={{ padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                ...eyebrow('var(--brand)'),
                letterSpacing: '.1em',
                background: 'var(--brandS)',
                borderRadius: 6,
                padding: '6px 9px',
              }}
            >
              {tipLabel(sim.question.tip)}
            </span>
            <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
              Grila {sim.qi + 1} din {sim.total}
            </span>
          </div>

          <p style={{ margin: '18px 0 0', font: `400 21px/1.45 ${SERIF}`, textWrap: 'pretty' }}>{sim.question.text}</p>

          {sim.question.enunturi && (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                padding: '16px 18px',
                background: 'var(--surf2)',
                borderRadius: 11,
              }}
            >
              {sim.question.enunturi.map((t, i) => (
                <div key={t} style={{ display: 'flex', gap: 10, font: `400 14.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--fg)', flex: '0 0 auto' }}>{i + 1}.</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          )}

          <AnswerOptions
            question={sim.question}
            answer={sim.answer}
            revealed={false}
            onPick={sim.pick}
            showIcons={false}
          />

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={sim.prev}
              style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
            >
              Înapoi
            </button>
            <button
              type="button"
              onClick={sim.toggleMark}
              aria-pressed={sim.isMarked}
              style={{
                padding: '8px 13px',
                border: `1px solid ${sim.isMarked ? 'var(--acc)' : 'var(--line2)'}`,
                borderRadius: 9,
                background: sim.isMarked ? 'var(--accS)' : 'transparent',
                color: sim.isMarked ? 'var(--acc)' : 'var(--fg2)',
                font: `500 12.5px ${SANS}`,
                cursor: 'pointer',
              }}
            >
              {sim.isMarked ? '★ Marcată pentru revenire' : '☆ Marchează pentru revenire'}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={sim.next}
              style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
            >
              Următoarea grilă →
            </button>
          </div>
        </div>

        <div className="card-flat" style={{ padding: 18 }}>
          <div style={eyebrow()}>
            Grile {start + 1}–{end} din {sim.total}
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
            {Array.from({ length: end - start }, (_, k) => {
              const i = start + k;
              const done = run?.answers[i] !== undefined;
              const mark = !!run?.marks[i];
              const cur = i === sim.qi;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => sim.goTo(i)}
                  aria-current={cur ? 'true' : undefined}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    cursor: 'pointer',
                    font: `600 12px ${SANS}`,
                    border: `1px solid ${cur ? 'var(--brand)' : mark ? 'var(--acc)' : 'var(--line)'}`,
                    background: done ? 'var(--brandS)' : mark ? 'var(--accS)' : 'var(--surf2)',
                    color: done ? 'var(--brand)' : mark ? 'var(--acc)' : 'var(--fg3)',
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              font: `400 11.5px/1.4 ${SANS}`,
              color: 'var(--fg3)',
            }}
          >
            {[
              ['var(--brandS)', 'var(--brand)', 'Completată'],
              ['var(--accS)', 'var(--acc)', 'Marcată pentru revenire'],
              ['var(--surf2)', 'var(--line)', 'Necompletată'],
            ].map(([bg, border, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1px solid ${border}` }}
                />
                {text}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid var(--line)',
              font: `400 12px/1.5 ${SANS}`,
              color: 'var(--fg3)',
            }}
          >
            Explicațiile apar doar după predarea lucrării.
          </div>
        </div>
      </div>
    </div>
  );
}

type FiltruRecitire = 'toate' | 'gresite';

/** Ecranul de după predare: scorul lucrării și recitirea grilelor, cu explicații. */
function SimRezultat() {
  const { sim } = useApp();
  const isDesktop = useIsDesktop();
  const [filtru, setFiltru] = useState<FiltruRecitire>('gresite');
  const run = sim.run;

  const { corecte, gresite, neraspunse, total, pct, durataMs } = sim.score;
  const culoare = pct >= 80 ? 'var(--ok)' : pct >= 65 ? 'var(--brand)' : 'var(--bad)';

  const pozitii = useMemo(() => {
    if (!run) return [];
    return run.order
      .map((_, i) => i)
      .filter((i) => filtru === 'toate' || run.answers[i] !== questionAtPosition(run, i).correct);
  }, [filtru, run]);

  if (!run) return null;

  const dale: [string, string, string][] = [
    ['Corecte', String(corecte), 'var(--ok)'],
    ['Greșite', String(gresite), 'var(--bad)'],
    ['Fără răspuns', String(neraspunse), 'var(--fg3)'],
    ['Timp', formatClock(durataMs / 1000), 'var(--fg)'],
  ];

  return (
    <div className="screen">
      <h1 style={pageTitle}>Rezultatul simulării</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        {sim.expired
          ? 'Timpul a expirat, iar lucrarea s-a încheiat automat.'
          : 'Lucrarea a fost predată. Acum poți vedea răspunsurile corecte și explicațiile.'}
      </p>

      <div style={twoCol(isDesktop)}>
        <div style={{ minWidth: 0 }}>
          <div className="card" style={{ padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span className="tabular" style={{ font: `600 46px/1 ${SERIF}`, color: culoare }}>
                {pct}%
              </span>
              <span style={{ font: `400 14px ${SANS}`, color: 'var(--fg2)' }}>
                {corecte} din {total} grile corecte
              </span>
            </div>

            <div style={{ marginTop: 14 }}>
              <Progress pct={pct} height={8} color={culoare} label={`Scor ${pct}%`} />
            </div>

            <div style={{ ...autoGrid(140, 14), marginTop: 20 }}>
              {dale.map(([eticheta, valoare, color]) => (
                <div key={eticheta} className="card-flat" style={{ padding: 16 }}>
                  <div style={eyebrow()}>{eticheta}</div>
                  <div className="tabular" style={{ marginTop: 8, font: `600 24px/1 ${SANS}`, color }}>
                    {valoare}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                {run.config.model} · {run.config.nr} de grile, {run.config.durata}
              </span>
              <button
                type="button"
                className="btn-primary"
                onClick={sim.reset}
                style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
              >
                Simulare nouă
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 26, marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={eyebrow()}>Recitește grilele</div>
              </div>
              <Segmented
                items={[
                  { id: 'gresite' as FiltruRecitire, label: 'Ce am ratat' },
                  { id: 'toate' as FiltruRecitire, label: 'Toate' },
                ]}
                value={filtru}
                onChange={setFiltru}
                ariaLabel="Ce grile să apară în recitire"
              />
            </div>

            {pozitii.length === 0 ? (
              <p style={{ margin: '18px 0 0', font: `400 14px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
                Nimic de recitit: ai răspuns corect la toate grilele.
              </p>
            ) : (
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pozitii.map((i) => {
                  const q = questionAtPosition(run, i);
                  const ales = run.answers[i];
                  const stare: [string, string, string] =
                    ales === undefined
                      ? ['Fără răspuns', 'var(--surf3)', 'var(--fg3)']
                      : ales === q.correct
                        ? ['Corect', 'var(--okS)', 'var(--ok)']
                        : ['Greșit', 'var(--badS)', 'var(--bad)'];

                  return (
                    <div key={i} className="card-flat" style={{ padding: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span className="tabular" style={{ font: `500 12px ${SANS}`, color: 'var(--fg3)' }}>
                          Grila {i + 1}
                        </span>
                        <span style={{ ...statusChip(stare[1], stare[2]) }}>{stare[0]}</span>
                        <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                          {questionMaterie(q)} · {questionCap(q)}
                        </span>
                      </div>

                      <p style={{ margin: '12px 0 0', font: `400 16px/1.45 ${SERIF}`, textWrap: 'pretty' }}>
                        {q.text}
                      </p>

                      <AnswerOptions question={q} answer={ales} revealed onPick={() => {}} />

                      <p
                        style={{
                          margin: '14px 0 0',
                          font: `400 13.5px/1.6 ${SANS}`,
                          color: 'var(--fg2)',
                          textWrap: 'pretty',
                        }}
                      >
                        {q.expl}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={sideStack}>
          <div className="card-flat" style={{ padding: 20 }}>
            <div style={eyebrow(undefined, 11)}>Cum se citește</div>
            <p style={{ margin: '12px 0 0', font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
              Punctajul e raportat la toate cele {total} de grile: o grilă fără răspuns valorează 0, la fel ca
              una greșită. Fără penalizări.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
