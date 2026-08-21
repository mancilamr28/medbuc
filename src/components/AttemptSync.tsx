import { useCallback, useEffect, useRef, useState } from 'react';
import { reportError } from '../lib/sentry';
import { syncFinishedSession } from '../lib/syncAttempts';
import { syncFinishedRecapitulare } from '../lib/syncRecapitulare';
import { syncFinishedSimulare } from '../lib/syncSimulare';
import { SANS } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useAuth } from '../state/authState';
import { useProgressOptional } from '../state/progressState';

type Fel = 'sesiune' | 'simulare' | 'recapitulare';

/** Ce anume nu s-a salvat, spus în cuvintele ecranului de unde vine. */
const MESAJ: Record<Fel, string> = {
  sesiune: 'Sesiunea nu a fost salvată.',
  simulare: 'Simularea nu a fost salvată.',
  recapitulare: 'Recapitularea nu a fost salvată.',
};

/**
 * Scrie în jurnal ce s-a terminat — sesiune, simulare sau recapitulare — și
 * spune când n-a reușit.
 *
 * Cele trei căi erau tratate diferit fără niciun motiv: recapitularea avea card
 * de reîncercare, iar sesiunea și simularea doar un `console.warn`. Un elev
 * termina o sesiune, își vedea scorul, pleca de pe ecran — și răspunsurile nu
 * existau nicăieri, fără ca ceva să i-o spună. Acum toate trei folosesc aceeași
 * stare de eșec, același card și același buton de reîncercare.
 *
 * Eșecurile ajung și la `reportError`: până acum Sentry vedea doar căderile de
 * randare, deci o respingere RLS sau o cădere de rețea era invizibilă.
 */
export function AttemptSync() {
  const { session, recapitulare, sim, questions } = useApp();
  const { user } = useAuth();
  const progress = useProgressOptional();
  const reloadProgress = progress?.reload;

  const sesiuneSincronizata = useRef<string | null>(null);
  const simulareSincronizata = useRef<string | null>(null);
  const recapitulareSincronizata = useRef<string | null>(null);

  const [esecuri, setEsecuri] = useState<Partial<Record<Fel, true>>>({});
  // Bumpat de „Reîncearcă": intră în dependențele tuturor efectelor, deci le
  // repornește pe cele care și-au eliberat referința la eșec.
  const [incercare, setIncercare] = useState(0);

  const marcheaza = useCallback((fel: Fel, reusit: boolean, error?: unknown) => {
    setEsecuri((prev) => {
      if (reusit) {
        if (!prev[fel]) return prev;
        const { [fel]: _scos, ...rest } = prev;
        return rest;
      }
      return prev[fel] ? prev : { ...prev, [fel]: true };
    });
    if (!reusit) {
      reportError(error, `AttemptSync: ${fel}`);
      console.warn(`[medbuc] Nu am putut sincroniza: ${fel}.`, error);
    }
  }, []);

  /**
   * `run.order` ține id-uri, deci răspunsurile au nevoie de banca încărcată ca
   * să afle grila de pe fiecare poziție.
   *
   * Ținut în ref, nu în dependențele efectului: sincronizarea se face când s-a
   * încheiat ceva sau când elevul cere o reîncercare, nu când se schimbă
   * identitatea bibliotecii. Cu harta în dependențe, o reîncărcare de conținut
   * repornea efectul după un eșec și reîncerca de la sine — iar dacă a doua
   * încercare mergea, cardul dispărea fără ca elevul să-l fi văzut vreodată.
   */
  const byIdRef = useRef(new Map(questions.map((q) => [q.id, q])));
  useEffect(() => {
    byIdRef.current = new Map(questions.map((q) => [q.id, q]));
  }, [questions]);

  useEffect(() => {
    if (!user || !session.finished || sesiuneSincronizata.current === session.id) return;
    sesiuneSincronizata.current = session.id;
    void syncFinishedSession(user.id, session, session.finishedAt ?? Date.now())
      .then(() => {
        marcheaza('sesiune', true);
        return reloadProgress?.();
      })
      .catch((error: unknown) => {
        sesiuneSincronizata.current = null;
        marcheaza('sesiune', false, error);
      });
  }, [incercare, marcheaza, reloadProgress, session, user]);

  /**
   * Lucrarea de simulare, la predare sau la expirare. `sim.finishedAt` vine din
   * hook, nu se deduce iar aici: o lucrare încheiată de cronometru trebuie
   * salvată exact ca una predată de mână.
   */
  useEffect(() => {
    const run = sim.run;
    if (!user || !run || !run.id || sim.finishedAt === null) return;
    if (simulareSincronizata.current === run.id) return;
    simulareSincronizata.current = run.id;
    void syncFinishedSimulare(user.id, run, sim.finishedAt, byIdRef.current)
      .then(() => {
        marcheaza('simulare', true);
        return reloadProgress?.();
      })
      .catch((error: unknown) => {
        simulareSincronizata.current = null;
        marcheaza('simulare', false, error);
      });
  }, [incercare, marcheaza, reloadProgress, sim.finishedAt, sim.run, user]);

  useEffect(() => {
    if (!user || recapitulare.phase !== 'rezultat' || recapitulareSincronizata.current === recapitulare.id) return;
    recapitulareSincronizata.current = recapitulare.id;
    void syncFinishedRecapitulare(user.id, recapitulare, recapitulare.finishedAt ?? Date.now())
      .then(() => {
        marcheaza('recapitulare', true);
        return reloadProgress?.();
      })
      .catch((error: unknown) => {
        recapitulareSincronizata.current = null;
        marcheaza('recapitulare', false, error);
      });
  }, [incercare, marcheaza, recapitulare, reloadProgress, user]);

  const nereusite = (Object.keys(esecuri) as Fel[]).filter((fel) => esecuri[fel]);
  if (nereusite.length === 0) return null;

  return (
    <div
      role="alert"
      className="card"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 65,
        width: 'min(380px, calc(100vw - 40px))',
        padding: 14,
        font: `500 13px/1.45 ${SANS}`,
      }}
    >
      {nereusite.map((fel) => (
        <div key={fel}>{MESAJ[fel]}</div>
      ))}
      <div style={{ marginTop: 6, font: `400 12.5px/1.45 ${SANS}`, color: 'var(--fg2)' }}>
        Verifică legătura și încearcă din nou. Răspunsurile rămân pe acest dispozitiv până reușește.
      </div>
      <button
        type="button"
        className="btn-ghost tinta-tactila"
        onClick={() => setIncercare((valoare) => valoare + 1)}
        style={{ marginTop: 10 }}
      >
        Reîncearcă salvarea
      </button>
    </div>
  );
}
