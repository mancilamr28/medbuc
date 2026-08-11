import { useEffect, useState } from 'react';
import { AnswerOptions } from '../components/AnswerOptions';
import { Progress } from '../components/Progress';
import { Segmented } from '../components/Segmented';
import { MATERII } from '../data/chapters';
import { OPTION_KEYS, tipLabel, type OptionKey } from '../data/questions';
import { useIsDesktop, useNow, usePersistentState } from '../lib/hooks';
import { formatClock } from '../lib/time';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle, pctPill, statusChip } from '../lib/ui';
import { useApp } from '../state/AppState';
import {
  isCorrectAt,
  isRevealedAt,
  questionAt,
  scoreOf,
  type SessionResult,
  type SessionRun,
} from '../state/useSession';

type Variant = 'a' | 'b';

/** Ecranul de grile își alege faza din setul aflat pe ecran. */
export function Grile() {
  const { session } = useApp();
  if (session.result) return <GrileRezultat result={session.result} />;
  if (session.run) return <GrileRun run={session.run} />;
  return <GrileGol />;
}

/** Frunza care bate din secundă în secundă, ca tick-ul să nu re-randeze tot ecranul. */
function Cronometru({ startedAt }: { startedAt: number }) {
  const now = useNow();
  return (
    <div className="tabular" style={{ font: `500 13px ${SANS}`, color: 'var(--fg2)' }} aria-label="Timp scurs">
      {formatClock((now - startedAt) / 1000)}
    </div>
  );
}

