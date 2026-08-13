/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * DSN-ul de Sentry. Opțional: fără el, `initSentry()` nu pornește nimic —
   * vezi src/lib/sentry.ts. Se pune în `.env.local` (ignorat de git) local,
   * și ca secret de build în CI/deploy.
   */
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
