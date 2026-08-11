import { useCallback, useMemo } from 'react';
import { MATERII, chapterLabel, type Chapter, type MaterieId } from '../data/chapters';
import { QUESTIONS, type OptionKey, type Question } from '../data/questions';
import { usePersistentState } from '../lib/hooks';

/** Ecranul de grile: fără set pornit, set în lucru, set încheiat. */
export type SessionPhase = 'gol' | 'rulare' | 'rezultat';

/** Cheia unui set de capitol, ex. „bio:04:Glandele endocrine”. */
export type SetId = string;

/** Câte grile are un set de capitol. */
export const SET_SIZE = 12;

/** Versiunea formatului salvat; o rulare în alt format e ignorată, nu convertită. */
const RUN_VERSION = 1;

export interface SessionRun {
  v: typeof RUN_VERSION;
  setId: SetId;
  materie: MaterieId;
  /** Eticheta capitolului, ex. „04. Glandele endocrine”. */
  capitol: string;
  /** Momentul pornirii setului — nu al deschiderii aplicației. */
  startedAt: number;
  /** Momentul încheierii; `null` cât timp setul e în lucru. */
  finishedAt: number | null;
  /** Pentru fiecare poziție din set, indexul din banca de întrebări. */
  order: number[];
  qi: number;
  /**
   * Cheile sunt poziții din `order`, nu indici din bancă: banca e mică, deci o
   * grilă apare de mai multe ori într-un set și fiecare apariție are răspunsul ei.
   */
  answers: Record<number, OptionKey>;
  revealed: Record<number, boolean>;
  marks: Record<number, boolean>;
}

/** Un set încheiat, păstrat în istoric pe capitol. */
export interface SessionResult extends SessionRun {
  finishedAt: number;
}

export type SessionResults = Record<SetId, SessionResult>;

export interface SessionScore {
  corecte: number;
  gresite: number;
  neraspunse: number;
  total: number;
  /** Procentul de corecte din tot setul — comparabil cu `Chapter.pct`. */
  pct: number;
  durataMs: number;
}

/** În „Subiecte anterioare” `nr` se repetă, deci cheia include și numele. */
export const setIdOf = (materie: MaterieId, c: Chapter): SetId => `${materie}:${c.nr}:${c.name}`;

/** Grila de pe poziția `i` din set. */
export const questionAt = (run: SessionRun, i: number): Question =>
  QUESTIONS[run.order[i] ?? 0] ?? QUESTIONS[0]!;

/** Pe poziția `i` e ales răspunsul corect. */
export const isCorrectAt = (run: SessionRun, i: number): boolean =>
  run.answers[i] !== undefined && run.answers[i] === questionAt(run, i).correct;

/** După încheierea setului toate pozițiile sunt descoperite. */
export const isRevealedAt = (run: SessionRun, i: number): boolean =>
  run.finishedAt !== null || !!run.revealed[i];

/** Cifrele unui set: grilele fără răspuns nu intră la greșeli. */
export function scoreOf(run: SessionRun): SessionScore {
  let corecte = 0;
  let raspunse = 0;
  run.order.forEach((_, i) => {
    if (run.answers[i] === undefined) return;
    raspunse += 1;
    if (isCorrectAt(run, i)) corecte += 1;
  });
  const total = run.order.length;
  return {
    corecte,
    gresite: raspunse - corecte,
    neraspunse: total - raspunse,
    total,
    pct: total === 0 ? 0 : Math.round((corecte / total) * 100),
    durataMs: Math.max(0, (run.finishedAt ?? run.startedAt) - run.startedAt),
  };
}

/**
 * Setul unui capitol: întâi grilele lui proprii, apoi restul băncii, repetat
 * până la `count`. Banca are deocamdată șase grile, deci un capitol se umple
 * mai ales cu împrumuturi; pe măsură ce banca crește umplutura scade, iar când
 * capitolul are singur destule grile, `order` conține numai grilele lui.
 * Fără amestecare — „Reia setul” trebuie să dea aceleași grile.
 */
