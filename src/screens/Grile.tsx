import { useEffect } from 'react';
import { AnswerOptions } from '../components/AnswerOptions';
import { EmptyState } from '../components/EmptyState';
import { PoartaContinut } from '../components/PoartaContinut';
import { Progress } from '../components/Progress';
import { Segmented } from '../components/Segmented';
import { OPTION_KEYS, questionCap, questionMaterie, tipLabel, type OptionKey } from '../data/questions';
import { useIsDesktop, useNow, usePersistentState } from '../lib/hooks';
import { formatClock } from '../lib/time';
import { SANS, SERIF, autoGrid, eyebrow } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { descriereScop, frazaCapitoleGoale, frazaCorecte } from './grileText';

type Variant = 'a' | 'b';

/** Ecranul de grile își alege faza: rezolvare sau panoul de rezultat. */
export function Grile() {
  const { session } = useApp();
  return (
    <PoartaContinut>
      {session.total === 0 ? (
        <CapitolGol />
      ) : session.finished ? (
        <GrileRezultat />
      ) : (
        <GrileRun />
      )}
    </PoartaContinut>
  );
}

/**
 * Biblioteca are grile, dar niciuna din capitolele sesiunii.
 *
 * `Materii` nu lasă să se ajungă aici — butonul e dezactivat pe capitolele goale
 * — dar o grilă retrasă între alegere și rezolvare golește bazinul, iar o
 * sesiune fără nicio grilă randează un ecran alb dacă nu se spune nimic. Starea
 * stă aici, nu în `PoartaContinut`: poarta e comună cu `Simulari`, care n-are
 * nicio treabă cu bazinul sesiunii de exersare.
 */
function CapitolGol() {
  const { go, session } = useApp();
  return (
    <div className="screen">
      <div className="card" style={{ padding: 8, maxWidth: 520 }}>
        <EmptyState
          title={frazaCapitoleGoale(session.capitole)}
          hint="Alege alt capitol sau exersează din toată biblioteca."
          action={
            <button
              type="button"
              className="btn-primary"
              onClick={() => go('materii')}
              style={{ padding: '10px 16px', font: `600 13px ${SANS}` }}
            >
              Înapoi la materii
            </button>
          }
        />
      </div>
    </div>
  );
}

