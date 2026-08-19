import {
  faArrowLeft,
  faCalendarCheck,
  faCheck,
  faClockRotateLeft,
  faLayerGroup,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect } from 'react';
import { AnswerOptions } from '../components/AnswerOptions';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { PoartaContinut } from '../components/PoartaContinut';
import { Progress } from '../components/Progress';
import { OPTION_KEYS, questionCap, questionMaterie, tipLabel, type OptionKey } from '../data/questions';
import { useIsDesktop, useNow } from '../lib/hooks';
import { INTERVALE_RECAPITULARE_ZILE, urmatoareaScadenta } from '../lib/recapitulare';
import { numar } from '../lib/text';
import { formatClock } from '../lib/time';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle, sideStack, twoCol } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useProgressOptional } from '../state/progressState';

const DATA = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long' });
const DATA_SCURTA = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' });

export function Recapitulare() {
  const { recapitulare } = useApp();
  return (
    <PoartaContinut>
      {recapitulare.phase === 'lista' ? (
        <ListaRecapitulare />
      ) : recapitulare.phase === 'rezultat' ? (
        <RezultatRecapitulare />
      ) : (
        <RulareRecapitulare />
      )}
    </PoartaContinut>
  );
}

function CifraRecapitulare({
  label,
  value,
  unit,
  wide = false,
}: {
  label: string;
  value: string;
  unit: string;
  wide?: boolean;
}) {
  return (
    <div className="card-flat" style={{ padding: '16px 18px', gridColumn: wide ? '1/-1' : undefined }}>
      <div style={eyebrow()}>{label}</div>
      <div style={{ marginTop: 9, display: 'flex', alignItems: 'baseline', gap: 6, minHeight: 28 }}>
        <span className="tabular" style={{ font: `500 27px/1 ${SERIF}`, letterSpacing: '-.01em' }}>{value}</span>
        <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>{unit}</span>
      </div>
    </div>
  );
}

