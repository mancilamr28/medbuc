import { SANS } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { Logo } from './Logo';

/** Antetul lipit de marginea de sus: identitatea pe mobil și tema. */
export function Topbar({ compact }: { compact: boolean }) {
  const { theme, toggleTheme } = useApp();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
        padding: compact ? '10px 20px' : '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: compact ? 'space-between' : 'flex-end',
      }}
    >
      {compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 2 }}>
          <Logo size={28} />
          <span style={{ font: `600 14px ${SANS}` }}>MedBuc</span>
        </div>
      )}

      <button
        type="button"
        className="btn-quiet"
        onClick={toggleTheme}
        style={{ padding: '9px 12px', font: `500 12.5px ${SANS}`, whiteSpace: 'nowrap' }}
      >
        {theme === 'dark' ? 'Mod luminos' : 'Mod întunecat'}
      </button>
    </header>
  );
}
