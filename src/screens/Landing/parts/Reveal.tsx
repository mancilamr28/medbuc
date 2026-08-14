import type { CSSProperties, ElementType, ReactNode } from 'react';
import { useInView } from '../motion';

/** Felurile în care intră conținutul. Mai multe, ca secțiunile să nu apară identic. */
export type FelReveal = 'sus' | 'stanga' | 'dreapta' | 'scala' | 'linie' | 'rand';

/**
 * Învelișul care declanșează apariția la intrarea în ecran.
 *
 * Nimic nu se ascunde la ieșire: conținutul apare o dată și rămâne. O pagină în
 * care textul dispare când derulezi înapoi e enervantă, nu elegantă.
 *
 * `indice` decalează intrarea în cadrul unui grup (stagger), prin variabila
 * `--i` citită de CSS ca întârziere de tranziție.
 */
export function Reveal({
  fel = 'sus',
  indice = 0,
  as: Tag = 'div',
  className = '',
  style,
  children,
}: {
  fel?: FelReveal;
  indice?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [ref, vazut] = useInView<HTMLElement>();

  return (
    <Tag
      ref={ref}
      className={`lp-rev lp-rev--${fel} ${className}`.trim()}
      data-vazut={vazut}
      style={{ '--i': indice, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
