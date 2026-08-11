import type { ReactNode } from 'react';

/** Comutatorul pastilă folosit la filtre, notificări și la publicarea grilelor. */
export function Switch({
  on,
  onToggle,
  children,
  align = 'center',
}: {
  on: boolean;
  onToggle: () => void;
  children: ReactNode;
  align?: 'center' | 'flex-start';
}) {
  return (
    <button
      type="button"
      className="plain-btn"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      style={{ display: 'flex', alignItems: align, gap: 12, width: '100%' }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: '0 0 auto',
          width: 38,
          height: 22,
          borderRadius: 99,
          padding: 3,
          display: 'flex',
          transition: 'background .16s, justify-content .16s',
          background: on ? 'var(--brand)' : 'var(--surf3)',
          justifyContent: on ? 'flex-end' : 'flex-start',
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: on ? 'var(--onBrand)' : 'var(--surf)',
            boxShadow: '0 1px 2px rgba(0,0,0,.25)',
          }}
        />
      </span>
      {children}
    </button>
  );
}
