import type { ReactNode } from 'react';
import { SANS } from '../lib/ui';

/**
 * Ce se afișează acolo unde încă nu există date.
 *
 * Regula pe care o servește: dacă o cifră nu poate fi calculată din ce a făcut
 * elevul, nu se afișează. Un panou gol care spune ce trebuie făcut e mai util
 * decât un procent inventat — și, spre deosebire de el, nu induce în eroare.
 */
export function EmptyState({
  title,
  hint,
  action,
  padding = '30px 22px',
}: {
  title: string;
  /** Ce are de făcut elevul ca să apară date aici. */
  hint?: string;
  action?: ReactNode;
  padding?: number | string;
}) {
  return (
    <div style={{ padding, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9 }}>
      <div style={{ font: `500 13.5px/1.4 ${SANS}`, color: 'var(--fg2)', textAlign: 'center' }}>{title}</div>
      {hint && (
        <div
          style={{
            font: `400 12.5px/1.55 ${SANS}`,
            color: 'var(--fg3)',
            textAlign: 'center',
            maxWidth: 320,
          }}
        >
          {hint}
        </div>
      )}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  );
}
