import { useCallback, useMemo, useState } from 'react';
import type { OptionKey, Question, QuestionId } from '../data/questions';
import { calculeazaRecapitulare, type GrilaDeRecapitulat } from '../lib/recapitulare';
import type { AttemptRow } from '../lib/progres';
import { scoreOf, type SessionScore } from './useSession';

export type RecapitularePhase = 'lista' | 'rulare' | 'rezultat';

export interface Recapitulare {
  id: string;
  phase: RecapitularePhase;
  items: GrilaDeRecapitulat[];
  scadente: GrilaDeRecapitulat[];
  order: QuestionId[];
  /** Golurile se păstrează, ca la `useSession`: o grilă retrasă rămâne poziție. */
  banca: (Question | undefined)[];
  qi: number;
  question: Question | undefined;
  total: number;
  answers: Record<number, OptionKey>;
  revealed: Record<number, boolean>;
  answer: OptionKey | undefined;
  isRevealed: boolean;
  isCorrect: boolean;
  startedAt: number;
  finishedAt: number | null;
  score: SessionScore;
  start: () => void;
  pick: (key: OptionKey) => void;
  primary: () => void;
  finish: () => void;
  reset: () => void;
}
/** Sesiunea de repetare, capturată din grilele scadente la apăsarea „Începe”. */
export function useRecapitulare(
  now: number,
  questions: Question[],
  attempts: readonly AttemptRow[],
): Recapitulare {
  const [id, setId] = useState(() => crypto.randomUUID());
  const [order, setOrder] = useState<QuestionId[]>([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const items = useMemo(() => calculeazaRecapitulare(attempts, questions, now), [attempts, now, questions]);
  const scadente = useMemo(() => items.filter((item) => item.scadenta), [items]);
  const byId = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  /**
   * Golurile se păstrează: compactarea ar muta răspunsurile pe alte grile.
   *
   * `answers` și `revealed` sunt cheiate pe poziție. Un `flatMap` care sare
   * peste grilele lipsă scurtează banca, iar tot ce urmează alunecă cu o poziție
   * — răspunsul elevului ar intra în jurnalul imutabil pe altă grilă. Ecranul
   * știe deja să arate „Grila nu mai este disponibilă" pentru un gol.
   */
  const banca = useMemo(() => order.map((questionId) => byId.get(questionId)), [byId, order]);
  const question = banca[qi];
  const answer = answers[qi];
  const isRevealed = !!revealed[qi];
  const isCorrect = question !== undefined && answer === question.correct;
  const total = banca.length;

  const start = useCallback(() => {
    if (scadente.length === 0) return;
    setId(crypto.randomUUID());
    setOrder(scadente.map((item) => item.question.id));
    setQi(0);
    setAnswers({});
    setRevealed({});
    setStartedAt(Date.now());
    setFinishedAt(null);
  }, [scadente]);

  const pick = useCallback(
    (key: OptionKey) => {
      if (revealed[qi]) return;
      setAnswers((prev) => ({ ...prev, [qi]: key }));
    },
    [qi, revealed],
  );

  const finish = useCallback(() => setFinishedAt((value) => value ?? Date.now()), []);
  const primary = useCallback(() => {
    if (!revealed[qi]) {
      if (answers[qi]) setRevealed((prev) => ({ ...prev, [qi]: true }));
      return;
    }
    if (qi >= total - 1) finish();
    else setQi((index) => Math.min(index + 1, total - 1));
  }, [answers, finish, qi, revealed, total]);

  const reset = useCallback(() => {
    setOrder([]);
    setQi(0);
    setAnswers({});
    setRevealed({});
    setFinishedAt(null);
  }, []);

  const score = useMemo(
    () => scoreOf(banca, answers, (finishedAt ?? now) - startedAt),
    [answers, banca, finishedAt, now, startedAt],
  );
  const phase: RecapitularePhase = order.length === 0 ? 'lista' : finishedAt === null ? 'rulare' : 'rezultat';

  return useMemo<Recapitulare>(
    () => ({
      id,
      phase,
      items,
      scadente,
      order,
      banca,
      qi,
      question,
      total,
      answers,
      revealed,
      answer,
      isRevealed,
      isCorrect,
      startedAt,
      finishedAt,
      score,
      start,
      pick,
      primary,
      finish,
      reset,
    }),
    [
      answer,
      answers,
      banca,
      finish,
      finishedAt,
      id,
      isCorrect,
      isRevealed,
      items,
      order,
      phase,
      pick,
      primary,
      qi,
      question,
      reset,
      revealed,
      scadente,
      score,
      start,
      startedAt,
      total,
    ],
  );
}
