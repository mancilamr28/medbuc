import type { CSSProperties } from 'react';
import { EXAM_DATE } from '../../../data/profile';
import { numar } from '../../../lib/text';
import { daysUntil } from '../../../lib/time';
import { usePointerGlow } from '../motion';
import { CtaAuth, Sageata } from '../parts/CtaAuth';
import { Corp } from '../visual/Corp';

/**
 * Primul ecran.
 *
 * Intrarea nu e legată de derulare, ci de încărcare: fiecare element are
 * `lp-intro` cu propriul indice, iar întregul stagger se consumă în ~1,2s.
 * Nimic nu așteaptă un `IntersectionObserver` — conținutul e deja în ecran.
 *
 * Numărul de zile se calculează din `EXAM_DATE`, ca peste tot în aplicație:
 * nicio cifră afișată nu e scrisă de mână.
 */
export function Hero() {
  const ref = usePointerGlow<HTMLElement>();
  const zile = daysUntil(EXAM_DATE);

  return (
    <section className="lp-erou lp-wrap" ref={ref}>
      <div className="lp-erou__reflector" />

      <div>
        <h1 className="lp-erou__titlu lp-intro" style={{ '--i': 0 } as CSSProperties}>
          Pregătirea pentru medicină,{' '}
          <span className="lp-luminos" data-text="pusă în ordine" aria-label="pusă în ordine">
            pusă în ordine
          </span>
          .
        </h1>

        <p className="lp-erou__lead lp-intro" style={{ '--i': 1 } as CSSProperties}>
          Grile cu explicație la fiecare variantă, capitolele celor două probe și simulări cronometrate după formatul
          real al admiterii. Fără scoruri inventate — vezi doar ce ai făcut tu.
        </p>

        <div className="lp-erou__actiuni lp-intro" style={{ '--i': 2 } as CSSProperties}>
          <CtaAuth ruta="inregistrare" marime="mare">
            Începe pregătirea
            <Sageata />
          </CtaAuth>
          <CtaAuth ruta="autentificare" varianta="discret" marime="mare">
            Am deja cont
          </CtaAuth>
        </div>

        <p className="lp-erou__nota lp-intro" style={{ '--i': 3 } as CSSProperties}>
          Mai sunt {numar(zile, 'zi', 'zile')} până la examen.
        </p>
      </div>

      <div className="lp-intro lp-intro--obiect" style={{ '--i': 2 } as CSSProperties}>
        <Corp />
      </div>

      <span className="lp-scroll" aria-hidden="true" />
    </section>
  );
}
