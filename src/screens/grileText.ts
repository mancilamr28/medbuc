import { chapterById, chapterLabelById, MATERII, type ChapterId, type Materie } from '../data/chapters';
import { numar } from '../lib/text';

/**
 * Frazele ecranului de grile care se acordă cu un număr.
 *
 * Funcții pure, nu text scris direct în `Grile.tsx`, din motivul din `CLAUDE.md`:
 * un acord care trăiește doar în JSX nu poate fi verificat la 1, 2 și 20 — și a
 * scăpat de patru ori până acum. Panoul de rezultat scria „1 din 1 grile
 * corecte", ceea ce n-a bătut la ochi cât timp o sesiune lua toată biblioteca;
 * cu sesiuni pe capitol, totalul de unu e obișnuit.
 */

/** „3 grile corecte din 6", cu acordul făcut pe câte au fost corecte. */
export const frazaCorecte = (corecte: number, total: number): string =>
  `${numar(corecte, 'grilă corectă', 'grile corecte')} din ${total}`;

/** Titlul stării în care capitolele sesiunii n-au nicio grilă publicată. */
export const frazaCapitoleGoale = (capitole: readonly ChapterId[]): string =>
  capitole.length === 1
    ? 'Capitolul ales nu are nicio grilă publicată'
    : 'Capitolele alese nu au nicio grilă publicată';

/**
 * Cum se numește sesiunea curentă, după capitolele din care e compusă.
 *
 * Antetul spunea până acum „Capitole mixte" orice s-ar fi ales, fiindcă nu
 * exista nimic de ales.
 */
export interface DescriereScop {
  /** Felul sesiunii, pe primul rând al antetului. */
  titlu: string;
  /** Din ce se compune, pe al doilea rând. */
  detaliu: string;
}

/** Materia din care vin toate capitolele, sau `null` dacă sunt din mai multe. */
const materieComuna = (capitole: readonly ChapterId[]): Materie | null => {
  const materii = new Set(capitole.map((id) => chapterById(id)?.materie));
  if (materii.size !== 1) return null;
  const [materie] = [...materii];
  return materie ? MATERII[materie] : null;
};

export function descriereScop(capitole: readonly ChapterId[]): DescriereScop {
  if (capitole.length === 0) {
    return { titlu: 'Sesiune rapidă', detaliu: 'Toate capitolele' };
  }

  const materie = materieComuna(capitole);
  const cu = (rest: string) => (materie ? `${materie.name} · ${rest}` : rest);

  if (capitole.length === 1) {
    return { titlu: 'Sesiune pe capitol', detaliu: cu(chapterLabelById(capitole[0]!)) };
  }

  // Materia întreagă se numește ca atare. „12 capitole" ar fi adevărat, dar
  // sugerează un bazin de douăsprezece ori mai mare decât e — în bancă sunt
  // scrise grile pe patru dintre ele.
  const toata = materie !== null && new Set(capitole).size === materie.list.length;

  return {
    titlu: 'Sesiune pe capitole',
    detaliu: cu(toata ? 'toate capitolele' : numar(capitole.length, 'capitol', 'capitole')),
  };
}