/** Afirmațiile numerotate ale complementului grupat. */
function Enunturi({ items }: { items: string[] }) {
  return (
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
      {items.map((t, i) => (
        <div key={t} style={{ display: 'flex', gap: 10, font: `400 14.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
          <span style={{ fontWeight: 600, color: 'var(--fg)', flex: '0 0 auto' }}>{i + 1}.</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
  );
}

/** Fără set pornit: de aici se pleacă spre lista de capitole. */
function GrileGol() {
  const { go, session } = useApp();
  const recente = Object.values(session.results)
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .slice(0, 4);

  return (
    <div className="screen" style={{ maxWidth: 820, margin: '0 auto' }}>
      <h1 style={pageTitle}>Niciun set pornit</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        Un set de grile ține de un capitol. Alege capitolul din care vrei să exersezi și apasă „Exersează”.
      </p>

      <div className="card" style={{ padding: 26 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => go('materii')}
          style={{ padding: '12px 20px', font: `600 14px ${SANS}` }}
        >
          Alege un capitol →
        </button>
      </div>

      {recente.length > 0 && (
        <div className="card-flat" style={{ marginTop: 18, padding: 20 }}>
          <div style={eyebrow()}>Seturi încheiate</div>
          <div style={{ marginTop: 6 }}>
            {recente.map((r) => {
              const scor = scoreOf(r);
              return (
                <div
                  key={r.setId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 0',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="truncate" style={{ display: 'block', font: `500 13px ${SANS}` }}>
                      {r.capitol}
                    </span>
                    <span
                      style={{ display: 'block', marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}
                    >
                      {MATERII[r.materie].name} · {scor.corecte} din {scor.total}
                    </span>
                  </span>
                  <div style={pctPill(scor.pct)}>{scor.pct}%</div>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => session.openReview(r.setId)}
                    style={{ padding: '7px 12px', borderRadius: 9, font: `500 12.5px ${SANS}` }}
                  >
                    Revezi
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GrileRun({ run }: { run: SessionRun }) {
  const { go, session } = useApp();
  const isDesktop = useIsDesktop();
  const [layout, setLayout] = usePersistentState<Variant>('medbuc.solve', 'a');

  const { question, qi, total, answer, isRevealed, isMarked, isCorrect } = session;
  const withContext = layout === 'b';
  const ultima = qi >= total - 1;

  // Tastele A–E aleg varianta, Enter verifică sau trece mai departe.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const k = e.key.toUpperCase();
      if (k.length === 1 && (OPTION_KEYS as string[]).includes(k)) {
        session.pick(k as OptionKey);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        session.primary();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session]);

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => go('acasa')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
        >
          ← Ieși din sesiune
        </button>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ font: `600 13.5px/1.2 ${SANS}` }}>Set de capitol · {MATERII[run.materie].name}</div>
          <div style={{ marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
            {run.capitol} · {total} grile
          </div>
        </div>
        <Cronometru startedAt={run.startedAt} />
        <button
          type="button"
          className="btn-ghost"
          onClick={session.finish}
          style={{ padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
        >
          Încheie setul
        </button>
        <Segmented
          items={[
            { id: 'a' as Variant, label: 'Focus' },
            { id: 'b' as Variant, label: 'Cu context' },
          ]}
          value={layout}
          onChange={setLayout}
          ariaLabel="Aranjarea ecranului de rezolvare"
        />
      </div>

      <div
        style={
          withContext && isDesktop
            ? { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 20, alignItems: 'start' }
            : { display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 20, maxWidth: 820, margin: '0 auto' }
        }
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 5, flex: 1, flexWrap: 'wrap' }}>
              {run.order.map((_, i) => {
                const revealed = isRevealedAt(run, i);
                const ok = isCorrectAt(run, i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => session.goTo(i)}
                    aria-label={`Grila ${i + 1}`}
                    style={{
                      flex: 1,
                      minWidth: 14,
                      height: 6,
                      border: 0,
                      borderRadius: 99,
                      padding: 0,
                      cursor: 'pointer',
                      background:
                        i === qi
                          ? 'var(--brand)'
                          : revealed
                            ? ok
                              ? 'var(--ok)'
                              : 'var(--bad)'
                            : 'var(--surf3)',
                    }}
                  />
                );
              })}
            </div>
            <div className="tabular" style={{ font: `500 12.5px ${SANS}`, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>
              Grila {qi + 1} din {total}
            </div>
          </div>

          <div className="card" style={{ padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  ...eyebrow('var(--brand)'),
                  letterSpacing: '.1em',
                  background: 'var(--brandS)',
                  borderRadius: 6,
                  padding: '6px 9px',
                }}
              >
                {tipLabel(question.tip)}
              </span>
              <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
                {question.materie} · {question.cap}
              </span>
              <button
                type="button"
                onClick={session.toggleMark}
                aria-pressed={isMarked}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 11px',
                  border: `1px solid ${isMarked ? 'var(--acc)' : 'var(--line)'}`,
                  borderRadius: 8,
                  background: isMarked ? 'var(--accS)' : 'transparent',
                  color: isMarked ? 'var(--acc)' : 'var(--fg3)',
                  font: `500 12px ${SANS}`,
                  cursor: 'pointer',
                }}
              >
                {isMarked ? '★ Marcată' : '☆ Marchează'}
              </button>
            </div>

            <p style={{ margin: '18px 0 0', font: `400 21px/1.45 ${SERIF}`, color: 'var(--fg)', textWrap: 'pretty' }}>
              {question.text}
            </p>

            {question.enunturi && <Enunturi items={question.enunturi} />}

            <AnswerOptions
              question={question}
              answer={answer}
              revealed={isRevealed}
              onPick={session.pick}
            />

            {isRevealed && (
              <div
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 12,
                  border: `1px solid ${isCorrect ? 'var(--ok)' : 'var(--bad)'}`,
                  background: isCorrect ? 'var(--okS)' : 'var(--badS)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      font: `600 13px ${SANS}`,
                      background: isCorrect ? 'var(--ok)' : 'var(--bad)',
                      color: 'var(--onBrand)',
                    }}
                  >
                    {isCorrect ? '✓' : '✕'}
                  </span>
                  <span style={{ font: `600 14.5px ${SANS}`, color: 'var(--fg)' }}>
                    {isCorrect ? 'Corect. Ai reținut bine noțiunea.' : 'Greșit — hai să vedem de ce.'}
                  </span>
                  <span style={{ marginLeft: 'auto', font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
                    Răspuns corect: {question.correct}
                  </span>
                </div>

                <p
                  style={{
                    margin: '12px 0 0',
                    font: `400 14px/1.6 ${SANS}`,
                    color: 'var(--fg2)',
                    textWrap: 'pretty',
                  }}
                >
                  {question.expl}
                </p>

                <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line2)' }}>
                  <div style={{ ...eyebrow(), letterSpacing: '.1em' }}>De ce fiecare variantă</div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {question.opts.map(([k]) => (
                      <div key={k} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                        <span
                          style={{
                            flex: '0 0 auto',
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            display: 'grid',
                            placeItems: 'center',
                            font: `600 12px ${SANS}`,
                            background: k === question.correct ? 'var(--ok)' : 'var(--surf3)',
                            color: k === question.correct ? 'var(--onBrand)' : 'var(--fg3)',
                          }}
                        >
                          {k}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              font: `400 13.5px/1.55 ${SANS}`,
                              color: 'var(--fg2)',
                              textWrap: 'pretty',
                            }}
                          >
                            {question.why[k]}
                          </p>
                          {answer === k && (
                            <span
                              style={{
                                display: 'inline-block',
                                marginTop: 5,
                                font: `500 11px ${SANS}`,
                                color: 'var(--fg3)',
                              }}
                            >
                              Varianta aleasă de tine
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      font: `400 11.5px ${SANS}`,
                      color: 'var(--fg3)',
                      borderLeft: '2px solid var(--line2)',
                      paddingLeft: 10,
                    }}
                  >
                    {question.src}
                  </span>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ marginLeft: 'auto', padding: '8px 13px', borderRadius: 9, font: `500 12.5px ${SANS}`, background: 'var(--surf)' }}
                  >
                    Adaugă la recapitulare
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => go('materii')}
                    style={{ padding: '8px 13px', borderRadius: 9, font: `500 12.5px ${SANS}`, background: 'var(--surf)' }}
                  >
                    Deschide capitolul
                  </button>
                </div>
              </div>
            )}

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
                onClick={session.prev}
                disabled={qi === 0}
                style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
              >
                Înapoi
              </button>
              <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)', marginLeft: 2 }}>
                Taste: A–E pentru răspuns, Enter pentru{' '}
                {isRevealed ? (ultima ? 'rezultat' : 'următoarea') : 'verificare'}
              </span>
              <button
                type="button"
                className="btn-primary"
                onClick={session.primary}
                disabled={!isRevealed && !answer}
                style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
              >
                {isRevealed ? (ultima ? 'Vezi rezultatul →' : 'Următoarea grilă →') : 'Verifică răspunsul'}
              </button>
            </div>
          </div>
        </div>

        {withContext && <ContextColumn key={run.setId} run={run} />}
      </div>
    </div>
  );
}

/** Ecranul de rezultat: cifrele setului încheiat și recitirea grilelor. */
function GrileRezultat({ result }: { result: SessionResult }) {
  const { go, session } = useApp();
  const [filtru, setFiltru] = useState<'toate' | 'gresite'>('toate');

  const scor = scoreOf(result);
  const culoare = scor.pct >= 80 ? 'var(--ok)' : scor.pct >= 65 ? 'var(--brand)' : 'var(--bad)';
  const pozitii = result.order
    .map((_, i) => i)
    .filter((i) => filtru === 'toate' || !isCorrectAt(result, i));

  const dale: [string, string, string][] = [
    ['Corecte', String(scor.corecte), 'var(--ok)'],
    ['Greșite', String(scor.gresite), 'var(--bad)'],
    ['Fără răspuns', String(scor.neraspunse), 'var(--fg3)'],
    ['Timp', formatClock(scor.durataMs / 1000), 'var(--fg)'],
  ];

  return (
    <div className="screen" style={{ maxWidth: 820, margin: '0 auto' }}>
      <button
        type="button"
        className="btn-ghost"
        onClick={() => go('materii')}
        style={{ marginBottom: 16, padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
      >
        ← Înapoi la materii
      </button>

      <h1 style={pageTitle}>Set încheiat</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        {MATERII[result.materie].name} · {result.capitol}
      </p>

      <div className="card" style={{ padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ font: `500 46px/1 ${SERIF}`, letterSpacing: '-.02em', color: culoare }}>{scor.pct}%</span>
          <span style={{ font: `400 14px ${SANS}`, color: 'var(--fg2)' }}>
            {scor.corecte} din {scor.total} grile
          </span>
        </div>

        <div style={{ marginTop: 16 }}>
          <Progress
            pct={scor.pct}
            height={8}
            color={culoare}
            label={`Rezultat: ${scor.corecte} din ${scor.total} grile`}
          />
        </div>

        <div style={{ ...autoGrid(140, 14), marginTop: 20 }}>
          {dale.map(([eticheta, valoare, color]) => (
            <div key={eticheta} className="card-flat" style={{ padding: '16px 18px' }}>
              <div style={eyebrow()}>{eticheta}</div>
              <div className="tabular" style={{ marginTop: 9, font: `500 27px/1 ${SERIF}`, color }}>
                {valoare}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={session.restart}
            style={{ padding: '12px 20px', font: `600 14px ${SANS}` }}
          >
            Reia setul
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => go('materii')}
            style={{ padding: '12px 18px', font: `500 13.5px ${SANS}`, background: 'var(--surf)' }}
          >
            Alt capitol
          </button>
        </div>
      </div>

      <div style={{ margin: '26px 0 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ ...eyebrow(), flex: 1 }}>Recitește grilele</div>
        <Segmented
          items={[
            { id: 'toate' as const, label: 'Toate' },
            { id: 'gresite' as const, label: 'Doar greșite' },
          ]}
          value={filtru}
          onChange={setFiltru}
          ariaLabel="Ce grile se afișează la recitire"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pozitii.map((i) => {
          const q = questionAt(result, i);
          const raspuns = result.answers[i];
          const chip =
            raspuns === undefined
              ? statusChip('var(--surf2)', 'var(--fg3)')
              : isCorrectAt(result, i)
                ? statusChip('var(--okS)', 'var(--ok)')
                : statusChip('var(--badS)', 'var(--bad)');
          const eticheta =
            raspuns === undefined ? 'Fără răspuns' : isCorrectAt(result, i) ? 'Corect' : 'Greșit';

          return (
            <div key={i} className="card-flat" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ font: `600 12.5px ${SANS}`, color: 'var(--fg3)' }}>Grila {i + 1}</span>
                <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>{tipLabel(q.tip)}</span>
                <span style={{ ...chip, marginLeft: 'auto' }}>{eticheta}</span>
              </div>

              <p style={{ margin: '14px 0 0', font: `400 17px/1.5 ${SERIF}`, color: 'var(--fg)', textWrap: 'pretty' }}>
                {q.text}
              </p>

              {q.enunturi && <Enunturi items={q.enunturi} />}

              <AnswerOptions question={q} answer={raspuns} revealed onPick={() => {}} />

              <p
                style={{
                  margin: '16px 0 0',
                  paddingTop: 14,
                  borderTop: '1px solid var(--line2)',
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

        {pozitii.length === 0 && (
          <div className="card-flat" style={{ padding: 26, font: `400 13.5px/1.6 ${SANS}`, color: 'var(--fg3)' }}>
            Nicio grilă greșită în acest set. Comută pe „Toate” ca să le recitești pe toate.
          </div>
        )}
      </div>
    </div>
  );
}

/** Coloana de context: navigatorul setului, notița pe capitol și cifrele capitolului. */
function ContextColumn({ run }: { run: SessionRun }) {
  const { session } = useApp();
  const [note, setNote] = usePersistentState<string>(`medbuc.note.${run.capitol}`, '');

  return (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start', minWidth: 0 }}>
      <div className="card-flat" style={{ padding: 18 }}>
        <div style={eyebrow()}>Grile în set</div>
        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(38px,1fr))',
            gap: 7,
          }}
        >
          {run.order.map((_, i) => {
            const revealed = isRevealedAt(run, i);
            const ok = revealed && isCorrectAt(run, i);
            const cur = i === run.qi;
            return (
              <button
                key={i}
                type="button"
                onClick={() => session.goTo(i)}
                aria-current={cur ? 'true' : undefined}
                style={{
                  aspectRatio: '1',
                  borderRadius: 9,
                  cursor: 'pointer',
                  font: `600 13px ${SANS}`,
                  border: `1px solid ${cur ? 'var(--brand)' : 'var(--line)'}`,
                  background: revealed
                    ? ok
                      ? 'var(--okS)'
                      : 'var(--badS)'
                    : cur
                      ? 'var(--brandS)'
                      : 'var(--surf2)',
                  color: revealed ? (ok ? 'var(--ok)' : 'var(--bad)') : cur ? 'var(--brand)' : 'var(--fg2)',
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
            font: `400 11.5px/1.4 ${SANS}`,
            color: 'var(--fg3)',
          }}
        >
          {[
            ['var(--ok)', 'Corecte', session.tally.corecte],
            ['var(--bad)', 'Greșite', session.tally.gresite],
            ['var(--acc)', 'Marcate', session.tally.marcate],
          ].map(([color, label, n]) => (
            <div key={String(label)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: String(color) }} />
              {label} {n}
            </div>
          ))}
        </div>
      </div>

      <div className="card-flat" style={{ padding: 18 }}>
        <div style={eyebrow()}>Notița mea pentru capitol</div>
        <textarea
          className="field"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Scrie ce vrei să ții minte…"
          style={{ marginTop: 12, minHeight: 96, resize: 'vertical', padding: '11px 12px', font: `400 13px/1.5 ${SANS}` }}
        />
      </div>

      <div className="card-flat" style={{ padding: 18 }}>
        <div style={eyebrow()}>Capitolul tău în cifre</div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Corecte în acest capitol', '68%'],
            ['Media platformei', '74%'],
            ['Timp mediu / grilă', '41s'],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                font: `400 13px ${SANS}`,
                color: 'var(--fg2)',
              }}
            >
              {label}
              <b style={{ color: 'var(--fg)', fontWeight: 600 }}>{value}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
