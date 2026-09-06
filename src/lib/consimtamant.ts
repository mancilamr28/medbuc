import * as CookieConsent from 'vanilla-cookieconsent';
import { seteazaAcordDiagnostic } from './sentry';

export function configuratieConsimtamant(diagnostic: boolean): CookieConsent.CookieConsentConfig {
  const aplica = () => seteazaAcordDiagnostic(() => diagnostic && CookieConsent.validConsent() && CookieConsent.acceptedCategory('diagnostic'));
  return {
    mode: 'opt-in', revision: 1,
    cookie: { name: 'medbuc_consent', path: import.meta.env.BASE_URL, expiresAfterDays: 182, sameSite: 'Lax' },
    guiOptions: {
      consentModal: { layout: 'cloud inline', position: 'bottom center', equalWeightButtons: true },
      preferencesModal: { layout: 'box', equalWeightButtons: true },
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      ...(diagnostic ? { diagnostic: { enabled: false } } : {}),
    },
    onConsent: aplica, onChange: aplica,
    language: { default: 'ro', translations: { ro: {
      consentModal: {
        title: 'Tu alegi ce permiți',
        description: diagnostic
          ? 'MedBuc folosește stocare în browser pentru autentificare, preferințe și recuperarea lucrului tău. Cu acordul tău, trimitem și rapoarte tehnice de eroare prin Sentry. Nu folosim reclame sau înregistrarea sesiunii.'
          : 'MedBuc folosește stocare în browser pentru autentificare, preferințe și recuperarea lucrului tău. Raportarea opțională a erorilor nu este configurată în această versiune. Nu folosim reclame sau înregistrarea sesiunii.',
        acceptAllBtn: diagnostic ? 'Acceptă toate' : 'Am înțeles',
        ...(diagnostic ? { acceptNecessaryBtn: 'Doar necesare' } : {}),
        showPreferencesBtn: 'Alege preferințele',
      },
      preferencesModal: {
        title: 'Confidențialitate și stocare',
        acceptAllBtn: diagnostic ? 'Acceptă toate' : 'Am înțeles',
        ...(diagnostic ? { acceptNecessaryBtn: 'Doar necesare' } : {}),
        savePreferencesBtn: 'Salvează preferințele', closeIconLabel: 'Închide',
        sections: [
          { title: 'Alegerea ta', description: 'Poți reveni oricând prin butonul „Preferințe cookie” de la finalul paginii. Refuzul raportării opționale nu blochează accesul la întrebări sau teste.' },
          { title: 'Funcționarea aplicației', linkedCategory: 'necessary', description: 'Păstrăm sesiunea de autentificare, tema, setările cerute de tine și datele locale de recuperare a notițelor sau formularelor. Acestea folosesc în principal localStorage. Cookie-ul medbuc_consent reține alegerea ta timp de 182 de zile. Refuzul opțiunilor nu șterge contul sau lucrul salvat.' },
          ...(diagnostic ? [{ title: 'Rapoarte tehnice de eroare (Sentry)', linkedCategory: 'diagnostic', description: 'Opțional. Ne ajută să identificăm problemele aplicației. Rapoartele pot include detalii tehnice despre eroare, pagină și browser. Nu activăm Session Replay, reclame sau monitorizarea performanței. Retragerea acordului oprește trimiterile viitoare; nu șterge rapoartele deja trimise.' }] : []),
        ],
      },
    } } },
  };
}

let pornire: Promise<void> | undefined;
export function pornesteConsimtamant(): Promise<void> {
  if (!pornire) pornire = CookieConsent.run(configuratieConsimtamant(Boolean(import.meta.env.VITE_SENTRY_DSN)))
    .catch((e: unknown) => { pornire = undefined; throw e; });
  return pornire;
}
export async function arataPreferinteCookie(): Promise<void> {
  await pornesteConsimtamant();
  CookieConsent.showPreferences();
}
