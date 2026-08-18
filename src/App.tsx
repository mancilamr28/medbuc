import { Suspense, lazy, useEffect } from 'react';
import { LandingBoundary } from './components/LandingBoundary';
import { AttemptSync } from './components/AttemptSync';
import { MobileNav } from './components/MobileNav';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { useIsDesktop } from './lib/hooks';
import { BUILT_SCREENS, isPublicRouteHash, usePublicView, type PublicRoute } from './lib/router';
import { Acasa } from './screens/Acasa';
import { Admin } from './screens/Admin';
import { Autentificare, type ModAutentificare } from './screens/Autentificare';
import { Grile } from './screens/Grile';
import { InLucru } from './screens/InLucru';
import { Notite } from './screens/Notite';
import { Recapitulare } from './screens/Recapitulare';
import { ResetareParolaFinalizare } from './screens/ResetareParolaFinalizare';
import { Setari } from './screens/Setari';
import { Simulari } from './screens/Simulari';
import { Statistici } from './screens/Statistici';
import { useApp } from './state/appContextValue';
import { useAuth } from './state/authState';

/**
 * Pagina de prezentare e cod pe care un elev autentificat nu-l descarcă
 * niciodată: e singurul ecran cu propriul sistem vizual și propriile animații,
 * iar el nu o vede în nicio situație. `lazy` cere un export implicit, restul
 * proiectului folosește exporturi numite — traducerea se face aici.
 */
const Landing = lazy(() => import('./screens/Landing/Landing').then((m) => ({ default: m.Landing })));

/**
 * Fără niciun token Supabase salvat nu există sesiune de așteptat, deci
 * descărcarea landing-ului poate porni în paralel cu `getSession()`, nu după
 * el. Contează exact pe pagina unde contează cel mai mult.
 */
try {
  if (!Object.keys(localStorage).some((k) => k.startsWith('sb-'))) {
    void import('./screens/Landing/Landing');
  }
} catch {
  // Storage indisponibil (mod privat) — descărcarea rămâne serială, nu e o eroare.
}

const MOD_PENTRU_RUTA: Record<PublicRoute, ModAutentificare> = {
  autentificare: 'login',
  inregistrare: 'inregistrare',
  'parola-uitata': 'uitat',
};

/** Suprafața goală cât se încarcă sesiunea. */
const GOL = <div style={{ minHeight: '100vh', background: 'var(--bg)' }} aria-busy="true" aria-label="Se încarcă" />;

/**
 * Aceeași idee, dar pe fundalul închis al landing-ului: `var(--bg)` e alb în
 * tema luminoasă și ar clipi înainte de o pagină aproape neagră.
 */
const GOL_LANDING = (
  <div style={{ minHeight: '100vh', background: '#05070f' }} aria-busy="true" aria-label="Se încarcă" />
);

function Content() {
  const { screen } = useApp();

  if (!BUILT_SCREENS.includes(screen)) return <InLucru screen={screen} />;

  switch (screen) {
    case 'grile':
      return <Grile />;
    case 'recapitulare':
      return <Recapitulare />;
    case 'simulari':
      return <Simulari />;
    case 'statistici':
      return <Statistici />;
    case 'notite':
      return <Notite />;
    case 'setari':
      return <Setari />;
    case 'admin':
      return <Admin />;
    default:
      return <Acasa />;
  }
}

export function App() {
  const isDesktop = useIsDesktop();
  const { loading, user, recovery } = useAuth();
  const publicView = usePublicView(); // înaintea oricărui return timpuriu

  // După autentificare hash-ul poate fi încă `#/inregistrare` — o rută care nu e
  // `Screen`, deci `useHashRoute` e deja pe `acasa` și shell-ul e corect, doar
  // bara de adrese minte. `replaceState` nu declanșează `hashchange`, deci nu
  // provoacă un render în plus.
  const hashPublic = user !== null && isPublicRouteHash();
  useEffect(() => {
    if (hashPublic) window.history.replaceState(null, '', '#/acasa');
  }, [hashPublic]);

  if (loading) return GOL;
  if (recovery) return <ResetareParolaFinalizare />;
  if (!user) {
    if (publicView === 'landing') {
      return (
        <LandingBoundary fallback={<Autentificare />}>
          <Suspense fallback={GOL_LANDING}>
            <Landing />
          </Suspense>
        </LandingBoundary>
      );
    }
    // `key` remontează formularul când ruta publică se schimbă fără demontare:
    // `modInitial` e citit doar la montare.
    return <Autentificare key={publicView} modInitial={MOD_PENTRU_RUTA[publicView]} />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh' }}>
      <AttemptSync />
      {isDesktop && <Sidebar />}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Topbar compact={!isDesktop} />
        <div style={{ flex: 1, padding: '26px 20px 60px' }}>
          <div style={{ maxWidth: 1180, margin: '0 auto' }}>
            <Content />
          </div>
        </div>
        {!isDesktop && <MobileNav />}
      </main>
    </div>
  );
}
