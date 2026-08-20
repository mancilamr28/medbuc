import { EmptyState } from './EmptyState';
import { SANS } from '../lib/ui';
import { numar } from '../lib/text';
import { PRAG_RELUARE, barColor } from './chartTokens';
import { TabelGrafic } from './TabelGrafic';

export interface ChapterProgress {
  id: string;
  name: string;
  /** Procentul de răspunsuri corecte din capitol. */
  pct: number;
}

/**
 * Din câte capitole s-au ales cele afișate și după ce criteriu.
 *
 * Ambele ecrane taie lista, dar altfel: „Acasă" ia primele 8 după numărul de
 * răspunsuri, „Statistici" primele 12 de la cel mai slab. Fără nota asta,
 * graficul arată ca un clasament complet după procent, ceea ce nu e în niciunul
 * dintre cazuri.
 */
export interface SelectieCapitole {
  /** Câte capitole începute există în total. */
  total: number;
  /** Cum au fost alese, ca fragment de frază: „după numărul de răspunsuri". */
  criteriu: string;
}

/**
 * Procentul de corecte pe capitolele începute.
 *
 * Datele vin prin `rows`. Capitolele nu mai poartă un `pct` scris de mână — cât
 * timp nu există răspunsuri înregistrate, graficul spune asta, nu desenează
 * bare inventate.
 */
export function ChapterChart({
  rows,
  selectie,
}: {
  rows: readonly ChapterProgress[];
  selectie?: SelectieCapitole;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Încă nu ai capitole începute"
        hint="Rezolvă grile dintr-un capitol și aici apare procentul tău de răspunsuri corecte, capitol cu capitol."
        padding="18px 16px 26px"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingBottom: 14 }}>
      {rows.map((c) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="truncate"
            style={{ flex: '0 0 auto', width: 168, font: `400 12.5px ${SANS}`, color: 'var(--fg2)' }}
          >
            {c.name}
          </span>
          <span
            style={{
              flex: 1,
              height: 20,
              background: 'var(--surf2)',
              borderRadius: 5,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 0,
                width: `${c.pct}%`,
                background: barColor(c.pct),
                opacity: 0.85,
                borderRadius: 5,
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: `${PRAG_RELUARE}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: 'var(--fg3)',
                opacity: 0.5,
              }}
            />
          </span>
          <span
            className="tabular"
            style={{
              flex: '0 0 auto',
              width: 38,
              textAlign: 'right',
              font: `600 12.5px ${SANS}`,
              color: 'var(--fg)',
            }}
          >
            {c.pct}%
          </span>
        </div>
      ))}
      {selectie && selectie.total > rows.length && (
        <div style={{ marginTop: 4, font: `400 11.5px ${SANS}`, color: 'var(--fg2)' }}>
          Primele {rows.length} din {numar(selectie.total, 'capitol început', 'capitole începute')}, {selectie.criteriu}.
        </div>
      )}

      <div style={{ marginTop: 4, font: `400 11.5px ${SANS}`, color: 'var(--fg2)' }}>
        Linia verticală marchează {PRAG_RELUARE}%, pragul sub care recomandăm reluarea capitolului; barele care
        nu-l ating sunt colorate diferit.
      </div>

      {/*
        Coloana „Față de prag" scrie în cuvinte exact ce spune culoarea barei.
        Altfel singura formă a acelei informații e roșu-vs-albastru, adică
        nimic pentru cine nu distinge cele două. Numele capitolului apare aici
        întreg, netăiat de coloana îngustă din grafic.
      */}
      <TabelGrafic
        rezumat={`Procentul de răspunsuri corecte pe capitol, față de pragul de ${PRAG_RELUARE}%.`}
        coloane={['Capitol', 'Corecte', 'Față de prag']}
        randuri={rows.map((capitol) => ({
          id: capitol.id,
          antet: capitol.name,
          valori: [`${capitol.pct}%`, capitol.pct < PRAG_RELUARE ? 'sub prag' : 'peste prag'],
        }))}
      />
    </div>
  );
}
