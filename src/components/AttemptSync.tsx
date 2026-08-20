import { useEffect, useMemo, useRef, useState } from 'react';
import { syncFinishedSession } from '../lib/syncAttempts';
import { syncFinishedRecapitulare } from '../lib/syncRecapitulare';
import { syncFinishedSimulare } from '../lib/syncSimulare';
import { SANS } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useAuth } from '../state/authState';
import { useProgressOptional } from '../state/progressState';

/** Sincronizează sesiunea doar după finalizare, fără să blocheze rezolvarea. */
export function AttemptSync() {
  const { session, recapitulare, sim, questions } = useApp();
  const { user } = useAuth();
  const progress = useProgressOptional();
  const reloadProgress = progress?.reload;
  const sincronizata = useRef<string | null>(null);
  const recapitulareSincronizata = useRef<string | null>(null);
  const simulareSincronizata = useRef<string | null>(null);

  // `run.order` ține id-uri, deci răspunsurile au nevoie de banca încărcată ca
  // să afle grila de pe fiecare poziție.
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const [eroareRecapitulare, setEroareRecapitulare] = useState<string | null>(null);
  const [incercareRecapitulare, setIncercareRecapitulare] = useState(0);

  useEffect(() => {
    if (!user || !session.finished || sincronizata.current === session.id) return;
    sincronizata.current = session.id;
    void syncFinishedSession(user.id, session, session.finishedAt ?? Date.now())
      .then(() => progress?.reload())
      .catch((error: unknown) => {
        sincronizata.current = null;
        console.warn('[medbuc] Nu am putut sincroniza sesiunea.', error);
      });
  }, [progress, session, user]);

  /**
   * Lucrarea de simulare, la predare sau la expirare.
   *
   * `sim.finishedAt` vine din hook, nu se deduce iar aici: expirarea încheie
   * lucrarea fără s-o piardă, iar a doua deducere a regulii ar fi putut ajunge
   * să difere de cea după care ecranul arată rezultatul.
   */
  useEffect(() => {
    const run = sim.run;
    if (!user || !run || !run.id || sim.finishedAt === null) return;
    if (simulareSincronizata.current === run.id) return;
    simulareSincronizata.current = run.id;
    void syncFinishedSimulare(user.id, run, sim.finishedAt, byId)
      .then(() => reloadProgress?.())
      .catch((error: unknown) => {
        simulareSincronizata.current = null;
        console.warn('[medbuc] Nu am putut sincroniza simularea.', error);
      });
  }, [byId, reloadProgress, sim.finishedAt, sim.run, user]);

  useEffect(() => {
    if (!user || recapitulare.phase !== 'rezultat' || recapitulareSincronizata.current === recapitulare.id) return;
    recapitulareSincronizata.current = recapitulare.id;
    void syncFinishedRecapitulare(
      user.id,
      recapitulare,
      recapitulare.finishedAt ?? Date.now(),
    )
      .then(() => {
        setEroareRecapitulare(null);
        return reloadProgress?.();
      })
      .catch((error: unknown) => {
        recapitulareSincronizata.current = null;
        setEroareRecapitulare('Recapitularea nu a fost salvată. Verifică legătura și încearcă din nou.');
        console.warn('[medbuc] Nu am putut sincroniza recapitularea.', error);
      });
  }, [incercareRecapitulare, recapitulare, reloadProgress, user]);

  if (!eroareRecapitulare || recapitulare.phase !== 'rezultat') return null;

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
      <div>{eroareRecapitulare}</div>
      <button
        type="button"
        className="btn-ghost tinta-tactila"
        onClick={() => setIncercareRecapitulare((valoare) => valoare + 1)}
        style={{ marginTop: 10 }}
      >
        Reîncearcă salvarea
      </button>
    </div>
  );
}