function RitmRecapitulare() {
  return (
    <div className="card-flat" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden="true"
          style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'var(--brand)', background: 'var(--brandS)' }}
        >
          <Icon icon={faClockRotateLeft} size={15} />
        </span>
        <div>
          <div style={{ font: `600 14px ${SANS}` }}>Ritmul repetării</div>
          <div style={{ marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>După fiecare răspuns corect</div>
        </div>
      </div>
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 6 }}>
        {INTERVALE_RECAPITULARE_ZILE.map((zile, index) => (
          <div key={zile} style={{ minWidth: 0, textAlign: 'center' }}>
            <div
              className="tabular"
              style={{ padding: '9px 2px', borderRadius: 8, font: `600 12px ${SANS}`, color: index === 0 ? 'var(--brand)' : 'var(--fg2)', background: index === 0 ? 'var(--brandS)' : 'var(--surf2)' }}
            >
              {zile}
            </div>
            <div style={{ marginTop: 5, font: `400 10px ${SANS}`, color: 'var(--fg3)' }}>{zile === 1 ? 'zi' : 'zile'}</div>
          </div>
        ))}
      </div>
      <p style={{ margin: '17px 0 0', font: `400 12.5px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
        O greșeală readuce grila în coadă. Fiecare răspuns corect mărește intervalul până la următoarea apariție.
      </p>
    </div>
  );
}

function ListaRecapitulare() {
  const { go, recapitulare, session } = useApp();
  const isDesktop = useIsDesktop();
  const progress = useProgressOptional();
  const urmatoarea = urmatoareaScadenta(recapitulare.items);
  const indisponibil = progress?.loading || !!progress?.error;
  const valoareUrmatoare = indisponibil ? '—' : urmatoarea === null ? '—' : DATA_SCURTA.format(new Date(urmatoarea));

  return (
    <div className="screen">
      <div style={{ marginBottom: 22 }}>
        <h1 style={pageTitle}>Recapitulare</h1>
        <p style={pageLead}>Reia la momentul potrivit grilele la care ai greșit și fixează noțiunile pe termen lung.</p>
      </div>

      <div style={{ ...autoGrid(170, 14), marginBottom: 18 }}>
        <CifraRecapitulare
          label="De repetat acum"
          value={indisponibil ? '—' : String(recapitulare.scadente.length)}
          unit={!indisponibil && recapitulare.scadente.length === 1 ? 'grilă' : 'grile'}
        />
        <CifraRecapitulare
          label="În program"
          value={indisponibil ? '—' : String(recapitulare.items.length)}
          unit={!indisponibil && recapitulare.items.length === 1 ? 'grilă' : 'grile'}
        />
        <CifraRecapitulare
          label="Următoarea"
          value={valoareUrmatoare}
          unit={indisponibil ? '' : urmatoarea === null ? 'fără dată' : ''}
          wide={!isDesktop}
        />
      </div>

      <div style={twoCol(isDesktop, '2.15fr')}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {progress?.loading ? (
            <EmptyState title="Se încarcă recapitularea…" hint="Citirea istoricului nu blochează biblioteca de grile." padding="54px 22px" />
          ) : progress?.error ? (
            <EmptyState
              title={progress.error}
              hint="Nu afișăm o coadă goală cât timp istoricul nu poate fi citit."
              action={
                <button type="button" className="btn-ghost tinta-tactila" onClick={() => void progress.reload()} style={{ padding: '11px 16px', font: `500 13.5px ${SANS}` }}>
                  Reîncearcă
                </button>
              }
              padding="48px 22px"
            />
          ) : recapitulare.scadente.length === 0 ? (
            <div style={{ padding: isDesktop ? '42px 34px' : '34px 22px' }}>
              <div
                aria-hidden="true"
                style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', color: 'var(--ok)', background: 'var(--okS)' }}
              >
                <Icon icon={recapitulare.items.length === 0 ? faLayerGroup : faCalendarCheck} size={19} />
              </div>
              <div style={{ marginTop: 18, ...eyebrow('var(--ok)', 11) }}>{recapitulare.items.length === 0 ? 'Începe programul' : 'La zi'}</div>
              <h2 style={{ margin: '10px 0 0', font: `400 26px/1.2 ${SERIF}` }}>
                {recapitulare.items.length === 0 ? 'Construiește prima recapitulare' : 'Nimic de recapitulat azi'}
              </h2>
              <p style={{ margin: '9px 0 0', maxWidth: 520, font: `400 13.5px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
                {recapitulare.items.length === 0
                  ? 'După prima grilă greșită, ea va intra automat în programul de repetare.'
                  : `Următoarea repetare este programată pe ${DATA.format(new Date(urmatoarea!))}.`}
              </p>
              <button
                type="button"
                className="btn-primary tinta-tactila"
                onClick={() => {
                  session.cereConfigurare();
                  go('grile');
                }}
                style={{ marginTop: 20, padding: '12px 18px', font: `600 14px ${SANS}` }}
              >
                Exersează din capitole →
              </button>
            </div>
          ) : (
            <>
              <div style={{ padding: '20px 22px 17px', borderBottom: '1px solid var(--line)' }}>
                <div style={eyebrow('var(--acc)', 11)}>Scadente acum</div>
                <div style={{ marginTop: 10, font: `400 25px/1.25 ${SERIF}` }}>
                  {numar(recapitulare.scadente.length, 'grilă de repetat', 'grile de repetat')}
                </div>
                <p style={{ margin: '7px 0 0', maxWidth: 580, font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
                  Începi cu cea mai veche. Răspunsurile corecte avansează; cele greșite rămân în coadă.
                </p>
              </div>
              <div>
                {recapitulare.scadente.slice(0, 5).map((item) => (
                  <div key={item.question.id} className="list-row" style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--line)' }}>
                    <span
                      aria-hidden="true"
                      style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center', flex: '0 0 auto', color: 'var(--acc)', background: 'var(--accS)' }}
                    >
                      <Icon icon={faClockRotateLeft} size={13} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: `500 13.5px/1.35 ${SANS}` }}>{questionCap(item.question)}</div>
                      <div style={{ marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>{questionMaterie(item.question)}</div>
                    </div>
                    <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)', textAlign: 'right' }}>
                      {item.serieCorecta === 0 ? 'după o greșeală' : numar(item.serieCorecta, 'corectă la rând', 'corecte la rând')}
                    </span>
                  </div>
                ))}
                {recapitulare.scadente.length > 5 && (
                  <div style={{ padding: '11px 22px', font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>și încă {recapitulare.scadente.length - 5}</div>
                )}
              </div>
              <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-primary tinta-tactila" onClick={recapitulare.start} style={{ padding: '12px 18px', font: `600 14px ${SANS}` }}>
                  Începe recapitularea →
                </button>
              </div>
            </>
          )}
        </div>

        <div style={sideStack}>
          <RitmRecapitulare />
          <div style={{ padding: '18px 20px', borderRadius: 14, border: '1px solid var(--brandS2)', background: 'var(--brandS)' }}>
            <div style={eyebrow('var(--brand)')}>De ce funcționează</div>
            <p style={{ margin: '10px 0 0', font: `400 12.5px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
              Coada se bazează pe grile distincte și pe istoricul tău real, nu pe numărul de sesiuni începute.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RulareRecapitulare() {
  const { go, recapitulare } = useApp();
  const now = useNow();
  const { question, qi, total, answer, isRevealed, isCorrect, pick, primary } = recapitulare;
  const ultima = qi === total - 1;
  const elapsed = formatClock((now - recapitulare.startedAt) / 1000);

  useEffect(() => {
    const laTastatura = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const key = event.key.toUpperCase();
      if (!isRevealed && OPTION_KEYS.includes(key as OptionKey)) {
        pick(key as OptionKey);
        event.preventDefault();
      } else if (event.key === 'Enter') {
        primary();
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', laTastatura);
    return () => window.removeEventListener('keydown', laTastatura);
  }, [isRevealed, pick, primary]);

  if (!question) {
    return (
      <div className="screen">
        <div className="card" style={{ padding: 8, maxWidth: 560 }}>
          <EmptyState
            title="Grila nu mai este disponibilă"
            hint="Biblioteca s-a schimbat după pornirea recapitulării. Revino la lista actualizată."
            action={
              <button type="button" className="btn-primary tinta-tactila" onClick={recapitulare.reset} style={{ padding: '11px 16px', font: `600 13.5px ${SANS}` }}>
                Înapoi la recapitulare
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <button
            type="button"
            className="btn-ghost tinta-tactila"
            onClick={() => go('acasa')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
          >
            <Icon icon={faArrowLeft} size={12} /> Ieși din recapitulare
          </button>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ font: `600 13.5px/1.2 ${SANS}` }}>Repetare inteligentă</div>
            <div style={{ marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>Răspunsurile corecte avansează la intervalul următor</div>
          </div>
          <div className="tabular" style={{ font: `500 13px ${SANS}`, color: 'var(--fg2)' }} aria-label="Timp scurs">{elapsed}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}><Progress pct={((qi + (isRevealed ? 1 : 0)) / total) * 100} label="Progresul recapitulării" /></div>
          <div className="tabular" style={{ font: `500 12.5px ${SANS}`, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>Grila {qi + 1} din {total}</div>
        </div>

        <div className="card" style={{ padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ ...eyebrow('var(--brand)'), background: 'var(--brandS)', borderRadius: 6, padding: '6px 9px' }}>{tipLabel(question.tip)}</span>
            <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>{questionMaterie(question)} · {questionCap(question)}</span>
          </div>
          <p style={{ margin: '18px 0 0', font: `400 21px/1.45 ${SERIF}`, textWrap: 'pretty' }}>{question.text}</p>
          {question.enunturi && (
            <div style={{ marginTop: 16, padding: '16px 18px', borderRadius: 11, background: 'var(--surf2)' }}>
              {question.enunturi.map((text, index) => (
                <div key={text} style={{ display: 'flex', gap: 10, marginTop: index === 0 ? 0 : 7, font: `400 14px/1.5 ${SANS}` }}><strong>{index + 1}.</strong><span>{text}</span></div>
              ))}
            </div>
          )}
          <AnswerOptions question={question} answer={answer} revealed={isRevealed} onPick={recapitulare.pick} />
          {isRevealed && (
            <div style={{ marginTop: 18, padding: 18, borderRadius: 12, border: `1px solid ${isCorrect ? 'var(--ok)' : 'var(--bad)'}`, background: isCorrect ? 'var(--okS)' : 'var(--badS)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span aria-hidden="true" style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: '0 0 auto', color: 'var(--onBrand)', background: isCorrect ? 'var(--ok)' : 'var(--bad)' }}>
                  <Icon icon={isCorrect ? faCheck : faXmark} size={12} />
                </span>
                <span style={{ font: `600 14.5px ${SANS}` }}>{isCorrect ? 'Corect — intervalul va crește.' : 'Greșit — grila rămâne scadentă.'}</span>
              </div>
              <p style={{ margin: '11px 0 0', font: `400 14px/1.6 ${SANS}`, color: 'var(--fg2)' }}>{question.expl}</p>
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line2)', display: 'grid', gap: 10 }}>
                {question.opts.map(([key]) => (
                  <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', flex: '0 0 auto', font: `600 12px ${SANS}`, background: key === question.correct ? 'var(--ok)' : 'var(--surf3)', color: key === question.correct ? 'var(--onBrand)' : 'var(--fg3)' }}>{key}</span>
                    <span style={{ font: `400 13px/1.5 ${SANS}`, color: 'var(--fg2)' }}>{question.why[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>Taste: A–E pentru răspuns, Enter pentru {isRevealed ? (ultima ? 'rezultat' : 'următoarea') : 'verificare'}</span>
            <button type="button" className="btn-primary tinta-tactila" onClick={recapitulare.primary} disabled={!isRevealed && !answer} style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}>
              {!isRevealed ? 'Verifică răspunsul' : ultima ? 'Vezi rezultatul →' : 'Următoarea grilă →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RezultatRecapitulare() {
  const { go, recapitulare } = useApp();
  const { score } = recapitulare;
  const culoare = score.pct >= 80 ? 'var(--ok)' : score.pct >= 65 ? 'var(--brand)' : 'var(--bad)';
  const dale = [
    ['Corecte', String(score.corecte), 'var(--ok)'],
    ['De revăzut', String(score.gresite), score.gresite > 0 ? 'var(--bad)' : 'var(--fg3)'],
    ['Total', String(score.total), 'var(--fg)'],
    ['Timp', formatClock(score.durataMs / 1000), 'var(--fg)'],
  ] as const;

  return (
    <div className="screen">
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <button type="button" className="btn-ghost tinta-tactila" onClick={() => go('acasa')} style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}>
          <Icon icon={faArrowLeft} size={12} /> Înapoi acasă
        </button>
        <div className="card" style={{ padding: 26 }}>
          <div style={eyebrow(culoare)}>Recapitulare încheiată</div>
          <h1 style={{ margin: '9px 0 0', font: `500 30px/1.15 ${SERIF}` }}>Rezultatul tău</h1>
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span className="tabular" style={{ font: `600 46px/1 ${SERIF}`, color: culoare }}>{score.pct}%</span>
            <span style={{ font: `400 14px ${SANS}`, color: 'var(--fg2)' }}>{numar(score.corecte, 'grilă corectă', 'grile corecte')} din {score.total}</span>
          </div>
          <div style={{ marginTop: 14 }}><Progress pct={score.pct} height={8} color={culoare} label={`Scor ${score.pct}%`} /></div>
          <div style={{ ...autoGrid(140, 14), marginTop: 20 }}>
            {dale.map(([label, value, color]) => (
              <div key={label} className="card-flat" style={{ padding: 16 }}>
                <div style={eyebrow()}>{label}</div>
                <div className="tabular" style={{ marginTop: 8, font: `600 24px/1 ${SANS}`, color }}>{value}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: '20px 0 0', font: `400 13.5px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
            Răspunsurile corecte se mută la intervalul următor; cele greșite rămân în coadă pentru o nouă încercare.
          </p>
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn-ghost tinta-tactila" onClick={() => go('acasa')} style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}>Înapoi acasă</button>
            <button type="button" className="btn-primary tinta-tactila" onClick={recapitulare.reset} style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}>Vezi coada actualizată →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
