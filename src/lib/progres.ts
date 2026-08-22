import type { ChapterId } from '../data/chapters';
import { TAXONOMIE_GOALA, type Taxonomie } from './taxonomie';
import type { Question } from '../data/questions';

/** Rândul minim citit din jurnalul de răspunsuri. */
export interface AttemptRow {
  question_id: string;
  is_correct: boolean;
  source: 'sesiune' | 'simulare' | 'recapitulare';
  session_id: string | null;
  sim_run_id: string | null;
  answered_at: string;
}
export interface ProgresCapitol {
  capId: ChapterId;
  nume: string;
  materie: string;
  raspunsuri: number;
  corecte: number;
  grileIncercate: number;
  pct: number;
}

export interface PunctEvolutie {
  id: string;
  pct: number;
  eticheta: string;
  answeredAt: string;
  grile: number;
}

export interface ProgresCalculat {
  raspunsuri: number;
  corecte: number;
  pct: number | null;
  /** Grile din biblioteca actuală care au cel puțin un răspuns valid. */
  grileDistincte: number;
  capitole: ProgresCapitol[];
  evolutie: PunctEvolutie[];
}

const procent = (corecte: number, total: number): number =>
  total === 0 ? 0 : Math.round((corecte / total) * 100);

/** Sub acest prag, procentul ar exagera ce știm despre nivelul elevului. */
export const MIN_GRILE_EVOLUTIE = 5;

const etichetaData = (iso: string): string =>
  new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: 'short' }).format(new Date(iso));

/**
 * Derivă toate cifrele de progres din jurnalul imuabil `attempts`.
 *
 * Grila este rezolvată prin banca primită, nu prin poziția ei. Dacă o grilă nu
 * mai este disponibilă în bibliotecă, răspunsul rămâne în totalul global, dar
 * nu este atribuit pe ghicite altui capitol și nu influențează stăpânirea
 * bibliotecii curente.
 */
export function calculeazaProgres(
  attempts: readonly AttemptRow[],
  questions: readonly Question[],
  taxonomie: Taxonomie = TAXONOMIE_GOALA,
): ProgresCalculat {
  const intrebare = new Map(questions.map((q) => [q.id as string, q]));
  const peCapitol = new Map<ChapterId, { raspunsuri: number; corecte: number; grile: Set<string> }>();
  let corecte = 0;

  for (const attempt of attempts) {
    if (attempt.is_correct) corecte += 1;

    const q = intrebare.get(attempt.question_id);
    if (q) {
      const curent = peCapitol.get(q.capId) ?? { raspunsuri: 0, corecte: 0, grile: new Set<string>() };
      curent.raspunsuri += 1;
      if (attempt.is_correct) curent.corecte += 1;
      curent.grile.add(attempt.question_id);
      peCapitol.set(q.capId, curent);
    }

  }

  const capitole = [...peCapitol.entries()]
    .filter(([capId]) => taxonomie.capitol(capId) !== undefined)
    .map(([capId, row]): ProgresCapitol => ({
      capId,
      nume: taxonomie.eticheta(capId),
      materie: taxonomie.numeMaterie(capId),
      raspunsuri: row.raspunsuri,
      corecte: row.corecte,
      grileIncercate: row.grile.size,
      pct: procent(row.corecte, row.raspunsuri),
    }));

  /*
   * Stăpânirea nu este un scor pe sesiune. O sesiune de o singură grilă ar
   * produce imediat 0% sau 100%, iar împărțirea aceleiași activități în multe
   * sesiuni ar schimba forma graficului. În schimb, fiecare grilă are o singură
   * greutate și poate fi reevaluată cel mult o dată pe zi, prin primul răspuns.
   * Astfel, repetarea imediată după aflarea soluției nu cosmetizează procentul;
   * un răspuns dintr-o zi viitoare poate demonstra că informația a fost reținută.
   */
  const raspunsuriValide = attempts
    .map((attempt, ordine) => ({ attempt, ordine, moment: Date.parse(attempt.answered_at) }))
    .filter(({ attempt, moment }) => intrebare.has(attempt.question_id) && Number.isFinite(moment))
    .sort((a, b) => a.moment - b.moment || a.ordine - b.ordine);
  const ultimulPeGrila = new Map<string, boolean>();
  const evolutie: PunctEvolutie[] = [];

  for (let i = 0; i < raspunsuriValide.length;) {
    const data = raspunsuriValide[i]!.attempt.answered_at.slice(0, 10);
    const vazuteAzi = new Set<string>();
    let ultimulMoment = raspunsuriValide[i]!.attempt.answered_at;

    while (i < raspunsuriValide.length && raspunsuriValide[i]!.attempt.answered_at.slice(0, 10) === data) {
      const attempt = raspunsuriValide[i]!.attempt;
      if (!vazuteAzi.has(attempt.question_id)) {
        ultimulPeGrila.set(attempt.question_id, attempt.is_correct);
        vazuteAzi.add(attempt.question_id);
      }
      ultimulMoment = attempt.answered_at;
      i += 1;
    }

    if (ultimulPeGrila.size >= MIN_GRILE_EVOLUTIE) {
      const corecteCurente = [...ultimulPeGrila.values()].filter(Boolean).length;
      evolutie.push({
        id: data,
        pct: procent(corecteCurente, ultimulPeGrila.size),
        eticheta: etichetaData(ultimulMoment),
        answeredAt: ultimulMoment,
        grile: ultimulPeGrila.size,
      });
    }
  }

  return {
    raspunsuri: attempts.length,
    corecte,
    pct: attempts.length === 0 ? null : procent(corecte, attempts.length),
    grileDistincte: ultimulPeGrila.size,
    capitole,
    evolutie,
  };
}

/**
 * Capitolele unde elevul a răspuns deja și n-a luat tot punctajul, restrânse la
 * `candidati` (de obicei capitolele unei singure materii). Sortate de la cel
 * mai slab, ca „Puncte slabe" să înceapă cu ce merită exersat primul.
 *
 * Un capitol neîncercat nu e „slab" — e doar neînceput, ceea ce e altă stare.
 */
export function capitoleSlabe(
  capitole: readonly ProgresCapitol[],
  candidati: readonly ChapterId[],
): ProgresCapitol[] {
  const admise = new Set(candidati);
  return capitole
    .filter((c) => admise.has(c.capId) && c.corecte < c.raspunsuri)
    .sort((a, b) => a.pct - b.pct || b.raspunsuri - a.raspunsuri);
}
