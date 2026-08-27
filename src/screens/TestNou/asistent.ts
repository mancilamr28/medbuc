import type { ChapterId, MaterieId } from '../../data/chapters';
import type { CerereTest, ModTest } from '../../lib/lucrari';
import type { ModTestNou } from '../../lib/router';
import { numar } from '../../lib/text';

/**
 * Creierul asistentului de test nou, separat de ecran ca să poată fi testat.
 *
 * Regula care dă forma întregului fișier: **pașii se derivă din date, nu sunt o
 * listă fixă de pagini.** Șase ecrane cu câte o alegere fiecare arată bogat pe
 * o bancă mare și absurd pe una cu două capitole scrise — iar banca noastră e a
 * doua. Un pas care n-are ce întreba nu se afișează, deci asistentul crește pe
 * măsură ce se scrie conținut, fără să fie rescris.
 */

/**
 * Modurile oferite azi. Sunt un subset al enum-ului `test_mod` din bază:
 * `recapitulare` și `test_predefinit` există în motor, dar unul are deja ecranul
 * lui, iar celălalt n-are încă testele pe care să le ruleze. Un mod în plus se
 * adaugă aici, nu în bază.
 */
export type ModAsistent = ModTestNou;

export interface DescriereMod {
  id: ModAsistent;
  titlu: string;
  detaliu: string;
  /**
   * Ce scrie pe cardul modului când n-are nicio grilă.
   *
   * O propoziție, nu un lacăt: „ai nevoie de cel puțin o grilă greșită" spune ce
   * e de făcut, un lacăt spune doar că nu se poate — aceeași disciplină ca
   * `EmptyState`.
   */
  motivGol: string;
  nrImplicit: number;
  /** Minute; null înseamnă fără ceas. Doar simularea are unul. */
  durataImplicita: number | null;
  /** Dacă modul își alege singur grilele, pasul de conținut n-are ce restrânge. */
  cereContinut: boolean;
}

export const MODURI: DescriereMod[] = [
  {
    id: 'exersare',
    titlu: 'Exersare',
    detaliu: 'Verifici fiecare grilă pe loc și vezi explicația imediat.',
    motivGol: 'Nu e încă nicio grilă publicată pe filtrele astea.',
    nrImplicit: 20,
    durataImplicita: null,
    cereContinut: true,
  },
  {
    id: 'simulare',
    titlu: 'Simulare',
    detaliu: 'Cu ceas, fără explicații până la predare — ca la examen.',
    motivGol: 'Nu e încă nicio grilă publicată pe filtrele astea.',
    nrImplicit: 100,
    durataImplicita: 180,
    cereContinut: true,
  },
  {
    id: 'greseli',
    titlu: 'Greșelile mele',
    detaliu: 'Doar grilele la care ultimul tău răspuns a fost greșit.',
    motivGol: 'Ai nevoie de cel puțin o grilă greșită ca să ai ce relua.',
    nrImplicit: 20,
    durataImplicita: null,
    cereContinut: false,
  },
  {
    id: 'favorite',
    titlu: 'Favoritele mele',
    detaliu: 'Grilele pe care le-ai marcat ca să revii la ele.',
    motivGol: 'N-ai marcat încă nicio grilă ca favorită.',
    nrImplicit: 20,
    durataImplicita: null,
    cereContinut: false,
  },
  {
    id: 'nevazute',
    titlu: 'Grile noi',
    detaliu: 'Doar grile la care n-ai răspuns niciodată.',
    motivGol: 'Ai răspuns măcar o dată la toate grilele care se potrivesc.',
    nrImplicit: 20,
    durataImplicita: null,
    cereContinut: true,
  },
];

export const descriereMod = (id: ModAsistent): DescriereMod =>
  MODURI.find((m) => m.id === id) ?? MODURI[0]!;

/** `ModAsistent` e prin construcție un `ModTest`; conversia e explicită, nu un cast. */
export const caModTest = (id: ModAsistent): ModTest => id;

export type PasAsistent = 'mod' | 'continut' | 'configurare' | 'rezumat';

export interface StareAsistent {
  mod: ModAsistent;
  materii: MaterieId[];
  capitole: ChapterId[];
  nr: number;
  /** Minute; null înseamnă fără limită de timp. */
  durataMinute: number | null;
  amestecaGrile: boolean;
  amestecaOptiuni: boolean;
}

export const stareInitiala = (
  mod: ModAsistent = 'exersare',
  capitole: ChapterId[] = [],
): StareAsistent => {
  const d = descriereMod(mod);
  return {
    mod,
    materii: [],
    capitole,
    nr: d.nrImplicit,
    durataMinute: d.durataImplicita,
    amestecaGrile: true,
    amestecaOptiuni: false,
  };
};

/**
 * Schimbarea modului duce cu ea și valorile implicite ale modului.
 *
 * Altfel „Simulare" moștenea 20 de grile fără ceas de la „Exersare" de dinainte,
 * adică exact configurarea pe care modul o contrazice.
 */
