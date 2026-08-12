import { useCallback, useMemo } from 'react';
import { QUESTIONS, type OptionKey, type Question } from '../data/questions';
import { usePersistentState } from '../lib/hooks';

export type SimPhase = 'config' | 'rulare';

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

interface SimRun {
  startedAt: number;
  /** Momentul la care expiră timpul — cronometrul curge și cu fereastra închisă. */
  endsAt: number;
  config: SimConfig;
  /** Ordinea grilelor: pentru fiecare poziție, indexul din banca de întrebări. */
  order: number[];
  qi: number;
  answers: Record<number, OptionKey>;
  marks: Record<number, boolean>;
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
    typeof r.qi === 'number' &&
    Array.isArray(r.order) &&
    r.order.length > 0 &&
    r.order.every((i) => typeof i === 'number' && i >= 0 && i < QUESTIONS.length) &&
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
  /** Predarea lucrării — sau expirarea timpului. */
  finish: () => void;
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
function buildOrder(count: number, ordine: string): number[] {
  const base = QUESTIONS.map((_, i) => i);
  const grouped = [...base].sort((a, b) => {
    const qa = QUESTIONS[a]!;
    const qb = QUESTIONS[b]!;
    return qa.materie.localeCompare(qb.materie, 'ro') || qa.cap.localeCompare(qb.cap, 'ro');
  });

  const order: number[] = [];
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
      config,
      order: buildOrder(count, config.ordine),
      qi: 0,
      answers: {},
      marks: {},
    });
  }, [config, setRun]);

  const finish = useCallback(() => setRun(null), [setRun]);

  const secondsLeft = run ? Math.max(0, Math.round((run.endsAt - now) / 1000)) : 0;
  const expired = !!run && secondsLeft === 0;

  const patch = useCallback(
    (change: (prev: SimRun) => SimRun) => setRun((prev) => (prev ? change(prev) : prev)),
    [setRun],
  );

  const total = run ? run.order.length : Number.parseInt(config.nr, 10) || 100;
  const qi = run?.qi ?? 0;
  const question = useMemo(() => {
    const index = run ? (run.order[qi] ?? 0) : 0;
    return QUESTIONS[index] ?? QUESTIONS[0]!;
  }, [qi, run]);

  const goTo = useCallback(
    (index: number) => patch((prev) => ({ ...prev, qi: Math.max(0, Math.min(index, prev.order.length - 1)) })),
    [patch],
  );

  return {
    phase: run && !expired ? 'rulare' : 'config',
    config,
    setConfig,
    start,
    finish,
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
