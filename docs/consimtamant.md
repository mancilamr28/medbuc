# CookieConsent

Integrare locală `vanilla-cookieconsent@3.1.0`, fără CDN. Configurația este în `src/lib/consimtamant.ts`; componenta independentă de autentificare oferă redeschiderea preferințelor. Pornirea este idempotentă pentru StrictMode.

- Opt-in; cookie `medbuc_consent`, limitat la calea aplicației, 182 de zile, revizia 1.
- Stocarea necesară descrie autentificarea, preferințele cerute și recuperarea lucrului. Nu ștergem datele utilizatorului când refuză diagnosticul.
- Diagnosticul apare numai când există `VITE_SENTRY_DSN`. SDK-ul Sentry se descarcă după acord. Funcția de autorizare verifică acordul valid și categoria înaintea raportării, la procesarea evenimentului și la transportul fiecărui pachet. Retragerea/expirarea blochează trimiterile viitoare; nu anulează o cerere deja pornită și nu șterge rapoarte existente.
- Fără reclame, Google Analytics, Session Replay sau performance tracing. Nu se adaugă servicii doar pentru a umple panoul de preferințe.
- Schimbarea serviciilor/scopurilor necesită actualizarea textelor, categoriei și reviziei. Verificarea legală a politicii de confidențialitate, a retenției Sentry și a clasificării stocării rămâne separată; instalarea unui banner nu garantează conformitatea juridică. Nu există jurnal de consimțământ pe server.

Referințe: https://cookieconsent.orestbida.com/essential/getting-started.html și https://cookieconsent.orestbida.com/reference/configuration-reference.html.
