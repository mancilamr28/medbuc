import {
  faCalendarDays,
  faChartLine,
  faEllipsis,
  faGear,
  faHouse,
  faListCheck,
  faNoteSticky,
  faRotateLeft,
  faShieldHalved,
  faStopwatch,
  faWandMagicSparkles,
  faXmark,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useRef, useState } from 'react';
import type { Screen } from '../lib/router';
import { mobileNavItem, SANS } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useAuth } from '../state/authState';
import { Icon } from './Icon';

interface NavMobil {
  id: Screen;
  label: string;
  icon: IconDefinition;
}

const PRINCIPALE: NavMobil[] = [
  { id: 'acasa', label: 'Acasă', icon: faHouse },
  { id: 'test-nou', label: 'Test nou', icon: faWandMagicSparkles },
  { id: 'grile', label: 'Grile', icon: faListCheck },
  { id: 'simulari', label: 'Simulări', icon: faStopwatch },
];

const IN_CURAND: NavMobil[] = [{ id: 'plan', label: 'Planul meu', icon: faCalendarDays }];

const MENU_ID = 'navigare-mobila-mai-multe';

/** Navigația de jos, pe telefon, plus destinațiile secundare într-un meniu familiar. */
export function MobileNav() {
  const { screen, go } = useApp();
  const { role } = useAuth();
  const [deschis, setDeschis] = useState(false);
  const butonMaiMulte = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);

  // Lucrarea nu are intrare nicăieri — se ajunge în ea din asistent, după id —
  // deci n-are ce aprinde. Fără excepția asta ar aprinde „Mai multe", adică ar
  // arăta spre un meniu în care nu e.
  const esteMaiMulte = !PRINCIPALE.some((n) => n.id === screen) && screen !== 'lucrare';

  useEffect(() => {
    if (!deschis) return;
    const declansator = butonMaiMulte.current;

    const elemente = () =>
      Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);

    const laTastatura = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDeschis(false);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusabile = elemente();
      const primul = focusabile[0];
      const ultimul = focusabile.at(-1);
      if (!primul || !ultimul) return;

      if (event.shiftKey && document.activeElement === primul) {
        event.preventDefault();
        ultimul.focus();
      } else if (!event.shiftKey && document.activeElement === ultimul) {
        event.preventDefault();
        primul.focus();
      }
    };

    document.addEventListener('keydown', laTastatura);
    elemente()[0]?.focus();
    return () => {
      document.removeEventListener('keydown', laTastatura);
      declansator?.focus();
    };
  }, [deschis]);

  const navigheaza = (destinatie: Screen) => {
    setDeschis(false);
    go(destinatie);
  };

  const randMeniu = ({ id, label, icon }: NavMobil) => (
    <button
      key={id}
      type="button"
      className="row-btn"
      onClick={() => navigheaza(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 12px',
        borderRadius: 10,
        color: 'var(--fg)',
        font: `500 14px ${SANS}`,
      }}
    >
      <Icon icon={icon} size={16} style={{ color: 'var(--fg3)' }} />
      {label}
    </button>
  );

  return (
    <>
      {deschis && (
        <div
          role="presentation"
          onClick={() => setDeschis(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'flex-end',
            background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
          }}
        >
          <section
            ref={dialog}
            id={MENU_ID}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${MENU_ID}-titlu`}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxHeight: '82vh',
              overflowY: 'auto',
              padding: '14px 14px 24px',
              border: '1px solid var(--line)',
              borderBottom: 0,
              borderRadius: '18px 18px 0 0',
              background: 'var(--surf)',
              boxShadow: '0 -18px 50px color-mix(in srgb, var(--bg) 60%, transparent)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 4px 10px' }}>
              <div>
                <h2 id={`${MENU_ID}-titlu`} style={{ margin: 0, font: `600 19px ${SANS}` }}>
                  Mai multe
                </h2>
                <p style={{ margin: '4px 0 0', color: 'var(--fg3)', font: `400 12.5px ${SANS}` }}>
                  Contul tău și funcțiile secundare
                </p>
              </div>
              <button
                type="button"
                className="btn-quiet"
                aria-label="Închide meniul"
                onClick={() => setDeschis(false)}
                style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', color: 'var(--fg2)' }}
              >
                <Icon icon={faXmark} size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 3 }}>
              {randMeniu({ id: 'recapitulare', label: 'Recapitulare', icon: faRotateLeft })}
              {randMeniu({ id: 'statistici', label: 'Statistici și progres', icon: faChartLine })}
              {randMeniu({ id: 'notite', label: 'Notițe', icon: faNoteSticky })}
              {randMeniu({ id: 'setari', label: 'Profil și setări', icon: faGear })}
              {role === 'admin' && randMeniu({ id: 'admin', label: 'Administrare', icon: faShieldHalved })}
            </div>

            <div style={{ height: 1, background: 'var(--line)', margin: '10px 4px 12px' }} />
            <div style={{ padding: '0 8px 7px', color: 'var(--fg3)', font: `600 10.5px ${SANS}`, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              În curând
            </div>
            <div style={{ display: 'grid', gap: 2 }}>
              {IN_CURAND.map(({ id, label, icon }) => (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 44,
                    padding: '9px 12px',
                    color: 'var(--fg3)',
                    font: `400 13.5px ${SANS}`,
                  }}
                >
                  <Icon icon={icon} size={15} />
                  <span>{label}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      padding: '3px 7px',
                      borderRadius: 99,
                      background: 'var(--surf2)',
                      font: `600 10px ${SANS}`,
                    }}
                  >
                    În curând
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

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
        {PRINCIPALE.map((n) => {
          const activ = screen === n.id;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => go(n.id)}
              aria-current={activ ? 'page' : undefined}
              style={mobileNavItem(activ)}
            >
              <Icon icon={n.icon} size={16} />
              {n.label}
            </button>
          );
        })}

        <button
          ref={butonMaiMulte}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={deschis}
          aria-controls={MENU_ID}
          aria-current={esteMaiMulte ? 'page' : undefined}
          onClick={() => setDeschis(true)}
          style={mobileNavItem(esteMaiMulte)}
        >
          <Icon icon={faEllipsis} size={16} />
          Mai multe
        </button>
      </nav>
    </>
  );
}
