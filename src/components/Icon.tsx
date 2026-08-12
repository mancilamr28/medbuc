import type { CSSProperties } from 'react';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

/**
 * Desenează o iconiță Font Awesome direct din datele ei.
 *
 * Pachetele `@fortawesome/fontawesome-svg-core` și `react-fontawesome` adaugă
 * ~100 KB de runtime (scanare de DOM, straturi, măști) ca să deseneze niște
 * SVG-uri statice. Definiția unei iconițe e însă doar un viewBox și un `path`,
 * deci le desenăm noi: rămân iconițele Font Awesome adevărate, dar din
 * bibliotecă se împachetează exact cele folosite, adică sub un kilobyte.
 */
export function Icon({
  icon,
  className,
  size = 16,
  style,
}: {
  icon: IconDefinition;
  className?: string;
  size?: number;
  style?: CSSProperties;
}) {
  const [width, height, , , path] = icon.icon;
  // Iconițele duotone dau două contururi; cele solid, unul singur.
  const d = Array.isArray(path) ? path.join(' ') : path;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}
