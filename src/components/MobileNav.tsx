import {
  faBookOpen,
  faChartLine,
  faHouse,
  faListCheck,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import type { Screen } from '../lib/router';
import { mobileNavItem } from '../lib/ui';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';

/** Aceleași iconițe ca în bara laterală, ca cele două navigații să se recunoască. */
const ITEMS: { id: Screen; label: string; icon: IconDefinition }[] = [
  { id: 'acasa', label: 'Acasă', icon: faHouse },
  { id: 'materii', label: 'Materii', icon: faBookOpen },
  { id: 'grile', label: 'Grile', icon: faListCheck },
  { id: 'statistici', label: 'Progres', icon: faChartLine },
];

/** Navigația de jos, pe telefon. */
export function MobileNav() {
  const { screen, go } = useApp();

  return (
    <nav
      aria-label="Navigare principală"
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        background: 'var(--surf)',
        borderTop: '1px solid var(--line)',
        padding: '8px 6px',
        display: 'flex',
        gap: 2,
      }}
    >
      {ITEMS.map((n) => {
        const active = screen === n.id;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => go(n.id)}
            aria-current={active ? 'page' : undefined}
            style={mobileNavItem(active)}
          >
            <Icon icon={n.icon} size={16} />
            {n.label}
          </button>
        );
      })}
    </nav>
  );
}
