import type { ReactNode } from 'react';
import { usePointerGlow, useTilt } from '../motion';

/**
 * Suprafața reutilizabilă a paginii.
 *
 * Deliberat nu tot conținutul stă într-un panou — o pagină în care fiecare
 * bucată de text e într-un dreptunghi rotunjit arată exact ca un șablon. Se
 * folosește doar acolo unde chiar există un obiect distinct de arătat.
 *
 * `viu` adaugă lumina care urmărește cursorul, `inclinat` înclinarea 3D. Ambele
 * se dezactivează singure fără mouse sau cu mișcare redusă, din hook-uri. Cele
 * două referințe se leagă printr-un callback: hook-urile își citesc elementul
 * în efect, iar callback-ul de referință rulează înaintea efectelor.
 */
export function Panou({
  viu = true,
  inclinat = false,
  className = '',
  children,
}: {
  viu?: boolean;
  inclinat?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const refGlow = usePointerGlow<HTMLDivElement>();
  const refTilt = useTilt<HTMLDivElement>(4);

  const clase = ['lp-panou'];
  if (viu) clase.push('lp-panou--viu');
  if (inclinat) clase.push('lp-panou--inclinat');
  if (className) clase.push(className);

  const leaga = (el: HTMLDivElement | null) => {
    if (viu) refGlow.current = el;
    if (inclinat) refTilt.current = el;
  };

  return (
    <div className={clase.join(' ')} ref={leaga}>
      <div className="lp-panou__continut">{children}</div>
    </div>
  );
}
