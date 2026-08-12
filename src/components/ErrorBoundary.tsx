import { Component, type ErrorInfo, type ReactNode } from 'react';
import { SANS, SERIF } from '../lib/ui';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Șterge tot ce a salvat aplicația, ca o stare stricată să nu blocheze la nesfârșit. */
function resetDateLocale(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('medbuc.'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage indisponibil — reîncărcarea rămâne singura opțiune */
  }
  window.location.reload();
}

/**
 * Ultima plasă de siguranță: fără ea, orice excepție la randare lasă pagina albă,
 * iar dacă vinovată e o valoare din localStorage se repetă la fiecare reîncărcare.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[medbuc] Eroare neprinsă:', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: 'var(--bg)',
        }}
      >
        <div className="card" style={{ padding: 26, maxWidth: 460 }}>
          <h1 style={{ margin: 0, font: `500 24px/1.2 ${SERIF}`, color: 'var(--fg)' }}>
            Ceva s-a stricat
          </h1>
          <p style={{ margin: '12px 0 0', font: `400 14px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
            Aplicația a dat de o eroare din care nu și-a putut reveni. Dacă se repetă la fiecare
            reîncărcare, cel mai probabil o valoare salvată local e de vină — butonul de mai jos o
            șterge și pornește de la zero.
          </p>
          <pre
            style={{
              margin: '14px 0 0',
              padding: 12,
              borderRadius: 10,
              background: 'var(--surf2)',
              font: `400 12px/1.5 ui-monospace, monospace`,
              color: 'var(--fg3)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {error.message}
          </pre>
          <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => window.location.reload()}
              style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
            >
              Reîncarcă
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={resetDateLocale}
              style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
            >
              Șterge datele locale
            </button>
          </div>
        </div>
      </div>
    );
  }
}
