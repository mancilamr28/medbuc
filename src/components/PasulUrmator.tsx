import { SANS, eyebrow } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { frazaGreseliInCoada } from './pasulUrmatorText';

/**
 * Ce poate face elevul imediat după ce a terminat ceva.
 *
 * Toate cele trei panouri de rezultat erau fundături: aflai scorul și rămâneai
 * cu „mai fă o dată" sau „înapoi acasă". Momentul de după o sesiune e exact cel
 * în care bucla ar trebui să se închidă — greșelile tocmai au intrat în coada de
 * recapitulare, iar progresul tocmai s-a mișcat — dar nimic de pe ecran nu ducea
 * acolo.
 *
 * Legătura spre recapitulare apare doar când chiar ai ce recapitula din
 * sesiunea asta: `calculeazaRecapitulare` bagă în coadă numai grilele greșite,
 * deci la zero greșeli butonul ar promite o coadă pe care sesiunea n-a
 * alimentat-o.
 */
export function PasulUrmator({ gresite }: { gresite: number }) {
  const { go } = useApp();

  return (
    <div className="card-flat" style={{ marginTop: 20, padding: 20 }}>
      <div style={eyebrow()}>Ce urmează</div>
      <p style={{ margin: '12px 0 0', font: `400 13.5px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
        {gresite > 0
          ? frazaGreseliInCoada(gresite)
          : 'N-ai greșit nicio grilă, deci n-ai ce adăuga în coada de recapitulare.'}
      </p>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {gresite > 0 && (
          <button
            type="button"
            className="btn-ghost tinta-tactila"
            onClick={() => go('recapitulare')}
            style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
          >
            Revezi greșelile →
          </button>
        )}
        <button
          type="button"
          className="btn-ghost tinta-tactila"
          onClick={() => go('statistici')}
          style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
        >
          Vezi progresul →
        </button>
      </div>
    </div>
  );
}
