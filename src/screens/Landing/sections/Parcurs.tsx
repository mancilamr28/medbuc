import type { ReactNode } from 'react';
import { useIsDesktop } from '../../../lib/hooks';
import { useScrollSteps } from '../motion';
import { Marcaj } from '../parts/Marcaj';
import { Reveal } from '../parts/Reveal';
import { PreviewCapitole } from '../visual/PreviewCapitole';
import { PreviewGrila } from '../visual/PreviewGrila';
import { PreviewSimulare } from '../visual/PreviewSimulare';

/**
 * Cum se folosește aplicația, în trei pași.
 *
 * Pe desktop coloana din stânga rămâne lipită cât se derulează prin secțiune,
 * iar macheta din dreapta se schimbă odată cu pasul. **Derularea nu e
 * confiscată**: pagina se mișcă exact cât a cerut omul, doar conținutul
 * coloanei se schimbă în funcție de cât s-a parcurs. Pașii sunt și butoane,
 * deci se poate sări direct la unul, inclusiv de la tastatură.
 *
 * Pe mobil devine o listă verticală obișnuită, cu macheta sub fiecare pas.
 * Un sticky pe trei ecrane de telefon e mai mult efort de derulat decât conținut.
 */

interface Pas {
  nr: string;
  titlu: string;
  text: string;
  scena: ReactNode;
}

const PASI: Pas[] = [
  {
    nr: '01',
    titlu: 'Învață',
    text: 'Pornești de la capitol, nu de la un teanc de grile amestecate. Vezi ce e scris pe fiecare capitol al celor două probe și îți ții notițele acolo unde le cauți.',
    scena: <PreviewCapitole />,
  },
  {
    nr: '02',
    titlu: 'Exersează',
    text: 'Sesiune fără limită de timp. Verifici răspunsul, primești explicația pentru toate variantele — și de ce cade fiecare, nu doar care ține — apoi mergi mai departe.',
    scena: <PreviewGrila />,
  },
  {
    nr: '03',
    titlu: 'Simulează',
    text: 'Aceeași structură ca la admitere, cu cronometru care nu se oprește. La final vezi punctajul, câte ai lăsat fără răspuns și unde ai greșit.',
    scena: <PreviewSimulare />,
  },
];

export function Parcurs() {
  const isDesktop = useIsDesktop();

  // Pe desktop titlul intră în coloana lipită, ca să se fixeze împreună cu pașii.
  // Lăsat deasupra, între el și pași rămâne un ecran gol cât timp secțiunea
  // înaltă începe să se deruleze.
  if (isDesktop) return <Lipit />;

  return (
    <section className="lp-sectiune lp-wrap" id="cum-merge" style={{ paddingBottom: 0 }}>
      <Reveal fel="rand">
        <Marcaj nr="02">Cum merge</Marcaj>
      </Reveal>
      <Reveal fel="rand" indice={1}>
        <h2 className="lp-h2">De la capitol la lucrare cronometrată.</h2>
      </Reveal>
      <Vertical />
    </section>
  );
}

/** Varianta de desktop: coloana din stânga stă pe loc, scena se schimbă. */
function Lipit() {
  const [ref, pas] = useScrollSteps<HTMLDivElement>(PASI.length);

  const laPas = (i: number) => {
    const el = ref.current;
    if (!el) return;
    // Se derulează la mijlocul intervalului pasului, ca el să fie clar cel activ.
    const inaltimeParcurs = el.offsetHeight - window.innerHeight;
    const tinta = el.offsetTop + inaltimeParcurs * ((i + 0.45) / PASI.length);
    window.scrollTo({ top: tinta, behavior: 'smooth' });
  };

  return (
    // Înălțimea dă cursa de derulare. Sub un ecran pe pas ar face schimbarea
    // bruscă; peste, ar cere prea multă derulare pentru trei idei.
    <section
      className="lp-parcurs lp-wrap"
      id="cum-merge"
      ref={ref}
      style={{ height: `${PASI.length * 88 + 34}svh` }}
    >
      <div className="lp-parcurs__lipit">
        <div>
          <Marcaj nr="02">Cum merge</Marcaj>
          <h2 className="lp-h2" style={{ margin: '0 0 26px', maxWidth: '13ch' }}>
            De la capitol la lucrare cronometrată.
          </h2>

          {PASI.map((p, i) => (
            <button
              key={p.nr}
              type="button"
              className="lp-pas"
              data-activ={i === pas}
              onClick={() => laPas(i)}
              aria-current={i === pas ? 'step' : undefined}
            >
              {i === pas && <span className="lp-pas__progres" style={{ width: '100%' }} />}
              <span className="lp-pas__nr">{p.nr}</span>
              <span>
                <span className="lp-pas__titlu" style={{ display: 'block' }}>
                  {p.titlu}
                </span>
                <span className="lp-pas__text">
                  <span>{p.text}</span>
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="lp-parcurs__scena">
          {PASI.map((p, i) => (
            <div key={p.nr} className="lp-scena__cadru" data-activ={i === pas} aria-hidden={i !== pas}>
              {p.scena}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Varianta de telefon: pașii unul sub altul, fiecare cu macheta lui. */
function Vertical() {
  return (
    <div style={{ marginTop: 34, paddingBottom: 84 }}>
      {PASI.map((p, i) => (
        <Reveal key={p.nr} fel="sus" indice={i} style={{ marginTop: i === 0 ? 0 : 44 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <span className="lp-pas__nr">{p.nr}</span>
            <div style={{ minWidth: 0 }}>
              <h3 className="lp-pas__titlu">{p.titlu}</h3>
              <p className="lp-corp" style={{ marginTop: 9 }}>
                {p.text}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>{p.scena}</div>
        </Reveal>
      ))}
    </div>
  );
}
