import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { EXAM_DATE, EXAM_DATE_LABEL } from '../data/profile';
import { daysUntil } from '../lib/time';
import { initialeDin } from '../lib/text';
import { SANS, eyebrow } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useAuth } from '../state/authState';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { useNavGroups, type NavEntry } from './useNavGroups';

export function Sidebar() {
  const { screen, go } = useApp();
  const { user, profile } = useAuth();
  const { main, sec } = useNavGroups();
  const zileRamase = daysUntil(EXAM_DATE);
  const nume = profile?.fullName || user?.email || 'Contul meu';
  const initiale = initialeDin(profile?.fullName ?? null, user?.email ?? '?');

  const renderGroup = (title: string, items: NavEntry[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ ...eyebrow(), padding: '0 10px 10px' }}>{title}</div>
      {items.map((n) => {
        const active = screen === n.id;
        return (
          <button
            key={n.id}
            type="button"
            className="nav-item"
            onClick={() => go(n.id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon icon={n.icon} className="nav-item__icon" size={15} />
            {n.label}
            {n.badge && <span className="nav-badge">{n.badge}</span>}
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
        gap: 22,
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

      {/* Numărătoarea e singura cifră reală din bară, deci merită să se vadă. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 7,
          padding: '11px 12px',
          borderRadius: 11,
          background: 'var(--brandS)',
          border: '1px solid var(--brandS2)',
        }}
      >
        <span className="tabular" style={{ font: `600 19px/1 ${SANS}`, color: 'var(--brand)' }}>
          {zileRamase}
        </span>
        <span style={{ font: `400 11.5px/1.3 ${SANS}`, color: 'var(--fg2)' }}>
          {zileRamase === 1 ? 'zi până la examen' : 'zile până la examen'}
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 22 }} aria-label="Navigare principală">
        {renderGroup('Învățare', main)}
        {renderGroup('Contul meu', sec)}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <button
          type="button"
          className="user-card"
          onClick={() => go('setari')}
          aria-label={`Profilul lui ${nume} · deschide setările`}
        >
          <span
            aria-hidden="true"
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
            {initiale}
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="truncate" style={{ display: 'block', font: `600 13px/1.2 ${SANS}`, color: 'var(--fg)' }}>
              {nume}
            </span>
            <span
              className="truncate"
              style={{ display: 'block', font: `400 11px/1.3 ${SANS}`, color: 'var(--fg3)' }}
            >
              {user?.email}
            </span>
          </span>
          <Icon icon={faChevronRight} className="user-card__chevron" size={11} />
        </button>
      </div>
    </aside>
  );
}
