import { useCallback, useEffect, useMemo } from 'react';
import {
  questionCap,
  questionMaterie,
  type OptionKey,
  type Question,
  type QuestionId,
} from '../data/questions';
import { usePersistentState } from '../lib/hooks';
import { TAXONOMIE_GOALA, type Taxonomie } from '../lib/taxonomie';

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
  /**
   * Identitatea lucrării, generată la pornire — devine `sim_runs.id` în bază și
   * `client_key`-ul răspunsurilor, deci o resincronizare nu dublează nimic.
   *
   * Lucrările salvate înainte de sincronizare n-o au; `isSimRun` le acceptă
   * fără ea, iar `useSimulare` o completează la montare, ca o lucrare în curs
   * să nu fie aruncată doar fiindcă a apărut un câmp nou.
   */
  id: string;
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

/**
 * Grila de pe poziția `i` din lucrare (pozițiile indexează `order`, nu banca).
 *
 * Poate lipsi, și asta e o schimbare deliberată: până acum cădea pe `QUESTIONS[0]`,
 * adică o lucrare care trimitea la o grilă dispărută afișa **altă grilă**, tăcut.
 * Cu banca venind din bază cazul devine obișnuit — o grilă retrasă după ce cineva
 * a început lucrarea — deci golul se arată ca gol.
 */
export const questionAtPosition = (
  run: SimRun,
  i: number,
  byId: ReadonlyMap<QuestionId, Question>,
): Question | undefined => {
  const id = run.order[i];
  return id !== undefined ? byId.get(id) : undefined;
};

