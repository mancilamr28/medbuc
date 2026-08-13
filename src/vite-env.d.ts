/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * DSN-ul de Sentry. Opțional: fără el, `initSentry()` nu pornește nimic —
   * vezi src/lib/sentry.ts. Se pune în `.env.local` (ignorat de git) local,
   * și ca secret de build în CI/deploy.
   */
  readonly VITE_SENTRY_DSN?: string;

  /** URL-ul proiectului Supabase, ex. `https://xyz.supabase.co`. Obligatoriu de la Faza 3. */
  readonly VITE_SUPABASE_URL: string;

  /** Cheia publishable a proiectului (Settings > API) — publică prin design, protejată de RLS. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
