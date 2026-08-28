import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { SANS } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useContentOptional } from '../state/contentState';

/**
 * Poarta dintre ecranele care nu pot funcționa fără grile și biblioteca încărcată.
 *
 * Trei stări, toate onestre despre ce se întâmplă: se încarcă, a eșuat, sau nu
 * există încă nimic scris. Fără spinner și fără bară de progres — aceeași
 * hotărâre ca la ecranul de încărcare a sesiunii din `App.tsx`: o bară care se
 * umple după un timp inventat e tot o cifră inventată.
 *
 * `Materii` și `Acasă` **nu** trec pe aici: capitolele lor sunt statice, deci pot
 * desena ceva util și fără bancă. Doar cifrele lor așteaptă.
 *
 * Poarta se uită la **bibliotecă**, niciodată la sesiune. O trecuse pe aici o
 * verificare a sesiunii de exersare, iar poarta e comună cu `Simulari`: o
 * sesiune pe un capitol rămas fără grile ar fi blocat și ecranul de simulare,
 * cu lucrarea în curs cu tot. Ce ține de bazinul unei sesiuni se decide în
 * ecranul ei.
 */
export function PoartaContinut({ children }: { children: ReactNode }) {
  const continut = useContentOptional();
  const { catalog } = useApp();

  // Fără provider de conținut nu există nici încărcare, nici eroare de anunțat —
  // banca a venit direct din `AppProvider`. Se întâmplă în testele de randare,
  // care montează un singur ecran cu o fixtură.
  const loading = continut?.loading ?? false;
  const error = continut?.error ?? null;
  const reload = continut?.reload;

  if (loading) {
    return (
      <div className="screen">
        <div className="card" style={{ padding: 26, maxWidth: 520 }}>
          <div style={{ font: `400 14px/1.6 ${SANS}`, color: 'var(--fg2)' }} aria-busy="true">
            Se încarcă biblioteca de grile…
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="screen">
        <div className="card" style={{ padding: 8, maxWidth: 520 }}>
          <EmptyState
            title={error}
            hint="Verifică legătura la internet și încearcă din nou. Nimic din ce ai lucrat nu s-a pierdut."
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => void reload?.()}
                style={{ padding: '10px 16px', font: `600 13px ${SANS}` }}
              >
                Încearcă din nou
              </button>
            }
          />
        </div>
      </div>
    );
  }

  if (catalog.length === 0) {
    return (
      <div className="screen">
        <div className="card" style={{ padding: 8, maxWidth: 520 }}>
          <EmptyState
            title="Biblioteca nu are încă nicio grilă publicată"
            hint="Grilele apar aici pe măsură ce sunt scrise și publicate din Administrare."
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
