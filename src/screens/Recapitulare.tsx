import { useEffect } from 'react';
import { AnswerOptions } from '../components/AnswerOptions';
import { EmptyState } from '../components/EmptyState';
import { PoartaContinut } from '../components/PoartaContinut';
import { Progress } from '../components/Progress';
import { OPTION_KEYS, questionCap, questionMaterie, tipLabel } from '../data/questions';
import { urmatoareaScadenta } from '../lib/recapitulare';
import { numar } from '../lib/text';
import { SANS, SERIF, eyebrow, pageLead, pageTitle } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useProgressOptional } from '../state/progressState';

const DATA = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long' });

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

function ListaRecapitulare() {
  const { go, recapitulare } = useApp();
  const progress = useProgressOptional();
  const urmatoarea = urmatoareaScadenta(recapitulare.items);

  return (
    <div className="screen">
      <div style={{ marginBottom: 22 }}>
        <h1 style={pageTitle}>Recapitulare</h1>
        <p style={pageLead}>Grilele la care ai greșit revin la intervale de 1, 3, 7, 14 și 30 de zile.</p>
      </div>

      <div className="card" style={{ maxWidth: 760, padding: 24 }}>
        {progress?.loading ? (
          <EmptyState title="Se încarcă recapitularea…" hint="Citirea istoricului nu blochează biblioteca de grile." />
        ) : progress?.error ? (
          <EmptyState
            title={progress.error}
            hint="Nu afișăm o coadă goală cât timp istoricul nu poate fi citit."
            action={
              <button type="button" className="btn-ghost tinta-tactila" onClick={() => void progress.reload()}>
                Reîncearcă
              </button>
            }
          />
        ) : recapitulare.scadente.length === 0 ? (
          <EmptyState
            title="Nimic de recapitulat azi"
            hint={
              urmatoarea === null
                ? 'După prima grilă greșită, ea va apărea aici pentru repetare.'
                : `Următoarea repetare este programată pe ${DATA.format(new Date(urmatoarea))}.`
            }
            action={
              <button type="button" className="btn-primary tinta-tactila" onClick={() => go('materii')}>
                Exersează din capitole
              </button>
            }
          />
        ) : (
          <>
            <div style={{ ...eyebrow('var(--acc)'), marginBottom: 10 }}>Scadente acum</div>
            <div style={{ font: `400 26px/1.25 ${SERIF}` }}>
              {numar(recapitulare.scadente.length, 'grilă de repetat', 'grile de repetat')}
            </div>
            <p style={{ margin: '8px 0 0', maxWidth: 560, font: `400 13.5px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
              Începi cu cea mai veche. Un răspuns greșit revine imediat; unul corect mută grila la intervalul următor.
            </p>

            <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
              {recapitulare.scadente.slice(0, 5).map((item) => (
                <div
                  key={item.question.id}
                  className="card-flat"
                  style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{ flex: 1, minWidth: 0, font: `500 13.5px ${SANS}` }}>
                    {questionCap(item.question)}
                  </span>
                  <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                    {item.serieCorecta === 0 ? 'după o greșeală' : `${item.serieCorecta} corecte la rând`}
                  </span>
                </div>
              ))}
              {recapitulare.scadente.length > 5 && (
                <div style={{ padding: '4px 2px', font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
                  și încă {recapitulare.scadente.length - 5}
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn-primary tinta-tactila"
              onClick={recapitulare.start}
              style={{ marginTop: 20, padding: '13px 18px', font: `600 14px ${SANS}` }}
            >
              Începe recapitularea
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RulareRecapitulare() {
  const { recapitulare } = useApp();
  const { question, qi, total, answer, isRevealed, isCorrect, pick, primary } = recapitulare;

  useEffect(() => {
    const laTastatura = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        primary();
        return;
      }
      const key = event.key.toUpperCase();
      if (!isRevealed && OPTION_KEYS.includes(key as (typeof OPTION_KEYS)[number])) {
        pick(key as (typeof OPTION_KEYS)[number]);
      }
    };
    window.addEventListener('keydown', laTastatura);
    return () => window.removeEventListener('keydown', laTastatura);
  }, [isRevealed, pick, primary]);

  if (!question) {
    return (
      <div className="screen">
        <div className="card" style={{ maxWidth: 560 }}>
          <EmptyState
            title="Grila nu mai este disponibilă"
            hint="Biblioteca s-a schimbat după pornirea recapitulării. Revino la lista actualizată."
            action={
              <button type="button" className="btn-primary" onClick={recapitulare.reset}>
                Înapoi la recapitulare
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ font: `600 14px ${SANS}` }}>Repetare inteligentă</div>
          <div style={{ marginTop: 3, font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
            Grila {qi + 1} din {total}
          </div>
        </div>
        <div style={{ width: 'min(260px, 42vw)' }}>
          <Progress pct={((qi + (isRevealed ? 1 : 0)) / total) * 100} label="Progresul recapitulării" />
        </div>
      </div>

      <div className="card" style={{ padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ ...eyebrow('var(--brand)'), background: 'var(--brandS)', borderRadius: 6, padding: '6px 9px' }}>
            {tipLabel(question.tip)}
          </span>
          <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
            {questionMaterie(question)} · {questionCap(question)}
          </span>
        </div>

        <p style={{ margin: '18px 0 0', font: `400 21px/1.45 ${SERIF}`, textWrap: 'pretty' }}>{question.text}</p>

        {question.enunturi && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 11, background: 'var(--surf2)' }}>
            {question.enunturi.map((text, index) => (
              <div key={text} style={{ display: 'flex', gap: 10, marginTop: index === 0 ? 0 : 7, font: `400 14px/1.5 ${SANS}` }}>
                <strong>{index + 1}.</strong>
                <span>{text}</span>
              </div>
            ))}
          </div>
        )}

        <AnswerOptions question={question} answer={answer} revealed={isRevealed} onPick={recapitulare.pick} />

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
            <div style={{ font: `600 14.5px ${SANS}` }}>
              {isCorrect ? 'Corect — intervalul va crește.' : 'Greșit — grila rămâne scadentă.'}
            </div>
            <p style={{ margin: '10px 0 0', font: `400 14px/1.6 ${SANS}`, color: 'var(--fg2)' }}>{question.expl}</p>
            <div style={{ marginTop: 14, display: 'grid', gap: 9 }}>
              {question.opts.map(([key]) => (
                <div key={key} style={{ display: 'flex', gap: 10, font: `400 13px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
                  <strong style={{ color: key === question.correct ? 'var(--ok)' : 'var(--fg3)' }}>{key}</strong>
                  <span>{question.why[key]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-primary tinta-tactila"
            onClick={recapitulare.primary}
            disabled={!isRevealed && !answer}
            style={{ padding: '12px 20px', font: `600 14px ${SANS}` }}
          >
            {!isRevealed ? 'Verifică răspunsul' : qi >= total - 1 ? 'Încheie recapitularea' : 'Următoarea grilă →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RezultatRecapitulare() {
  const { go, recapitulare } = useApp();
  const { score } = recapitulare;

  return (
    <div className="screen" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="card" style={{ padding: 28 }}>
        <div style={eyebrow('var(--ok)')}>Recapitulare încheiată</div>
        <h1 style={{ margin: '12px 0 0', font: `400 32px/1.2 ${SERIF}` }}>{score.pct}% corecte</h1>
        <p style={{ margin: '9px 0 0', font: `400 14px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
          {numar(score.corecte, 'grilă corectă', 'grile corecte')} din {score.total}. Răspunsurile corecte se mută la intervalul următor; cele greșite rămân scadente.
        </p>

        <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn-primary tinta-tactila" onClick={() => go('acasa')}>
            Înapoi acasă
          </button>
          <button type="button" className="btn-ghost tinta-tactila" onClick={recapitulare.reset}>
            Vezi coada actualizată
          </button>
        </div>
      </div>
    </div>
  );
}