function buildSet(materieName: string, capitol: string, count = SET_SIZE): number[] {
  const proprii: number[] = [];
  const imprumutate: number[] = [];
  QUESTIONS.forEach((q, i) => {
    if (q.materie === materieName && q.cap === capitol) proprii.push(i);
    else imprumutate.push(i);
  });

  const order = proprii.slice(0, count);
  const pool = imprumutate.length > 0 ? imprumutate : proprii;
  for (let i = 0; order.length < count && pool.length > 0; i += 1) {
    order.push(pool[i % pool.length]!);
  }
  return order;
}

const makeRun = (setId: SetId, materie: MaterieId, capitol: string): SessionRun => ({
  v: RUN_VERSION,
  setId,
  materie,
  capitol,
  startedAt: Date.now(),
  finishedAt: null,
  order: buildSet(MATERII[materie].name, capitol),
  qi: 0,
  answers: {},
  revealed: {},
  marks: {},
});

export interface Session {
  phase: SessionPhase;
  run: SessionRun | null;
  /** Setul de pe ecran dacă e încheiat — sursa ecranului de rezultat. */
  result: SessionResult | undefined;
  /** Istoricul seturilor încheiate, pe capitol. */
  results: SessionResults;
  qi: number;
  total: number;
  question: Question;
  answer: OptionKey | undefined;
  isRevealed: boolean;
  isMarked: boolean;
  isCorrect: boolean;
  /** Câte grile din setul în lucru nu sunt încă verificate. */
  ramase: number;
  /** Câte grile sunt corecte / greșite / marcate în setul curent. */
  tally: { corecte: number; gresite: number; marcate: number };
  /** Pornește un set nou pe capitol; setul de pe ecran e înlocuit. */
  start: (materie: MaterieId, c: Chapter) => void;
  /** Redeschide un set încheiat pentru recitire, fără să-i atingă rezultatul. */
  openReview: (setId: SetId) => void;
  /** Reia de la zero setul de pe ecran. */
  restart: () => void;
  /** Încheie setul și îl scrie în istoric. */
  finish: () => void;
  pick: (key: OptionKey) => void;
  /** Enter: verifică răspunsul, iar dacă e deja verificat avansează sau încheie setul. */
  primary: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  toggleMark: () => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** O rulare salvată e folosibilă doar în forma curentă și cu grile care există. */
function isValidRun(value: unknown): value is SessionRun {
  if (!isRecord(value)) return false;
  const { v, setId, materie, capitol, startedAt, finishedAt, order, qi, answers, revealed, marks } = value;
  return (
    v === RUN_VERSION &&
    typeof setId === 'string' &&
    typeof materie === 'string' &&
    materie in MATERII &&
    typeof capitol === 'string' &&
    typeof startedAt === 'number' &&
    (finishedAt === null || typeof finishedAt === 'number') &&
    Array.isArray(order) &&
    order.length > 0 &&
    order.every((i) => typeof i === 'number' && QUESTIONS[i] !== undefined) &&
    typeof qi === 'number' &&
    qi >= 0 &&
    qi < order.length &&
    isRecord(answers) &&
    isRecord(revealed) &&
    isRecord(marks)
  );
}

const isValidResult = (value: unknown): value is SessionResult =>
  isValidRun(value) && value.finishedAt !== null;

const FARA_REZULTATE: SessionResults = {};

export function useSession(): Session {
  const [storedRun, setStoredRun] = usePersistentState<SessionRun | null>('medbuc.session.run', null);
  const [storedResults, setStoredResults] = usePersistentState<SessionResults>(
    'medbuc.session.results',
    FARA_REZULTATE,
  );

  // O rulare salvată în alt format e ignorată; primul set pornit o suprascrie.
  const run = isValidRun(storedRun) ? storedRun : null;

  const results = useMemo<SessionResults>(() => {
    const curate: SessionResults = {};
    const brut: unknown = storedResults;
    if (isRecord(brut)) {
      for (const [id, value] of Object.entries(brut)) {
        if (isValidResult(value)) curate[id] = value;
      }
    }
    return curate;
  }, [storedResults]);

  const result = useMemo<SessionResult | undefined>(
    () => (run && run.finishedAt !== null ? { ...run, finishedAt: run.finishedAt } : undefined),
    [run],
  );

  const patch = useCallback(
    (change: (prev: SessionRun) => SessionRun) =>
      setStoredRun((prev) => (isValidRun(prev) ? change(prev) : prev)),
    [setStoredRun],
  );

  const start = useCallback(
    (materie: MaterieId, c: Chapter) =>
      setStoredRun(makeRun(setIdOf(materie, c), materie, chapterLabel(c))),
    [setStoredRun],
  );

  const openReview = useCallback(
    (setId: SetId) => {
      const salvat = results[setId];
      if (salvat) setStoredRun({ ...salvat, qi: 0 });
    },
    [results, setStoredRun],
  );

  const restart = useCallback(() => patch((p) => makeRun(p.setId, p.materie, p.capitol)), [patch]);

  /** Idempotentă: un set redeschis pentru recitire nu-și poate rescrie rezultatul. */
  const finish = useCallback(() => {
    if (!run || run.finishedAt !== null) return;
    const incheiat: SessionResult = { ...run, finishedAt: Date.now() };
    setStoredResults({ ...results, [incheiat.setId]: incheiat });
    setStoredRun(incheiat);
  }, [results, run, setStoredResults, setStoredRun]);

  // Navigarea mărginește indexul: la ultima grilă nu se mai trece mai departe.
  const next = useCallback(
    () => patch((p) => ({ ...p, qi: Math.min(p.qi + 1, p.order.length - 1) })),
    [patch],
  );
  const prev = useCallback(() => patch((p) => ({ ...p, qi: Math.max(p.qi - 1, 0) })), [patch]);
  const goTo = useCallback(
    (index: number) => patch((p) => ({ ...p, qi: Math.max(0, Math.min(index, p.order.length - 1)) })),
    [patch],
  );

  /** Odată verificată grila — sau odată încheiat setul — răspunsul rămâne blocat. */
  const pick = useCallback(
    (key: OptionKey) =>
      patch((p) =>
        p.finishedAt !== null || p.revealed[p.qi] ? p : { ...p, answers: { ...p.answers, [p.qi]: key } },
      ),
    [patch],
  );

  const primary = useCallback(() => {
    if (!run || run.finishedAt !== null) return;
    if (!run.revealed[run.qi]) {
      if (run.answers[run.qi]) patch((p) => ({ ...p, revealed: { ...p.revealed, [p.qi]: true } }));
      return;
    }
    if (run.qi >= run.order.length - 1) finish();
    else next();
  }, [finish, next, patch, run]);

  const toggleMark = useCallback(
    () => patch((p) => ({ ...p, marks: { ...p.marks, [p.qi]: !p.marks[p.qi] } })),
    [patch],
  );

  const total = run ? run.order.length : 0;
  const qi = run?.qi ?? 0;
  const question = useMemo(() => (run ? questionAt(run, run.qi) : QUESTIONS[0]!), [run]);

  const tally = useMemo(() => {
    if (!run) return { corecte: 0, gresite: 0, marcate: 0 };
    let corecte = 0;
    let vazute = 0;
    run.order.forEach((_, i) => {
      if (!isRevealedAt(run, i)) return;
      vazute += 1;
      if (isCorrectAt(run, i)) corecte += 1;
    });
    return {
      corecte,
      gresite: vazute - corecte,
      marcate: Object.values(run.marks).filter(Boolean).length,
    };
  }, [run]);

  return {
    phase: run === null ? 'gol' : run.finishedAt === null ? 'rulare' : 'rezultat',
    run,
    result,
    results,
    qi,
    total,
    question,
    answer: run?.answers[qi],
    isRevealed: !!run && isRevealedAt(run, qi),
    isMarked: !!run?.marks[qi],
    isCorrect: !!run && isCorrectAt(run, qi),
    ramase: run && run.finishedAt === null ? total - Object.values(run.revealed).filter(Boolean).length : 0,
    tally,
    start,
    openReview,
    restart,
    finish,
    pick,
    primary,
    next,
    prev,
    goTo,
    toggleMark,
  };
}
