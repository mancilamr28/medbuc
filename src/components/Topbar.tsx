import { faLightbulb, faMoon } from '@fortawesome/free-solid-svg-icons';
import { SANS } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { Icon } from './Icon';
import { Logo } from './Logo';

/** Antetul lipit de marginea de sus: identitatea pe mobil și tema. */
export function Topbar({ compact }: { compact: boolean }) {
  const { theme, toggleTheme } = useApp();
  const activeazaLuminos = theme === 'dark';
  const etichetaTema = activeazaLuminos ? 'Activează modul luminos' : 'Activează modul întunecat';

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

      {/* Fără chenar/fundal permanent — ca iconițele din Sidebar și MobileNav,
          nu ca un buton „btn-quiet" separat: culoarea vine din var(--fg2), ca
          restul navigației, iar `row-btn` dă doar starea de hover. */}
      <button
        type="button"
        className="row-btn tinta-tactila tinta-tactila--patrata"
        onClick={toggleTheme}
        aria-label={etichetaTema}
        title={etichetaTema}
        style={{
          width: 38,
          height: 38,
          padding: 0,
          borderRadius: 10,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--fg2)',
        }}
      >
        <Icon icon={activeazaLuminos ? faLightbulb : faMoon} size={17} />
      </button>
    </header>
  );
}
