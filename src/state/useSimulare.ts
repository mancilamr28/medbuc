import { useCallback, useMemo } from 'react';
import {
  QUESTIONS,
  isQuestionId,
  questionById,
  type OptionKey,
  type Question,
  type QuestionId,
} from '../data/questions';
import { usePersistentState } from '../lib/hooks';

export type SimPhase = 'config' | 'rulare' | 'rezultat';

export interface SimConfig {
  model: string;
  nr: string;
  durata: string;
  ordine: string;
}

export const SIM_FIELDS: { key: keyof SimConfig; label: string; options: string[] }[] = [
  { key: 'model', label: 'Model de examen', options: ['UMFCD · Medicină', 'UMFCD · Medicină dentară', 'UMFCD · Farmacie'] },
  { key: 'nr', label: 'Număr de grile', options: ['100', '80', '60'] },
  { key: 'durata', label: 'Durată', options: ['180 minute', '150 minute', '120 minute'] },
  { key: 'ordine', label: 'Ordinea grilelor', options: ['Amestecate', 'Grupate pe materie'] },
];

export const DEFAULT_SIM_CONFIG: SimConfig = {
  model: 'UMFCD · Medicină',
  nr: '100',
  durata: '180 minute',
  ordine: 'Amestecate',
};

export interface SimRun {
  startedAt: number;
  /** Momentul la care expiră timpul — cronometrul curge și cu fereastra închisă. */
  endsAt: number;
  /**
   * Momentul predării. Lucrarea nu se șterge la predare: rămâne salvată, ca
   * ecranul de rezultat să poată arăta scorul și explicațiile.
   */
  finishedAt: number | null;
  config: SimConfig;
  /**
   * Ordinea grilelor: pentru fiecare poziție, id-ul grilei. Id-uri, nu indici —
   * o lucrare salvată nu are voie să-și schimbe conținutul când se adaugă o
   * grilă nouă în bancă.
   */
  order: QuestionId[];
  qi: number;
  answers: Record<number, OptionKey>;
  marks: Record<number, boolean>;
}

export interface SimScore {
  corecte: number;
  gresite: number;
  neraspunse: number;
  total: number;
  /** Punctaj UMFCD: grila nemarcată valorează 0, deci procentul e din total. */
  pct: number;
  durataMs: number;
}

const EMPTY_SCORE: SimScore = { corecte: 0, gresite: 0, neraspunse: 0, total: 0, pct: 0, durataMs: 0 };

/** Grila de pe poziția `i` din lucrare (pozițiile indexează `order`, nu banca). */
export const questionAtPosition = (run: SimRun, i: number): Question => {
  const id = run.order[i];
  return (id !== undefined ? questionById(id) : undefined) ?? QUESTIONS[0]!;
};

export function scoreOf(run: SimRun, finishedAt: number): SimScore {
  let corecte = 0;
  let raspunse = 0;
  run.order.forEach((_, i) => {
    const ales = run.answers[i];
    if (ales === undefined) return;
    raspunse += 1;
    if (ales === questionAtPosition(run, i).correct) corecte += 1;
  });
  const total = run.order.length;
  return {
    corecte,
    gresite: raspunse - corecte,
    neraspunse: total - raspunse,
    total,
    pct: total === 0 ? 0 : Math.round((corecte / total) * 100),
    durataMs: Math.max(0, finishedAt - run.startedAt),
  };
}

/**
 * `SimRun` ajunge în localStorage, deci poate rămâne de la o versiune mai veche
 * sau poate fi modificat manual. Fără verificarea asta, un `order` lipsă arunca
 * un TypeError la prima randare și lăsa aplicația pe ecran alb la fiecare reload.
 */
const isSimRun = (v: unknown): v is SimRun => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Partial<SimRun>;
  return (
    typeof r.startedAt === 'number' &&
    typeof r.endsAt === 'number' &&
    // Lucrările salvate înainte de ecranul de rezultat nu au `finishedAt`.
    (r.finishedAt === undefined || r.finishedAt === null || typeof r.finishedAt === 'number') &&
    typeof r.qi === 'number' &&
    Array.isArray(r.order) &&
    r.order.length > 0 &&
    // Id-uri care chiar există în bancă: o lucrare de la o versiune mai veche
    // (care salva indici) sau cu grile șterse între timp e respinsă, nu crapă.
    r.order.every(isQuestionId) &&
    r.qi >= 0 &&
    r.qi < r.order.length &&
    typeof r.config === 'object' &&
    r.config !== null &&
    typeof r.answers === 'object' &&
    r.answers !== null &&
    typeof r.marks === 'object' &&
    r.marks !== null
  );
};