export const cuModul = (stare: StareAsistent, mod: ModAsistent): StareAsistent => {
  if (stare.mod === mod) return stare;
  const d = descriereMod(mod);
  return { ...stare, mod, nr: d.nrImplicit, durataMinute: d.durataImplicita };
};

export interface ContextAsistent {
  /** Câte capitole au măcar o grilă publicată. Sub două, n-ai ce alege. */
  capitoleCuGrile: number;
}

/**
 * Pașii care chiar au ce întreba.
 *
 * `mod`, `configurare` și `rezumat` sunt mereu acolo. `continut` cade când
 * modul își alege singur grilele (greșelile mele nu se restrâng pe capitol —
 * sunt deja ale mele), sau când biblioteca n-are decât un capitol scris: un pas
 * cu o singură bifă e o pagină în plus, nu o alegere.
 */
export function pasiVizibili(stare: StareAsistent, ctx: ContextAsistent): PasAsistent[] {
  const continut = descriereMod(stare.mod).cereContinut && ctx.capitoleCuGrile >= 2;
  return continut ? ['mod', 'continut', 'configurare', 'rezumat'] : ['mod', 'configurare', 'rezumat'];
}

/** Pasul vecin, sau `null` la capăt — clamparea stă aici, nu în ecran. */
export function pasVecin(
  pasi: PasAsistent[],
  curent: PasAsistent,
  directie: 1 | -1,
): PasAsistent | null {
  const i = pasi.indexOf(curent);
  if (i === -1) return pasi[0] ?? null;
  return pasi[i + directie] ?? null;
}

/**
 * Cererea trimisă motorului.
 *
 * Listele goale se trimit goale, nu se omit: „fără restricție pe axa asta" e
 * convenția din tot restul aplicației — `sessions.chapter_ids`,
 * `filtreazaCapitole` și `private.candidati` o citesc la fel.
 *
 * Când sunt alese capitole anume, materiile nu se mai trimit. Ar fi redundante
 * în cel mai bun caz și contradictorii în cel mai rău: un capitol bifat dintr-o
 * materie nebifată n-ar mai intra în selecție.
 */
export function cerereDin(stare: StareAsistent): CerereTest {
  const cereContinut = descriereMod(stare.mod).cereContinut;
  const capitole = cereContinut ? stare.capitole : [];
  const materii = cereContinut && capitole.length === 0 ? stare.materii : [];

  return {
    mod: caModTest(stare.mod),
    filtre: { materii, capitole },
    nr: stare.nr,
    durata_minute: stare.durataMinute,
    amesteca_grile: stare.amestecaGrile,
    amesteca_optiuni: stare.amestecaOptiuni,
  };
}

/** Doar partea de filtre, pentru contorul viu — aceleași filtre ca la generare. */
export const filtreDin = (stare: StareAsistent): Pick<CerereTest, 'mod' | 'filtre'> => {
  const { mod, filtre } = cerereDin(stare);
  return { mod, filtre };
};

// ---------------------------------------------------------------------------
// Frazele numărate.
//
// Fiecare are propria funcție pură fiindcă numărul se randează adesea separat,
// într-un `<span>` stilizat, iar acolo `numar()` nu mai ajunge la substantiv.
// Acordul a plecat greșit în producție de cinci ori, mereu în forma asta.
// ---------------------------------------------------------------------------

/** „12 grile disponibile", „1 grilă disponibilă", „20 de grile disponibile". */
export const frazaDisponibile = (n: number): string =>
  numar(n, 'grilă disponibilă', 'grile disponibile');

/** Ce scrie pe butonul de start. */
export const frazaIncepe = (n: number): string =>
  `Începe cu ${numar(n, 'grilă', 'grile')}`;

/**
 * Avertismentul de bancă scurtă, la pasul de rezumat.
 *
 * Numitorul rămâne ce s-a cerut — așa scrie și `genereaza_test` în `nr_cerut` —
 * deci propoziția trebuie să spună amândouă cifrele, nu doar cea livrată.
 */
export const frazaScurta = (cerut: number, disponibil: number): string =>
  `Ai cerut ${numar(cerut, 'grilă', 'grile')}, dar se potrivesc doar ${numar(disponibil, 'grilă', 'grile')}. ` +
  `Lucrarea va avea ${disponibil}, iar scorul se va calcula din ${cerut}.`;

/** Câte grile s-au ales, la pasul de conținut. */
export const frazaCapitoleAlese = (n: number): string =>
  n === 0 ? 'Toate capitolele' : numar(n, 'capitol ales', 'capitole alese');

/**
 * Cât cere modul și cât se poate da.
 *
 * `nr` nu se plafonează tăcut la ce există: elevul cere 100, banca are 47, iar
 * lucrarea iese de 47 din 100. Plafonarea ar ascunde lipsa exact în locul unde
 * ea e informația utilă.
 */
export const nrValid = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= 300;