export function scoreOf(
  run: SimRun,
  finishedAt: number,
  byId: ReadonlyMap<QuestionId, Question>,
): SimScore {
  let corecte = 0;
  let raspunse = 0;
  run.order.forEach((_, i) => {
    const ales = run.answers[i];
    if (ales === undefined) return;
    raspunse += 1;
    if (ales === questionAtPosition(run, i, byId)?.correct) corecte += 1;
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
    // `id` lipsește din lucrările salvate înainte de sincronizare. Se acceptă
    // fără ea și se completează la montare: o lucrare în curs nu se aruncă
    // fiindcă schema clientului a crescut.
    (r.id === undefined || (typeof r.id === 'string' && r.id.length > 0)) &&
    typeof r.startedAt === 'number' &&
    typeof r.endsAt === 'number' &&
    // Lucrările salvate înainte de ecranul de rezultat nu au `finishedAt`.
    (r.finishedAt === undefined || r.finishedAt === null || typeof r.finishedAt === 'number') &&
    typeof r.qi === 'number' &&
    Array.isArray(r.order) &&
    r.order.length > 0 &&
    // Se verifică forma, nu apartenența la bancă. Până la Faza 4 banca era un
    // array compilat, deci `isQuestionId` putea decide dacă un id există; acum
    // grilele vin din bază, iar o grilă scrisă din Admin n-are cum să fie în
    // fișier. Cu verificarea veche, o lucrare care conține o grilă nouă ar fi
    // fost respinsă întreagă și aruncată la reîncărcare. Id-urile care nu se mai
    // găsesc sunt tratate poziție cu poziție de `questionAtPosition`.
    r.order.every((id) => typeof id === 'string' && id.length > 0) &&
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
  /**
   * Ora predării, cu expirarea inclusă — `null` cât timp lucrarea e în curs.
   * Aceeași valoare este folosită de ecran și de calculul rezultatului.
   */
  finishedAt: number | null;
  /** Bilanțul lucrării; zerouri cât timp nu există o lucrare. */
  score: SimScore;
  run: SimRun | null;
  /** Poate lipsi dacă lucrarea trimite la o grilă care nu mai e în bibliotecă. */
  question: Question | undefined;
  /** Grila de pe o poziție anume, legată de banca încărcată. */
  questionAt: (i: number) => Question | undefined;
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
 * Simularea repetă banca până la numărul cerut, respectând ordinea aleasă.
 *
 * Repetarea e o consecință a bibliotecii mici, nu o intenție: când banca ajunge
 * la câteva sute de grile, `count` va fi sub dimensiunea ei și fiecare grilă va
 * apărea o dată. Cu banca goală întoarce o listă goală, iar ecranul de simulări
 * refuză să pornească.
 */
export function buildOrder(
  count: number,
  ordine: string,
  questions: Question[],
  taxonomie: Taxonomie = TAXONOMIE_GOALA,
): QuestionId[] {
  if (questions.length === 0) return [];

  const base = questions.map((q) => q.id);
  const grouped = [...questions]
    .sort(
      (a, b) =>
        questionMaterie(a, taxonomie).localeCompare(questionMaterie(b, taxonomie), 'ro') ||
        questionCap(a, taxonomie).localeCompare(questionCap(b, taxonomie), 'ro'),
    )
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

export function useSimulare(
  now: number,
  questions: Question[],
  taxonomie: Taxonomie = TAXONOMIE_GOALA,
): Simulare {
  // `order` ține id-uri, deci căutarea are nevoie de o hartă peste banca încărcată
  // — nu mai poate fi harta de la nivel de modul, construită din fișier.
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

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

  // O lucrare începută înainte ca lucrările să se sincronizeze n-are `id`.
  // Se completează o singură dată, în loc să fie respinsă de validator și
  // aruncată — altfel apariția câmpului ar șterge un examen în curs.
  useEffect(() => {
    if (run && !run.id) setRun((prev) => (prev && !prev.id ? { ...prev, id: crypto.randomUUID() } : prev));
  }, [run, setRun]);

  const start = useCallback(() => {
    const count = Number.parseInt(config.nr, 10) || 100;
    const startedAt = Date.now();
    setRun({
      id: crypto.randomUUID(),
      startedAt,
      endsAt: startedAt + minutesOf(config.durata) * 60_000,
      finishedAt: null,
      config,
      order: buildOrder(count, config.ordine, questions, taxonomie),
      qi: 0,
      answers: {},
      marks: {},
    });
  }, [config, questions, setRun, taxonomie]);

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
    () =>
      run && finishedAt !== null
        ? scoreOf(run, finishedAt, byId)
        : run
          ? scoreOf(run, now, byId)
          : EMPTY_SCORE,
    [byId, finishedAt, now, run],
  );

  const patch = useCallback(
    (change: (prev: SimRun) => SimRun) => setRun((prev) => (prev ? change(prev) : prev)),
    [setRun],
  );

  const total = run ? run.order.length : Number.parseInt(config.nr, 10) || 100;
  const qi = run?.qi ?? 0;
  const questionAt = useCallback(
    (i: number) => (run ? questionAtPosition(run, i, byId) : undefined),
    [byId, run],
  );
  const question = useMemo(() => questionAt(qi), [qi, questionAt]);

  const goTo = useCallback(
    (index: number) => patch((prev) => ({ ...prev, qi: Math.max(0, Math.min(index, prev.order.length - 1)) })),
    [patch],
  );

  // Erau literale inline în obiectul întors, deci o identitate nouă la fiecare
  // render — asta ar fi anulat memoizarea de mai jos oricum s-ar fi scris ea.
  const pick = useCallback(
    (key: OptionKey) => patch((prev) => ({ ...prev, answers: { ...prev.answers, [prev.qi]: key } })),
    [patch],
  );
  const next = useCallback(
    () => patch((prev) => ({ ...prev, qi: Math.min(prev.qi + 1, prev.order.length - 1) })),
    [patch],
  );
  const prev = useCallback(() => patch((p) => ({ ...p, qi: Math.max(p.qi - 1, 0) })), [patch]);
  const toggleMark = useCallback(
    () => patch((p) => ({ ...p, marks: { ...p.marks, [p.qi]: !p.marks[p.qi] } })),
    [patch],
  );

  const answer = run?.answers[qi];
  const isMarked = !!run?.marks[qi];
  const completed = run ? Object.keys(run.answers).length : 0;
  const phase = !run ? 'config' : finishedAt !== null ? 'rezultat' : 'rulare';

  /**
   * Aceeași grijă ca la `useSession`: `AppState` ține `sim` într-un `useMemo`
   * al lui, care nu poate sări peste recalcul dacă `sim` are o identitate nouă
   * la fiecare render, indiferent ce s-a schimbat de fapt aici.
   */
  return useMemo<Simulare>(
    () => ({
      phase,
      config,
      setConfig,
      start,
      finish,
      reset,
      expired,
      finishedAt,
      score,
      run,
      question,
      questionAt,
      qi,
      total,
      answer,
      isMarked,
      completed,
      secondsLeft,
      pick,
      next,
      prev,
      goTo,
      toggleMark,
    }),
    [
      answer,
      completed,
      config,
      expired,
      finish,
      finishedAt,
      goTo,
      isMarked,
      phase,
      pick,
      next,
      prev,
      qi,
      question,
      questionAt,
      reset,
      run,
      score,
      secondsLeft,
      setConfig,
      start,
      toggleMark,
      total,
    ],
  );
}
