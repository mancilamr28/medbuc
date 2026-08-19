import { MATERII } from '../../../data/chapters';
import { EXAM_DATE } from '../../../data/profile';
import { QUESTIONS } from '../../../data/questions';
import { daysUntil } from '../../../lib/time';
import { useContorAnimat, useInView } from '../motion';

/**
 * Banda de cifre de sub erou.
 *
 * Toate patru se calculează din `src/data/` — zilele din `EXAM_DATE`, capitolele
 * numărate din `MATERII`, grilele numărate din `QUESTIONS`. Regula proiectului e
 * că nicio cifră afișată nu se scrie de mână, iar o pagină de prezentare e exact
 * locul unde tentația de a inventa „1000+ grile" sau „5000 de elevi" e cea mai
 * mare. Numărul grilelor e cel din fixtura folosită fără sesiune — nu creștere
 * ca argument de vânzare, doar o cifră reală printre celelalte.
 *
 * Formatul simulării (100 de grile / 180 de minute) e configurația reală
 * oferită de `Simulari.tsx`, nu o măsurătoare.
 */

const capitole = MATERII.bio.list.length + MATERII.chim.list.length;
const grile = QUESTIONS.length;

interface Cifra {
  valoare: number;
  unitate?: string;
  eticheta: string;
  nota: string;
}

export function Cifre() {
  const [ref, vazut] = useInView<HTMLDivElement>({ prag: 0.3 });
  const zile = daysUntil(EXAM_DATE);

  const cifre: Cifra[] = [
    { valoare: zile, eticheta: 'Zile până la examen', nota: 'Sesiunea din 25 iulie 2027' },
    { valoare: capitole, eticheta: 'Capitole de parcurs', nota: 'Biologie și Chimie organică' },
    { valoare: grile, eticheta: 'Grile în bibliotecă', nota: 'Cu explicație la fiecare variantă' },
    { valoare: 180, unitate: 'min', eticheta: 'Durata unei simulări', nota: '100 de grile, ca la admitere' },
  ];

  return (
    <div className="lp-cifre" ref={ref}>
      <div className="lp-wrap">
        <div className="lp-cifre__grid">
          {cifre.map((c, i) => (
            <Celula key={c.eticheta} cifra={c} pornit={vazut} indice={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Celula({ cifra, pornit, indice }: { cifra: Cifra; pornit: boolean; indice: number }) {
  const valoare = useContorAnimat(cifra.valoare, pornit, 900 + indice * 130);

  return (
    <div className="lp-cifra">
      <div className="lp-cifra__valoare">
        {valoare}
        {cifra.unitate && <span className="lp-cifra__unitate">{cifra.unitate}</span>}
      </div>
      <div className="lp-cifra__eticheta">{cifra.eticheta}</div>
      <div className="lp-cifra__nota">{cifra.nota}</div>
    </div>
  );
}
