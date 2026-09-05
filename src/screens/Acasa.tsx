import { ChapterChart } from '../components/ChapterChart';
import { EmptyState } from '../components/EmptyState';
import { Progress } from '../components/Progress';
import { ScoreChart } from '../components/ScoreChart';
import { Segmented } from '../components/Segmented';
import { EXAM_DATE, EXAM_DATE_LABEL } from '../data/profile';
import { useMemo } from 'react';
import { usePersistentState } from '../lib/hooks';
import { calculeazaProgres, capitoleSlabe } from '../lib/progres';
import { urmatoareaScadenta } from '../lib/recapitulare';
import { goTestNou } from '../lib/router';
import { numar, primulNume } from '../lib/text';
import { daysUntil } from '../lib/time';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle, pctPill } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useAuth } from '../state/authState';
import { useContentOptional } from '../state/contentState';
import { useProgressOptional } from '../state/progressState';

type Variant = 'a' | 'b';

const cardTitle = { font: `600 15px/1.2 ${SANS}` } as const;
const cardSub = { marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' } as const;
const DATA = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long' });

/**
 * Pagina principală.
 *
 * Arăta până acum un streak de 22 de zile, „1 407 grile rezolvate", un punctaj
 * estimat și o listă cu locurile unde pierzi puncte. Nimic din toate astea nu
 * era calculat — erau literale care nu se schimbau oricâte grile ai fi rezolvat.
 * Au fost scoase. Ce a rămas se poate demonstra: data examenului și sesiunea
 * curentă. Restul spune deschis că nu are încă date.
 */
export function Acasa() {
  const { go, catalog, recapitulare, taxonomie } = useApp();
  const { user, profile } = useAuth();
  const loading = useContentOptional()?.loading ?? false;
  const progressContext = useProgressOptional();
  const progressLoading = progressContext?.loading ?? false;
  const progressError = progressContext?.error ?? null;
  const progress = useMemo(
    () => calculeazaProgres(progressContext?.attempts ?? [], catalog, taxonomie),
    [catalog, progressContext?.attempts, taxonomie],
  );
  const [chart, setChart] = usePersistentState<Variant>('medbuc.chart', 'a');

  const daysLeft = daysUntil(EXAM_DATE);
  const prenume = primulNume(profile?.fullName ?? null, user?.email ?? '');
  // Cardul de aici arată doar primele patru — spațiul cardului e limita, nu
  // logica ce înseamnă „slab"; aceeași funcție, nelimitată, alimentează
  // scopul „Puncte slabe" din configurarea sesiunii.
  const capitoleSlabeAfisate = capitoleSlabe(
    progress.capitole,
    progress.capitole.map((c) => c.capId),
  ).slice(0, 4);
  const capitoleGrafic = [...progress.capitole]
    .sort((a, b) => b.raspunsuri - a.raspunsuri)
    .slice(0, 8)
    .map((c) => ({ id: c.capId, name: c.nume, pct: c.pct }));
  const evolutieGrafic = progress.evolutie.slice(-12);
  const urmatoareaRecapitulare = urmatoareaScadenta(recapitulare.items);

  const deschideGrile = () => goTestNou('exersare');

  return (
    <div className="screen">
      <div style={{ marginBottom: 22 }}>
        <h1 style={pageTitle}>Bună, {prenume}</h1>
        <p style={pageLead}>
          Mai sunt {numar(daysLeft, 'zi', 'zile')} până la examen.{' '}
          {/* Cifra vine din bibliotecă, deci se spune abia după ce se știe.
              Un „0 grile" cât timp se încarcă ar fi o afirmație falsă, nu o stare. */}
          {loading
            ? 'Se încarcă biblioteca…'
            : `Biblioteca are ${numar(catalog.length, 'grilă publicată', 'grile publicate')}.`}
        </p>
      </div>

      <div style={autoGrid(290)}>
        <div style={{ gridColumn: '1/-1', ...autoGrid(280) }}>
          <div className="card hero-card" style={{ padding: 24 }}>
            <div style={eyebrow('var(--acc)', 11)}>Începe</div>
            <div style={{ marginTop: 12, font: `400 23px/1.25 ${SERIF}` }}>
              O sesiune de grile
            </div>
            <div style={{ marginTop: 6, font: `400 13.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
              Fără limită de timp, cu explicații după fiecare răspuns.
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={deschideGrile}
                style={{ padding: '12px 18px', font: `600 14px ${SANS}` }}
              >
                Începe o sesiune →
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => goTestNou('exersare')}
                style={{ padding: '12px 16px', font: `500 14px ${SANS}` }}
              >
                Alege capitolele
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
              <div style={eyebrow(undefined, 11)}>Până la examen</div>
              <div style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>{EXAM_DATE_LABEL}</div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ font: `500 42px/1 ${SERIF}`, letterSpacing: '-.02em' }}>{daysLeft}</span>
              <span style={{ font: `400 14px ${SANS}`, color: 'var(--fg2)' }}>zile</span>
            </div>
            <div style={{ marginTop: 14, font: `400 12px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
              Admiterea la UMFCD „Carol Davila”, Medicină generală.
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={cardTitle}>Unde pierzi puncte</div>
          <div style={cardSub}>Procent corect din toate răspunsurile înregistrate</div>
          {progressLoading ? (
            <EmptyState
              title="Se încarcă progresul…"
              hint="Citirea răspunsurilor tale nu blochează restul paginii."
            />
          ) : progressError ? (
            <EmptyState
              title={progressError}
              hint="Biblioteca rămâne disponibilă; poți reîncerca doar istoricul."
              action={
                <button
                  type="button"
                  className="dashed-btn"
                  onClick={() => void progressContext?.reload()}
                  style={{ padding: '10px 16px', font: `500 13px ${SANS}` }}
                >
                  Reîncearcă
                </button>
              }
            />
          ) : capitoleSlabeAfisate.length === 0 ? (
            <EmptyState
              title="Nu avem încă greșeli înregistrate"
              hint="După ce termini o sesiune, capitolele în care ai pierdut puncte apar aici."
              action={
                <button
                  type="button"
                  className="dashed-btn"
                  onClick={deschideGrile}
                  style={{ padding: '10px 16px', font: `500 13px ${SANS}` }}
                >
                  Rezolvă niște grile
                </button>
              }
            />
          ) : (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column' }}>
              {capitoleSlabeAfisate.map((c) => (
                <button
                  key={c.capId}
                  type="button"
                  className="row-btn"
                  onClick={() => goTestNou('exersare', c.capId)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderTop: '1px solid var(--line)' }}
                >
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{ display: 'block', font: `500 13.5px/1.3 ${SANS}` }}>{c.nume}</span>
                    <span style={{ display: 'block', marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                      {c.materie} · {numar(c.raspunsuri, 'răspuns', 'răspunsuri')}
                    </span>
                  </span>
                  <Progress pct={c.pct} width={84} color={c.pct < 55 ? 'var(--bad)' : 'var(--acc)'} label={`${c.nume}: ${c.pct}%`} />
                  <span style={pctPill(c.pct)}>{c.pct}%</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={cardTitle}>De recapitulat</div>
          <div style={cardSub}>Repetare inteligentă</div>
          {progressLoading ? (
            <EmptyState title="Se încarcă recapitularea…" padding="22px 12px" />
          ) : progressError ? (
            <EmptyState title="Recapitularea este indisponibilă" hint="Reîncearcă istoricul din panoul alăturat." padding="22px 12px" />
          ) : recapitulare.scadente.length > 0 ? (
            <EmptyState
              title={numar(recapitulare.scadente.length, 'grilă scadentă', 'grile scadente')}
              hint="Începe cu cea mai veche și mută răspunsurile corecte la intervalul următor."
              action={
                <button type="button" className="btn-primary tinta-tactila" onClick={() => go('recapitulare')}>
                  Începe recapitularea
                </button>
              }
              padding="22px 12px"
            />
          ) : (
            <EmptyState
              title="Ești la zi"
              hint={
                urmatoareaRecapitulare === null
                  ? 'Grilele greșite vor apărea aici pentru repetare.'
                  : `Următoarea repetare: ${DATA.format(new Date(urmatoareaRecapitulare))}.`
              }
              action={
                <button
                  type="button"
                  className="btn-ghost tinta-tactila"
                  onClick={() => go('recapitulare')}
                  style={{ padding: '11px 16px', font: `500 13.5px ${SANS}` }}
                >
                  Vezi recapitularea
                </button>
              }
              padding="22px 12px"
            />
          )}
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
              <div style={cardTitle}>Stăpânirea grilelor</div>
              <div style={cardSub}>O tendință zilnică bazată pe grile distincte, nu pe numărul de sesiuni</div>
            </div>
            <Segmented
              items={[
                { id: 'a' as Variant, label: 'Evoluție' },
                { id: 'b' as Variant, label: 'Pe capitole' },
              ]}
              value={chart}
              onChange={setChart}
              ariaLabel="Felul graficului"
            />
          </div>
          <div style={{ marginTop: 18 }}>
            {progressLoading ? (
              <EmptyState
                title="Se încarcă evoluția…"
                hint="Graficul apare imediat ce istoricul răspunsurilor este gata."
                padding="18px 16px 26px"
              />
            ) : progressError ? (
              <EmptyState title={progressError} hint="Reîncearcă din panoul de mai sus." padding="18px 16px 26px" />
            ) : chart === 'a' ? (
              <ScoreChart points={evolutieGrafic} grileDistincte={progress.grileDistincte} />
            ) : (
              <ChapterChart
                rows={capitoleGrafic}
                selectie={{ total: progress.capitole.length, criteriu: 'după numărul de răspunsuri' }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
