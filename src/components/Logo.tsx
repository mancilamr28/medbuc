import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../state/AppState';

/**
 * Marca MedBuc. Un clic duce înapoi la pagina principală și dă pisicii un mic
 * salt — gestul de „acasă” din design.
 */
export function Logo({ size = 32 }: { size?: number }) {
  const { go } = useApp();
  const [pop, setPop] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = useCallback(() => {
    window.clearTimeout(timer.current);
    setPop(true);
    timer.current = window.setTimeout(() => setPop(false), 320);
    go('acasa');
  }, [go]);

  return (
    <button
      type="button"
      onClick={onClick}
      title="Înapoi la pagina principală"
      style={{
        padding: 0,
        border: 0,
        background: 'transparent',
        lineHeight: 0,
        cursor: 'pointer',
        borderRadius: 8,
        flex: '0 0 auto',
      }}
    >
      <img
        src="/logo-kitty.svg"
        alt="MedBuc"
        className={`logo${pop ? ' logo--pop' : ''}`}
        style={{ width: size, height: size, display: 'block' }}
      />
    </button>
  );
}
