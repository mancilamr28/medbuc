import { MobileNav } from './components/MobileNav';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { useIsDesktop } from './lib/hooks';
import { BUILT_SCREENS } from './lib/router';
import { Acasa } from './screens/Acasa';
import { Admin } from './screens/Admin';
import { Grile } from './screens/Grile';
import { InLucru } from './screens/InLucru';
import { Materii } from './screens/Materii';
import { Plan } from './screens/Plan';
import { Setari } from './screens/Setari';
import { Simulari } from './screens/Simulari';
import { useApp } from './state/AppState';

function Content() {
  const { screen } = useApp();

  if (!BUILT_SCREENS.includes(screen)) return <InLucru screen={screen} />;

  switch (screen) {
    case 'materii':
      return <Materii />;
    case 'grile':
      return <Grile />;
    case 'plan':
      return <Plan />;
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
