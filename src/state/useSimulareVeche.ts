import { useEffect, useMemo } from 'react';
import type { OptionKey, QuestionId } from '../data/questions';
import { usePersistentState } from '../lib/hooks';

export interface SimConfig {
  model: string;
  nr: string;
  durata: string;
  ordine: string;
}

export interface SimRun {
  /**
   * Identitatea lucrării, generată la pornire — devine `sim_runs.id` în bază și
   * `client_key`-ul răspunsurilor, deci o resincronizare nu dublează nimic.
   *
   * Lucrările salvate înainte de sincronizare n-o au; `isSimRun` le acceptă
   * fără ea, iar `useSimulareVeche` o completează la montare, ca o lucrare în curs
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
    // găsesc sunt tratate poziție cu poziție de motorul din bază.
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

/** Citește numai lucrarea veche; nu mai generează, cronometrează sau corectează teste. */
export function useSimulareVeche() {
  const [run, setRun, sterge] = usePersistentState<SimRun | null>(
    'medbuc.sim.run', null, (v): v is SimRun | null => v === null || isSimRun(v),
  );
  useEffect(() => {
    if (run && !run.id) setRun((prev) => prev && !prev.id ? { ...prev, id: crypto.randomUUID() } : prev);
  }, [run, setRun]);
  return useMemo(() => ({ run, sterge }), [run, sterge]);
}
