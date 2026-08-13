/**
 * Raportare de erori, încărcată dinamic.
 *
 * `@sentry/react` adaugă ~30 KB gzip la bundle — cost pe care nu are sens să-l
 * plătească nimeni fără `VITE_SENTRY_DSN` configurat (orice PR, orice
 * dezvoltare locală fără cheie). `import()` face pachetul să nu fie nici măcar
 * descărcat în acele cazuri; când DSN-ul există, se încarcă asincron, fără să
 * blocheze prima randare.
 *
 * Deliberat minimal, dincolo de ce arată wizard-ul de configurare al Sentry:
 * doar monitorizarea erorilor, fără Session Replay și fără urmărire de
 * performanță. Suntem în UE, cu posibili utilizatori minori — Session Replay
 * înregistrează interacțiunea reală cu pagina și ar cere consimțământ explicit
 * înainte să fie pornit, nu activat tăcut la instalare. Se poate adăuga mai
 * târziu, cu consimțământul din Faza 7, nu acum.
 */

type SentryModule = typeof import('@sentry/react');

let sentryReady: Promise<SentryModule> | null = null;

/** Pornește raportarea, dacă e configurată. Fără efect altfel. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  sentryReady = import('@sentry/react').then((Sentry) => {
    Sentry.init({ dsn, sendDefaultPii: false, environment: import.meta.env.MODE });
    return Sentry;
  });
}

/**
 * Trimite o excepție prinsă. Sigur de apelat oricând — dacă raportarea nu e
 * pornită (sau pachetul încă se încarcă), nu face nimic și nu aruncă.
 */
export function reportError(error: unknown, componentStack?: string): void {
  sentryReady
    ?.then((Sentry) => {
      Sentry.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined);
    })
    .catch(() => {
      /* pachetul nu s-a putut încărca — nu mai e nimic de raportat */
    });
}
