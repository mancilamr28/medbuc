import { useEffect, useRef } from 'react';
import { syncFinishedSession } from '../lib/syncAttempts';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthContext';

/** Sincronizează sesiunea doar după finalizare, fără să blocheze rezolvarea. */
export function AttemptSync() {
  const { session } = useApp();
  const { user } = useAuth();
  const sincronizata = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !session.finished || sincronizata.current === session.id) return;
    sincronizata.current = session.id;
    void syncFinishedSession(user.id, session, session.finishedAt ?? Date.now()).catch((error: unknown) => {
      sincronizata.current = null;
      console.warn('[medbuc] Nu am putut sincroniza sesiunea.', error);
    });
  }, [session, user]);

  return null;
}