function GrileRun() {
  const { go, session } = useApp();
  const isDesktop = useIsDesktop();
  const [layout, setLayout] = usePersistentState<Variant>('medbuc.solve', 'a');
  const now = useNow();

  const { question, qi, total, answer, isRevealed, isMarked, isCorrect } = session;
  const withContext = layout === 'b';
  const ultima = qi === total - 1;
  const scop = descriereScop(session.capitole);

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

  const elapsed = formatClock((now - session.startedAt) / 1000);

  // `Grile()` tratează deja biblioteca goală; garda de aici e pentru tipuri, după
  // toate hook-urile, ca ordinea lor să rămână aceeași la fiecare randare.
  if (!question) return null;

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <button
          type="button"
          className="btn-ghost tinta-tactila"
          onClick={() => go('acasa')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
        >
          ← Ieși din sesiune
        </button>
        <div style={{ flex: 1, minWidth: 120 }}>
          {/* Antetul descrie sesiunea, nu grila de pe ecran: scria materia grilei
              curente lângă „Sesiune rapidă", deci se schimba la fiecare pas. */}
          <div style={{ font: `600 13.5px/1.2 ${SANS}` }}>{scop.titlu}</div>
          <div style={{ marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
            {scop.detaliu} · fără limită de timp
          </div>
        </div>
        <div className="tabular" style={{ font: `500 13px ${SANS}`, color: 'var(--fg2)' }} aria-label="Timp scurs">
          {elapsed}
        </div>
        <button
          type="button"
          className="btn-ghost tinta-tactila"
          onClick={session.finish}
          style={{ padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
        >
          Încheie sesiunea
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
              {Array.from({ length: total }, (_, i) => {
                const revealed = !!session.revealed[i];
                const ok = session.answers[i] === session.banca[i]?.correct;
                return (
                  <button
                    key={i}
                    type="button"
                    className="tinta-tactila"
                    onClick={() => session.goTo(i)}
                    aria-label={`Grila ${i + 1}`}
                    style={{
                      flex: 1,
                      minWidth: 14,
                      border: 0,
                      padding: 0,
                      cursor: 'pointer',
                      background: 'transparent',
                      display: 'grid',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'block',
                        width: '100%',
                        height: 6,
                        borderRadius: 99,
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
                  </button>
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
                {questionMaterie(question)} · {questionCap(question)}
              </span>
              <button
                type="button"
                className="tinta-tactila"
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

            {question.enunturi && (
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
                {question.enunturi.map((t, i) => (
                  <div key={t} style={{ display: 'flex', gap: 10, font: `400 14.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--fg)', flex: '0 0 auto' }}>{i + 1}.</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}

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
                    className="btn-ghost tinta-tactila"
                    style={{ marginLeft: 'auto', padding: '8px 13px', borderRadius: 9, font: `500 12.5px ${SANS}`, background: 'var(--surf)' }}
                  >
                    Adaugă la recapitulare
                  </button>
                  <button
                    type="button"
                    className="btn-ghost tinta-tactila"
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
                className="btn-ghost tinta-tactila"
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
                className="btn-primary tinta-tactila"
                onClick={session.primary}
                disabled={!isRevealed && !answer}
                style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
              >
                {isRevealed ? (ultima ? 'Vezi rezultatul →' : 'Următoarea grilă →') : 'Verifică răspunsul'}
              </button>
            </div>
          </div>
        </div>

        {withContext && <ContextColumn />}
      </div>
    </div>
  );
}

/** Panoul de rezultat: cât ai nimerit, cât ai greșit și cât a durat sesiunea. */
function GrileRezultat() {
  const { go, session } = useApp();
  const { corecte, gresite, neraspunse, total, pct, durataMs } = session.score;
  const culoare = pct >= 80 ? 'var(--ok)' : pct >= 65 ? 'var(--brand)' : 'var(--bad)';
  const scop = descriereScop(session.capitole);

  const dale: [string, string, string][] = [
    ['Corecte', String(corecte), 'var(--ok)'],
    ['Greșite', String(gresite), 'var(--bad)'],
    ['Fără răspuns', String(neraspunse), 'var(--fg3)'],
    ['Timp', formatClock(durataMs / 1000), 'var(--fg)'],
  ];

  return (
    <div className="screen">
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => go('acasa')}
          style={{ marginBottom: 18, padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
        >
          ← Înapoi acasă
        </button>

        <div className="card" style={{ padding: 26 }}>
          <div style={eyebrow('var(--brand)')}>Sesiune încheiată</div>
          <h1 style={{ margin: '8px 0 0', font: `500 30px/1.15 ${SERIF}`, color: 'var(--fg)' }}>Rezultatul tău</h1>
          <div style={{ marginTop: 6, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>{scop.detaliu}</div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span className="tabular" style={{ font: `600 46px/1 ${SERIF}`, color: culoare }}>
              {pct}%
            </span>
            {/* Fraza vine întreagă dintr-o funcție pură: numărul e randat separat,
                în procentul de alături, deci `numar()` n-ar ajunge la ea din JSX. */}
            <span style={{ font: `400 14px ${SANS}`, color: 'var(--fg2)' }}>{frazaCorecte(corecte, total)}</span>
          </div>

          <div style={{ marginTop: 14 }}>
            <Progress pct={pct} height={8} color={culoare} label={`Scor ${pct}%`} />
          </div>

          <div style={{ ...autoGrid(140, 14), marginTop: 20 }}>
            {dale.map(([label, value, color]) => (
              <div key={label} className="card-flat" style={{ padding: 16 }}>
                <div style={eyebrow()}>{label}</div>
                <div className="tabular" style={{ marginTop: 8, font: `600 24px/1 ${SANS}`, color }}>
                  {value}
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
            <button
              type="button"
              className="btn-ghost"
              onClick={() => go('materii')}
              style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
            >
              Înapoi la materii
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={session.restart}
              style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
            >
              Reia sesiunea
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Coloana de context: navigatorul sesiunii, notița pe capitol și cifrele capitolului. */
function ContextColumn() {
  const { session } = useApp();
  const capId = session.question?.capId;
  // Cheia ține de id-ul capitolului: o redenumire nu mai orfanizează notița.
  const [note, setNote] = usePersistentState<string>(`medbuc.note.${capId ?? 'fara-capitol'}`, '');

  return (
    <div style={{ display: 'grid', gap: 16, alignContent: 'start', minWidth: 0 }}>
      <div className="card-flat" style={{ padding: 18 }}>
        <div style={eyebrow()}>Grile în sesiune</div>
        <div
          style={{
            marginTop: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(38px,1fr))',
            gap: 7,
          }}
        >
          {Array.from({ length: session.total }, (_, i) => {
            const revealed = !!session.revealed[i];
            const ok = revealed && session.answers[i] === session.banca[i]?.correct;
            const cur = i === session.qi;
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
        <EmptyState
          title="Statisticile apar după primele răspunsuri"
          hint="Rezolvă câteva grile pentru a vedea progresul real pe acest capitol."
          padding="18px 0 0"
        />
      </div>
    </div>
  );
}