export interface Simulare {
  phase: SimPhase;
  config: SimConfig;
  setConfig: (key: keyof SimConfig, value: string) => void;
  start: () => void;
  /** Predarea lucrării. Idempotentă: lucrarea rămâne salvată, cu ora predării. */
  finish: () => void;
  /** Renunță la lucrarea încheiată și revine la configurare. */
  reset: () => void;
  /** Timpul a expirat, deci lucrarea s-a încheiat de la sine. */
  expired: boolean;
  /** Bilanțul lucrării; zerouri cât timp nu există o lucrare. */
  score: SimScore;
  run: SimRun | null;
  question: Question;
  qi: number;
  total: number;
  answer: OptionKey | undefined;
  isMarked: boolean;
  completed: number;
  secondsLeft: number;
  pick: (key: OptionKey) => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  toggleMark: () => void;
}

const minutesOf = (durata: string): number => Number.parseInt(durata, 10) || 180;

/**
 * Banca de întrebări are șase grile; simularea le repetă până la numărul cerut,
 * respectând ordinea aleasă în configurare.
 */
export function buildOrder(count: number, ordine: string): QuestionId[] {
  const base = QUESTIONS.map((q) => q.id);
  const grouped = [...QUESTIONS]
    .sort((a, b) => a.materie.localeCompare(b.materie, 'ro') || a.cap.localeCompare(b.cap, 'ro'))
    .map((q) => q.id);

  const order: QuestionId[] = [];
  for (let i = 0; i < count; i += 1) {
    const pool = ordine === 'Grupate pe materie' ? grouped : base;
    order.push(pool[i % pool.length]!);
  }

  if (ordine !== 'Grupate pe materie') {
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
  }

  return order;
}

export function useSimulare(now: number): Simulare {
  const [config, setConfigState] = usePersistentState<SimConfig>('medbuc.sim.config', DEFAULT_SIM_CONFIG);
  const [run, setRun] = usePersistentState<SimRun | null>(
    'medbuc.sim.run',
    null,
    (v): v is SimRun | null => v === null || isSimRun(v),
  );

  const setConfig = useCallback(
    (key: keyof SimConfig, value: string) => setConfigState((prev) => ({ ...prev, [key]: value })),
    [setConfigState],
  );

  const start = useCallback(() => {
    const count = Number.parseInt(config.nr, 10) || 100;
    const startedAt = Date.now();
    setRun({
      startedAt,
      endsAt: startedAt + minutesOf(config.durata) * 60_000,
      finishedAt: null,
      config,
      order: buildOrder(count, config.ordine),
      qi: 0,
      answers: {},
      marks: {},
    });
  }, [config, setRun]);

  /**
   * Predarea păstrează lucrarea și notează ora. Ștergerea ei aici a fost multă
   * vreme motivul pentru care „Predă lucrarea" arunca examenul fără niciun scor.
   */
  const finish = useCallback(
    () => setRun((prev) => (prev && prev.finishedAt === null ? { ...prev, finishedAt: Date.now() } : prev)),
    [setRun],
  );

  const reset = useCallback(() => setRun(null), [setRun]);

  const secondsLeft = run ? Math.max(0, Math.round((run.endsAt - now) / 1000)) : 0;
  const expired = !!run && secondsLeft === 0;

  // Expirarea încheie lucrarea fără să o piardă: `finishedAt` se deduce din
  // `endsAt`, deci rezultatul e același și după o reîncărcare.
  const finishedAt = run ? (run.finishedAt ?? (expired ? run.endsAt : null)) : null;
  const score = useMemo(
    () => (run && finishedAt !== null ? scoreOf(run, finishedAt) : run ? scoreOf(run, now) : EMPTY_SCORE),
    [finishedAt, now, run],
  );

  const patch = useCallback(
    (change: (prev: SimRun) => SimRun) => setRun((prev) => (prev ? change(prev) : prev)),
    [setRun],
  );

  const total = run ? run.order.length : Number.parseInt(config.nr, 10) || 100;
  const qi = run?.qi ?? 0;
  const question = useMemo(() => (run ? questionAtPosition(run, qi) : QUESTIONS[0]!), [qi, run]);

  const goTo = useCallback(
    (index: number) => patch((prev) => ({ ...prev, qi: Math.max(0, Math.min(index, prev.order.length - 1)) })),
    [patch],
  );

  return {
    phase: !run ? 'config' : finishedAt !== null ? 'rezultat' : 'rulare',
    config,
    setConfig,
    start,
    finish,
    reset,
    expired,
    score,
    run,
    question,
    qi,
    total,
    answer: run?.answers[qi],
    isMarked: !!run?.marks[qi],
    completed: run ? Object.keys(run.answers).length : 0,
    secondsLeft,
    pick: (key) => patch((prev) => ({ ...prev, answers: { ...prev.answers, [prev.qi]: key } })),
    next: () => patch((prev) => ({ ...prev, qi: Math.min(prev.qi + 1, prev.order.length - 1) })),
    prev: () => patch((prev) => ({ ...prev, qi: Math.max(prev.qi - 1, 0) })),
    goTo,
    toggleMark: () => patch((prev) => ({ ...prev, marks: { ...prev.marks, [prev.qi]: !prev.marks[prev.qi] } })),
  };
}
