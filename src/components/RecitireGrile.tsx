import { useMemo, useState } from 'react';
import { AnswerOptions } from './AnswerOptions';
import { Segmented } from './Segmented';
import { questionCap, questionMaterie, type OptionKey, type Question } from '../data/questions';
import { SANS, SERIF, eyebrow, statusChip } from '../lib/ui';

/** O poziție dintr-o lucrare predată, gata de recitit. */
export interface GrilaRecitita {
  pozitie: number;
  /** `null` când grila a fost retrasă din bibliotecă după predare. */
  question: Question | null;
  ales: OptionKey | null;
}

type Filtru = 'gresite' | 'toate';

/**
 * Recitirea unei lucrări: ce s-a bifat, ce era corect și de ce.
 *
 * Aceeași listă servește panoul de rezultat de după predare și lucrarea
 * redeschisă din istoric — două ecrane care arătau aceeași informație n-aveau
 * de ce s-o deseneze de două ori.
 */
export function RecitireGrile({ grile }: { grile: readonly GrilaRecitita[] }) {
  const [filtru, setFiltru] = useState<Filtru>('gresite');

  const vizibile = useMemo(
    () => grile.filter((g) => filtru === 'toate' || g.ales !== g.question?.correct),
    [filtru, grile],
  );

  return (
    <div className="card" style={{ padding: 26, marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={eyebrow()}>Recitește grilele</div>
        </div>
        <Segmented
          items={[
            { id: 'gresite' as Filtru, label: 'Ce am ratat' },
            { id: 'toate' as Filtru, label: 'Toate' },
          ]}
          value={filtru}
          onChange={setFiltru}
          ariaLabel="Ce grile să apară în recitire"
        />
      </div>

      {vizibile.length === 0 ? (
        <p style={{ margin: '18px 0 0', font: `400 14px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
          Nimic de recitit: ai răspuns corect la toate grilele.
        </p>
      ) : (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {vizibile.map(({ pozitie, question, ales }) => {
            // Grilă retrasă din bibliotecă după ce lucrarea a fost dată.
            // Se arată locul ei, nu se sare: altfel numerotarea din recitire
            // n-ar mai corespunde cu cea din timpul examenului.
            if (!question) {
              return (
                <div key={pozitie} className="card-flat" style={{ padding: 18 }}>
                  <span className="tabular" style={{ font: `500 12px ${SANS}`, color: 'var(--fg3)' }}>
                    Grila {pozitie + 1}
                  </span>
                  <p style={{ margin: '10px 0 0', font: `400 13.5px/1.6 ${SANS}`, color: 'var(--fg3)' }}>
                    Grila asta nu mai e în bibliotecă, deci nu poate fi recitită. Punctajul
                    lucrării a rămas cel de la predare.
                  </p>
                </div>
              );
            }

            const stare: [string, string, string] =
              ales === null
                ? ['Fără răspuns', 'var(--surf3)', 'var(--fg3)']
                : ales === question.correct
                  ? ['Corect', 'var(--okS)', 'var(--ok)']
                  : ['Greșit', 'var(--badS)', 'var(--bad)'];

            return (
              <div key={pozitie} className="card-flat" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="tabular" style={{ font: `500 12px ${SANS}`, color: 'var(--fg3)' }}>
                    Grila {pozitie + 1}
                  </span>
                  <span style={{ ...statusChip(stare[1], stare[2]) }}>{stare[0]}</span>
                  <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                    {questionMaterie(question)} · {questionCap(question)}
                  </span>
                </div>

                <p style={{ margin: '12px 0 0', font: `400 16px/1.45 ${SERIF}`, textWrap: 'pretty' }}>
                  {question.text}
                </p>

                <AnswerOptions question={question} answer={ales ?? undefined} revealed onPick={() => {}} />

                <p
                  style={{
                    margin: '14px 0 0',
                    font: `400 13.5px/1.6 ${SANS}`,
                    color: 'var(--fg2)',
                    textWrap: 'pretty',
                  }}
                >
                  {question.expl}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
