import { useEffect, useRef } from 'react';
import { syncFinishedSession } from '../lib/syncAttempts';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthContext';
import { useProgressOptional } from '../state/progressState';

/** Sincronizează sesiunea doar după finalizare, fără să blocheze rezolvarea. */
export function AttemptSync() {
  const { session } = useApp();
  const { user } = useAuth();
  const progress = useProgressOptional();
  const sincronizata = useRef<string | null>(null);

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

  return null;
}
