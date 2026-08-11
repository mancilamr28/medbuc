import { SRS_TOTAL, STUDENT } from '../data/profile';
import { EXAM_DATE_LABEL } from '../data/profile';
import { SANS, eyebrow, navDot, navItem } from '../lib/ui';
import type { Screen } from '../lib/router';
import { useApp } from '../state/AppState';
import { Logo } from './Logo';

interface NavEntry {
  id: Screen;
  label: string;
  badge?: string;
}

export function useNavGroups(): { main: NavEntry[]; sec: NavEntry[] } {
  const { role, session } = useApp();
  const ramase = session.total - Object.keys(session.revealed).length;

  return {
    main: [
      { id: 'acasa', label: 'Acasă' },
      { id: 'materii', label: 'Materii' },
      { id: 'grile', label: 'Grile', badge: ramase > 0 ? String(ramase) : undefined },
      { id: 'recapitulare', label: 'Recapitulare', badge: String(SRS_TOTAL) },
      { id: 'simulari', label: 'Simulări' },
      { id: 'statistici', label: 'Statistici' },
    ],
    sec: [
      { id: 'plan', label: 'Planul meu' },
      { id: 'notite', label: 'Notițe' },
      { id: 'setari', label: 'Profil și setări' },
      ...(role === 'admin' ? [{ id: 'admin' as Screen, label: 'Administrare' }] : []),
    ],
  };
}

export function Sidebar() {
  const { screen, go } = useApp();
  const { main, sec } = useNavGroups();

  const renderGroup = (title: string, items: NavEntry[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ ...eyebrow(), padding: '0 10px 10px' }}>{title}</div>
      {items.map((n) => {
        const active = screen === n.id;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => go(n.id)}
            aria-current={active ? 'page' : undefined}
            style={navItem(active)}
          >
            <span aria-hidden="true" style={navDot(active)} />
            {n.label}
            {n.badge && (
              <span style={{ marginLeft: 'auto', font: `600 11px ${SANS}`, color: 'var(--acc)' }}>{n.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside
      style={{
        width: 236,
        flex: '0 0 236px',
        borderRight: '1px solid var(--line)',
        background: 'var(--surf)',
        padding: '22px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        height: '100vh',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}>
        <Logo />
        <div>
          <div style={{ font: `600 16px/1 ${SANS}`, letterSpacing: '-.01em' }}>MedBuc</div>
          <div style={{ font: `400 10.5px/1.4 ${SANS}`, color: 'var(--fg3)', letterSpacing: '.04em' }}>
            UMFCD · admitere {EXAM_DATE_LABEL.slice(-4)}
          </div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 26 }} aria-label="Navigare principală">
        {renderGroup('Învățare', main)}
        {renderGroup('Contul meu', sec)}
      </nav>

      <div
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--line)',
          paddingTop: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--brandS)',
            color: 'var(--brand)',
            display: 'grid',
            placeItems: 'center',
            font: `600 13px ${SANS}`,
            flex: '0 0 auto',
          }}
        >
          {STUDENT.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="truncate" style={{ font: `600 13px/1.2 ${SANS}` }}>
            {STUDENT.name}
          </div>
          <div style={{ font: `400 11px/1.3 ${SANS}`, color: 'var(--fg3)' }}>{STUDENT.liceu}</div>
        </div>
      </div>
    </aside>
  );
}
