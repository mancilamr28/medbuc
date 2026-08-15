import { useEffect, useRef } from 'react';
import { SANS } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { Logo } from './Logo';

/** Antetul lipit de marginea de sus: căutare, temă și notificări. */
export function Topbar({ compact }: { compact: boolean }) {
  const { theme, toggleTheme } = useApp();
  const search = useRef<HTMLInputElement>(null);

  // Ctrl/⌘ + K duce cursorul în căutare, așa cum promite indicația din câmp.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        search.current?.focus();
        search.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--line)',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      {compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 2 }}>
          <Logo size={28} />
          <span style={{ font: `600 14px ${SANS}` }}>MedBuc</span>
        </div>
      )}

      <label
        className="search"
        style={{
          flex: 1,
          minWidth: 150,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          background: 'var(--surf)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '9px 12px',
        }}
      >
        <span className="visually-hidden">Caută în bibliotecă</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flex: '0 0 auto' }}>
          <circle cx="6" cy="6" r="4.4" stroke="currentColor" strokeWidth="1.4" style={{ color: 'var(--fg3)' }} />
          <line x1="9.4" y1="9.4" x2="13" y2="13" stroke="currentColor" strokeWidth="1.4" style={{ color: 'var(--fg3)' }} />
        </svg>
        <input
          ref={search}
          placeholder="Caută capitol, grilă sau noțiune…"
          style={{
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 0,
            background: 'transparent',
            font: `400 13.5px ${SANS}`,
            color: 'var(--fg)',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            font: `500 10.5px ${SANS}`,
            color: 'var(--fg3)',
            border: '1px solid var(--line2)',
            borderRadius: 5,
            padding: '2px 5px',
            whiteSpace: 'nowrap',
          }}
        >
          Ctrl K
        </span>
      </label>

      <button
        type="button"
        className="btn-quiet"
        onClick={toggleTheme}
        style={{ padding: '9px 12px', font: `500 12.5px ${SANS}`, whiteSpace: 'nowrap' }}
      >
        {theme === 'dark' ? 'Mod luminos' : 'Mod întunecat'}
      </button>

      <button
        type="button"
        className="btn-quiet"
        title="Notificări"
        aria-label="Notificări · ai una nouă"
        style={{ position: 'relative', width: 38, height: 38, display: 'grid', placeItems: 'center' }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M4 6.5a4 4 0 018 0v3l1.2 2H2.8L4 9.5v-3z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path d="M6.4 13.2a1.7 1.7 0 003.2 0" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        <span
          style={{
            position: 'absolute',
            top: 6,
            right: 7,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--acc)',
            border: '2px solid var(--surf)',
          }}
        />
      </button>
    </header>
  );
}
