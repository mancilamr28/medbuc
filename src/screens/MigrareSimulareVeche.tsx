import { useEffect, useRef, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { importaSimulareVeche } from '../lib/lucrari';
import { goLucrare, goTestNou } from '../lib/router';
import { reportError } from '../lib/sentry';
import { SANS } from '../lib/ui';
import { useApp } from '../state/appContextValue';

/**
 * Podul de o singură utilizare pentru simulările aflate în localStorage.
 *
 * Nu citește banca veche. Trimite doar instantaneul deja salvat — ordinea,
 * alegerile și marcajele — iar serverul îl transformă într-o lucrare normală.
 */
export function MigrareSimulareVeche() {
  const { sim } = useApp();
  const [eroare, setEroare] = useState(false);
  const [incercare, setIncercare] = useState(0);
  const pornita = useRef<string | null>(null);
  const run = sim.run;

  useEffect(() => {
    if (!run) {
      goTestNou('simulare');
      return;
    }
    // Hook-ul completează id-ul lucrărilor foarte vechi la montare.
    if (!run.id || pornita.current === run.id) return;

    pornita.current = run.id;
    setEroare(false);
    void importaSimulareVeche(run)
      .then(({ run_id }) => {
        sim.reset();
        goLucrare(run_id);
      })
      .catch((error: unknown) => {
        pornita.current = null;
        setEroare(true);
        reportError(error, 'Migrare simulare veche');
      });
  }, [incercare, run, sim]);

  return (
    <div className="screen">
      <div className="card" style={{ maxWidth: 520, padding: 8 }}>
        {eroare ? (
          <EmptyState
            title="Simularea ta este încă în siguranță pe acest dispozitiv"
            hint="Nu am putut s-o mutăm în cont. Verifică legătura și încearcă din nou."
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => setIncercare((n) => n + 1)}
                style={{ padding: '10px 16px', font: `600 13px ${SANS}` }}
              >
                Încearcă din nou
              </button>
            }
          />
        ) : (
          <EmptyState
            title="Mutăm simularea în contul tău…"
            hint="Ordinea, răspunsurile, marcajele și timpul rămas se păstrează."
          />
        )}
      </div>
    </div>
  );
}
