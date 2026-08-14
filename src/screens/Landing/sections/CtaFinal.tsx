import { useInView } from '../motion';
import { CtaAuth, Sageata } from '../parts/CtaAuth';
import { Reveal } from '../parts/Reveal';

/**
 * Ultimul îndemn.
 *
 * Haloul din spate e cel mai mare din pagină și apare o singură dată, scalând
 * la intrare — de aceea secțiunea se citește ca punctul de sosire, nu ca încă
 * un bloc. Textul rămâne în limitele a ce poate promite aplicația: o grilă în
 * plus, nu un loc la facultate.
 */
export function CtaFinal() {
  const [ref, vazut] = useInView<HTMLElement>({ prag: 0.25 });

  return (
    <section className="lp-final" ref={ref} data-vazut={vazut}>
      <div className="lp-final__halou" aria-hidden="true" />

      <div className="lp-wrap">
        <Reveal fel="scala">
          <span className="lp-eyebrow">
            <span className="lp-eyebrow__punct" />
            Contul e gratuit
          </span>
        </Reveal>

        <Reveal fel="rand" indice={1}>
          <h2 className="lp-final__titlu">
            Drumul spre medicină începe cu{' '}
            <span className="lp-luminos" data-text="următoarea grilă" aria-label="următoarea grilă">
              următoarea grilă
            </span>
            .
          </h2>
        </Reveal>

        <Reveal fel="sus" indice={2}>
          <p className="lp-final__lead">
            Îți faci cont în câteva secunde și începi de la primul capitol. Datele tale rămân ale tale — le poți exporta
            sau șterge oricând, din setări.
          </p>
        </Reveal>

        <Reveal fel="sus" indice={3}>
          <div className="lp-final__actiuni">
            <CtaAuth ruta="inregistrare" marime="mare">
              Creează cont
              <Sageata />
            </CtaAuth>
            <CtaAuth ruta="autentificare" varianta="discret" marime="mare">
              Autentificare
            </CtaAuth>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
