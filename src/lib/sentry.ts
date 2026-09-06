/**
 * Raportare de erori, încărcată dinamic.
 *
 * Pachetul se descarcă numai cu `VITE_SENTRY_DSN` configurat și acord valabil.
 * Retragerea acordului blochează trimiterile viitoare, inclusiv cele automate.
 *
 * Deliberat minimal, dincolo de ce arată wizard-ul de configurare al Sentry:
 * doar monitorizarea erorilor, fără Session Replay și fără urmărire de
 * performanță. Suntem în UE, cu posibili utilizatori minori — Session Replay
 * înregistrează interacțiunea reală cu pagina și ar cere consimțământ explicit
 * înainte să fie pornit. Acordul actual pentru erori nu autorizează Replay.
 */

type SentryModule = typeof import('@sentry/react');

let sentryReady: Promise<SentryModule | null> | null = null;
let permiteRaportarea: () => boolean = () => false;

/** Verificată și la trimitere: retragerea sau expirarea acordului oprește traficul. */
export function seteazaAcordDiagnostic(permite: () => boolean): void {
  permiteRaportarea = permite;
  if (permite()) initSentry();
}

/** Pornește raportarea numai dacă este configurată și există acord valabil. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || !permiteRaportarea() || sentryReady) return;

  sentryReady = import('@sentry/react').then((Sentry) => {
    if (!permiteRaportarea()) { sentryReady = null; return null; }
    Sentry.init({
      dsn, sendDefaultPii: false, environment: import.meta.env.MODE,
      beforeSend: (event) => permiteRaportarea() ? event : null,
      beforeBreadcrumb: (breadcrumb) => permiteRaportarea() ? breadcrumb : null,
      transport: (options) => {
        const transport = Sentry.makeFetchTransport(options);
        return { ...transport, send: (envelope) => permiteRaportarea() ? transport.send(envelope) : Promise.resolve({}) };
      },
    });
    return Sentry;
  }).catch(() => { sentryReady = null; return null; });
}

/**
 * Trimite o excepție prinsă. Sigur de apelat oricând — dacă raportarea nu e
 * pornită (sau pachetul încă se încarcă), nu face nimic și nu aruncă.
 */
export function reportError(error: unknown, componentStack?: string): void {
  if (!permiteRaportarea()) return;
  sentryReady
    ?.then((Sentry) => {
      if (permiteRaportarea()) Sentry?.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined);
    })
    .catch(() => {
      /* pachetul nu s-a putut încărca — nu mai e nimic de raportat */
    });
}
