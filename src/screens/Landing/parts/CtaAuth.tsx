import type { ReactNode } from 'react';
import type { PublicRoute } from '../../../lib/router';

/**
 * Singurul loc din pagină care știe adresele rutelor publice.
 *
 * E o ancoră adevărată, nu un buton cu `onClick`: funcționează cu clic pe rotiță,
 * cu „deschide în filă nouă", și apare în bara de stare la hover. `scrollTo` se
 * face în plus, fără `preventDefault` — un buton din josul paginii ar deschide
 * altfel formularul derulat pe la jumătate, pentru că hash-ul nu se potrivește
 * cu niciun id din document.
 */
export function CtaAuth({
  ruta,
  varianta = 'primar',
  marime,
  children,
}: {
  ruta: PublicRoute;
  varianta?: 'primar' | 'discret';
  marime?: 'mic' | 'mare';
  children: ReactNode;
}) {
  const clase = ['lp-btn', `lp-btn--${varianta}`];
  if (marime) clase.push(`lp-btn--${marime}`);

  return (
    <a className={clase.join(' ')} href={`#/${ruta}`} onClick={() => window.scrollTo(0, 0)}>
      {children}
    </a>
  );
}

/** Săgeata din butoanele principale, care alunecă puțin la hover. */
export function Sageata() {
  return (
    <svg className="lp-btn__sageata" width="15" height="15" viewBox="0 0 16 16" aria-hidden="true" fill="none">
      <path d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
