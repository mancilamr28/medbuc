import { useEffect, useRef, useState } from 'react';
import { syncFinishedSession } from '../lib/syncAttempts';
import { syncFinishedRecapitulare } from '../lib/syncRecapitulare';
import { SANS } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useAuth } from '../state/authState';
import { useProgressOptional } from '../state/progressState';

/** Sincronizează sesiunea doar după finalizare, fără să blocheze rezolvarea. */
export function AttemptSync() {
  const { session, recapitulare } = useApp();
  const { user } = useAuth();
  const progress = useProgressOptional();
  const reloadProgress = progress?.reload;
  const sincronizata = useRef<string | null>(null);
  const recapitulareSincronizata = useRef<string | null>(null);
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
