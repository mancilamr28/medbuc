import { useEffect, useState } from 'react';
import { CtaAuth } from './CtaAuth';
import { Marca } from './Marca';

/** Ancorele din pagină. Id-urile sunt pe secțiuni, în `Landing.tsx`. */
const LINKURI = [
  { id: 'ce-poti-face', label: 'Ce poți face' },
  { id: 'cum-merge', label: 'Cum merge' },
  { id: 'parcurs', label: 'Parcursul' },
] as const;

/**
 * Bara plutitoare.
 *
 * Se opacizează la derulare, altfel titlurile mari trec pe sub ea și se citesc
 * amândouă deodată. Meniul de telefon e o listă care se deschide sub bară, nu un
 * panou pe tot ecranul: la trei linkuri și două butoane ar fi fost teatru.
 */
export function Nav() {
  const [derulat, setDerulat] = useState(false);
  const [deschis, setDeschis] = useState(false);
  const [activ, setActiv] = useState<string | null>(null);

  useEffect(() => {
    let cadru = 0;
    const masoara = () => {
      cadru = 0;
      setDerulat(window.scrollY > 24);
    };
    const cere = () => {
      if (!cadru) cadru = requestAnimationFrame(masoara);
    };
    masoara();
    window.addEventListener('scroll', cere, { passive: true });
    return () => {
      if (cadru) cancelAnimationFrame(cadru);
      window.removeEventListener('scroll', cere);
    };
  }, []);

  // Secțiunea din dreptul barei devine cea marcată. Marginea de sus taie exact
  // sub navbar, ca indicatorul să se schimbe când secțiunea ajunge acolo.
  useEffect(() => {
    const sectiuni = LINKURI.map((l) => document.getElementById(l.id)).filter((el): el is HTMLElement => el !== null);
    if (sectiuni.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const obs = new IntersectionObserver(
      (intrari) => {
        for (const i of intrari) if (i.isIntersecting) setActiv(i.target.id);
      },
      { rootMargin: '-84px 0px -55% 0px' },
    );
    for (const s of sectiuni) obs.observe(s);
    return () => obs.disconnect();
  }, []);

  // Escape închide meniul — altfel pe telefon rămâne agățat peste conținut.
  useEffect(() => {
    if (!deschis) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDeschis(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deschis]);

  return (
    <header className="lp-nav" data-derulat={derulat} data-deschis={deschis}>
      <div className="lp-nav__rand">
        <Marca />

        <nav className="lp-nav__linkuri" aria-label="Sectiunile paginii">
          {LINKURI.map((l) => (
            <a key={l.id} className="lp-nav__link" href={`#${l.id}`} aria-current={activ === l.id ? 'true' : undefined}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="lp-nav__actiuni">
          <CtaAuth ruta="autentificare" varianta="discret" marime="mic">
            Autentificare
          </CtaAuth>
          <CtaAuth ruta="inregistrare" marime="mic">
            Creează cont
          </CtaAuth>
        </div>

        <button
          type="button"
          className="lp-nav__meniu"
          aria-expanded={deschis}
          aria-controls="lp-meniu"
          aria-label={deschis ? 'Închide meniul' : 'Deschide meniul'}
          onClick={() => setDeschis((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            {deschis ? (
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {deschis && (
        <div className="lp-nav__panou" id="lp-meniu">
          {LINKURI.map((l) => (
            <a key={l.id} className="lp-nav__link" href={`#${l.id}`} onClick={() => setDeschis(false)}>
              {l.label}
            </a>
          ))}
          <div className="lp-nav__panou-actiuni">
            <CtaAuth ruta="inregistrare">Creează cont</CtaAuth>
            <CtaAuth ruta="autentificare" varianta="discret">
              Autentificare
            </CtaAuth>
          </div>
        </div>
      )}
    </header>
  );
}
