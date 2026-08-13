import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { SANS } from '../lib/ui';

export type ToastKind = 'succes' | 'eroare' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastValue {
  /** Anunță reușita sau eșecul unei acțiuni. Dispare singur după câteva secunde. */
  notify: (kind: ToastKind, message: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

const DURATA_MS = 4500;

const STIL: Record<ToastKind, { icon: typeof faCircleCheck; culoare: string; fundal: string }> = {
  succes: { icon: faCircleCheck, culoare: 'var(--ok)', fundal: 'var(--okS)' },
  eroare: { icon: faCircleExclamation, culoare: 'var(--bad)', fundal: 'var(--badS)' },
  info: { icon: faCircleInfo, culoare: 'var(--brand)', fundal: 'var(--brandS)' },
};

/**
 * Singurul mecanism prin care aplicația spune că o acțiune a reușit sau a
 * eșuat. Până acum nu exista niciunul — un „Salvează" din Admin sau o predare
 * de lucrare nu aveau cum să confirme sau să anunțe un eșec, dincolo de starea
 * vizibilă direct pe ecran.
 *
 * Separat de `AppState`, ca notificările tranzitorii să nu treacă prin același
 * context cu starea de durată lungă a aplicației.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (kind: ToastKind, message: string) => {
      const id = (idRef.current += 1);
      setToasts((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), DURATA_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxWidth: 360,
          width: 'calc(100vw - 40px)',
        }}
      >
        {toasts.map((t) => {
          const stil = STIL[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === 'eroare' ? 'alert' : 'status'}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '13px 14px',
                animation: 'mbIn 0.22s ease both',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flex: '0 0 auto',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: stil.fundal,
                  color: stil.culoare,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon icon={stil.icon} size={13} />
              </span>
              <span style={{ flex: 1, minWidth: 0, font: `500 13px/1.4 ${SANS}`, color: 'var(--fg)' }}>
                {t.message}
              </span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Închide"
                style={{
                  flex: '0 0 auto',
                  border: 0,
                  background: 'transparent',
                  color: 'var(--fg3)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon icon={faXmark} size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast trebuie folosit în interiorul <ToastProvider>');
  return ctx;
}
