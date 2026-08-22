import type { StareNotita } from '../state/useNotita';
import { SANS } from '../lib/ui';

const TEXT: Record<StareNotita, string> = {
  local: 'doar pe acest dispozitiv',
  seIncarca: 'se încarcă…',
  seSalveaza: 'se salvează…',
  salvat: 'salvat pe cont',
  eroare: 'nu s-a salvat',
};

/**
 * Ce s-a întâmplat cu notița, în trei cuvinte lângă titlu.
 *
 * O notiță se salvează singură, deci fără rândul ăsta o salvare reușită și una
 * căzută arată identic — iar aici tocmai textul scris de mână e în joc. Zona e
 * `aria-live`, ca schimbarea să fie anunțată și fără să te uiți la ea.
 */
export function StareNotitaText({
  stare,
  onReincearca,
}: {
  stare: StareNotita;
  onReincearca: () => void;
}) {
  const culoare = stare === 'eroare' ? 'var(--bad)' : 'var(--fg3)';

  return (
    <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ font: `400 10.5px ${SANS}`, color: culoare, letterSpacing: '.04em' }}>
        {TEXT[stare]}
      </span>
      {stare === 'eroare' && (
        <button
          type="button"
          onClick={onReincearca}
          style={{
            border: 0,
            padding: 0,
            background: 'transparent',
            cursor: 'pointer',
            font: `600 10.5px ${SANS}`,
            color: 'var(--brand)',
          }}
        >
          Reîncearcă
        </button>
      )}
    </span>
  );
}
