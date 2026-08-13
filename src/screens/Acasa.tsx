import { ChapterChart } from '../components/ChapterChart';
import { EmptyState } from '../components/EmptyState';
import { ScoreChart } from '../components/ScoreChart';
import { Segmented } from '../components/Segmented';
import { QUESTIONS } from '../data/questions';
import { EXAM_DATE, EXAM_DATE_LABEL } from '../data/profile';
import { usePersistentState } from '../lib/hooks';
import { numar, primulNume } from '../lib/text';
import { daysUntil } from '../lib/time';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle } from '../lib/ui';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthContext';

type Variant = 'a' | 'b';

const cardTitle = { font: `600 15px/1.2 ${SANS}` } as const;
const cardSub = { marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' } as const;

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
  const { go, session } = useApp();
  const { user, profile } = useAuth();
  const [chart, setChart] = usePersistentState<Variant>('medbuc.chart', 'a');

  const daysLeft = daysUntil(EXAM_DATE);
  const raspunse = Object.keys(session.answers).length;
  const inSesiune = raspunse > 0 && !session.finished;
  const prenume = primulNume(profile?.fullName ?? null, user?.email ?? '');

  return (
    <div className="screen">
      <div style={{ marginBottom: 22 }}>
        <h1 style={pageTitle}>Bună, {prenume}</h1>
        <p style={pageLead}>
          Mai sunt {numar(daysLeft, 'zi', 'zile')} până la examen. Biblioteca are{' '}
          {numar(QUESTIONS.length, 'grilă', 'grile')} scrise deocamdată.
        </p>
      </div>

      <div style={{ ...autoGrid(290), alignItems: 'start' }}>
        <div style={{ gridColumn: '1/-1', ...autoGrid(280) }}>
          <div className="card hero-card" style={{ padding: 24 }}>
            <div style={eyebrow('var(--acc)', 11)}>{inSesiune ? 'Continuă' : 'Începe'}</div>
            <div style={{ marginTop: 12, font: `400 23px/1.25 ${SERIF}` }}>
              {inSesiune ? 'Sesiunea ta de grile' : 'O sesiune de grile'}
            </div>
            <div style={{ marginTop: 6, font: `400 13.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
              {inSesiune
                ? `Ai răspuns la ${raspunse} din ${session.total} grile.`
                : 'Fără limită de timp, cu explicații după fiecare răspuns.'}
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => go('grile')}
                style={{ padding: '12px 18px', font: `600 14px ${SANS}` }}
              >
                {inSesiune ? 'Reia sesiunea →' : 'Începe o sesiune →'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => go('materii')}
                style={{ padding: '12px 16px', font: `500 14px ${SANS}` }}
              >
                Vezi capitolele
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
          <div style={cardSub}>Capitolele cu cele mai multe greșeli</div>
          <EmptyState
            title="Nu avem încă destule răspunsuri"
            hint="După câteva sesiuni apar aici capitolele la care greșești cel mai des, cu procentul tău pe fiecare."
            action={
              <button
                type="button"
                className="dashed-btn"
                onClick={() => go('grile')}
                style={{ padding: '10px 16px', font: `500 13px ${SANS}` }}
              >
                Rezolvă niște grile
              </button>
            }
          />
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={cardTitle}>De recapitulat</div>
          <div style={cardSub}>Repetare inteligentă</div>
          <EmptyState
            title="Recapitularea nu e gata încă"
            hint="Grilele la care greșești vor reveni la intervale calculate, ca să le prinzi înainte de examen."
          />
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
            {chart === 'a' ? <ScoreChart scores={[]} labels={[]} /> : <ChapterChart rows={[]} />}
          </div>
        </div>
      </div>
    </div>
  );
}
