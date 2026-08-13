import { MobileNav } from './components/MobileNav';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { useIsDesktop } from './lib/hooks';
import { BUILT_SCREENS } from './lib/router';
import { Acasa } from './screens/Acasa';
import { Admin } from './screens/Admin';
import { Autentificare } from './screens/Autentificare';
import { Grile } from './screens/Grile';
import { InLucru } from './screens/InLucru';
import { Materii } from './screens/Materii';
import { ResetareParolaFinalizare } from './screens/ResetareParolaFinalizare';
import { Setari } from './screens/Setari';
import { Simulari } from './screens/Simulari';
import { useApp } from './state/AppState';
import { useAuth } from './state/AuthContext';

function Content() {
  const { screen } = useApp();

  if (!BUILT_SCREENS.includes(screen)) return <InLucru screen={screen} />;

  switch (screen) {
    case 'materii':
      return <Materii />;
    case 'grile':
      return <Grile />;
    case 'simulari':
      return <Simulari />;
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

  if (loading) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} aria-busy="true" aria-label="Se încarcă" />;
  }
  if (recovery) return <ResetareParolaFinalizare />;
  if (!user) return <Autentificare />;

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '100vh' }}>
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
