import { progressFill, progressTrack } from '../lib/ui';

/** Bara de progres subțire folosită peste tot în aplicație. */
export function Progress({
  pct,
  color = 'var(--brand)',
  height = 6,
  width = '100%',
  label,
}: {
  pct: number;
  color?: string;
  height?: number;
  width?: string | number;
  label?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <span
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      style={progressTrack(height, width)}
    >
      <span style={progressFill(value, color)} />
    </span>
  );
}
