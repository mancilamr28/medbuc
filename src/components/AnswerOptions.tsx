import { SANS } from '../lib/ui';
import type { OptionKey, Question } from '../data/questions';
import type { TipGrila } from '../lib/tipuriGrile';

/**
 * Variantele de răspuns. La complementul grupat se afișează doar litera —
 * corespondența cu afirmațiile este cea fixă de la examen — dar textul rămâne
 * disponibil pentru cititoarele de ecran.
 */
export function AnswerOptions({
  question,
  tip,
  answer,
  revealed,
  onPick,
  showIcons = true,
}: {
  question: Question;
  /** Formatul grilei. Lipsă (încă neîncărcat) înseamnă randare simplă. */
  tip?: TipGrila | undefined;
  answer: OptionKey | undefined;
  revealed: boolean;
  onPick: (key: OptionKey) => void;
  showIcons?: boolean;
}) {
  // „Doar literele" e o proprietate a formatului, nu a grilei: la complementul
  // grupat textele variantelor sunt cheia fixă (A = „1, 2, 3"), deci repetarea
  // lor lângă fiecare buton e zgomot. Un tip necunoscut cade pe lista completă —
  // sărac, nu gol.
  const bare = tip?.hintRandare === 'enunturi_numerotate';

  return (
    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 9 }} role="radiogroup" aria-label="Variante de răspuns">
      {question.opts.map(([k, t]) => {
        const chosen = answer === k;
        const isCorrect = question.correct === k;

        let border = 'var(--line)';
        let bg = 'var(--surf)';
        let keyBg = 'var(--surf2)';
        let keyFg = 'var(--fg2)';
        let icon = '';
        let iconColor = 'var(--fg3)';

        if (!revealed && chosen) {
          border = 'var(--brand)';
          bg = 'var(--brandS)';
          keyBg = 'var(--brand)';
          keyFg = 'var(--onBrand)';
        }
        if (revealed && isCorrect) {
          border = 'var(--ok)';
          bg = 'var(--okS)';
          keyBg = 'var(--ok)';
          keyFg = 'var(--onBrand)';
          icon = '✓';
          iconColor = 'var(--ok)';
        }
        if (revealed && chosen && !isCorrect) {
          border = 'var(--bad)';
          bg = 'var(--badS)';
          keyBg = 'var(--bad)';
          keyFg = 'var(--onBrand)';
          icon = '✕';
          iconColor = 'var(--bad)';
        }

        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={chosen}
            disabled={revealed}
            onClick={() => onPick(k)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: bare ? '10px 14px' : '14px 16px',
              width: bare ? 'auto' : '100%',
              ...(bare ? { alignSelf: 'flex-start', minWidth: 98 } : null),
              border: `1.5px solid ${border}`,
              borderRadius: 12,
              background: bg,
              cursor: revealed ? 'default' : 'pointer',
              textAlign: 'left',
              transition: 'border-color .12s, background .12s',
            }}
          >
            <span
              style={{
                flex: '0 0 auto',
                width: 28,
                height: 28,
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                font: `600 13px ${SANS}`,
                background: keyBg,
                color: keyFg,
              }}
            >
              {k}
            </span>
            {bare ? (
              <span className="visually-hidden">{t}</span>
            ) : (
              <span style={{ flex: 1, font: `400 14.5px/1.45 ${SANS}`, textAlign: 'left' }}>{t}</span>
            )}
            {showIcons && (
              <span
                aria-hidden="true"
                style={{
                  flex: '0 0 auto',
                  width: 18,
                  textAlign: 'center',
                  font: `600 15px ${SANS}`,
                  color: iconColor,
                }}
              >
                {icon}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
