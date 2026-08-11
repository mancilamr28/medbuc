import type { Screen } from '../lib/router';
import { mobileNavDot, mobileNavItem } from '../lib/ui';
import { useApp } from '../state/AppState';

const ITEMS: { id: Screen; label: string }[] = [
  { id: 'acasa', label: 'Acasă' },
  { id: 'materii', label: 'Materii' },
  { id: 'grile', label: 'Grile' },
  { id: 'statistici', label: 'Progres' },
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
            <span aria-hidden="true" style={mobileNavDot(active)} />
            {n.label}
          </button>
        );
      })}
    </nav>
  );
}
