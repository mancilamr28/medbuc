import { useCallback, useMemo, useState } from 'react';
import { QUESTIONS, type OptionKey, type Question } from '../data/questions';

export interface Session {
  /** Indexul grilei curente. */
  qi: number;
  question: Question;
  total: number;
  answers: Record<number, OptionKey>;
  revealed: Record<number, boolean>;
  marked: Record<number, boolean>;
  answer: OptionKey | undefined;
  isRevealed: boolean;
  isMarked: boolean;
  isCorrect: boolean;
  startedAt: number;
  pick: (key: OptionKey) => void;
  /** Enter: verifică răspunsul, iar dacă e deja verificat trece mai departe. */
  primary: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  toggleMark: () => void;
  /** Câte grile sunt corecte / greșite / marcate în sesiunea curentă. */
  tally: { corecte: number; gresite: number; marcate: number };
}

export function useSession(): Session {
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [startedAt] = useState(() => Date.now());

  const total = QUESTIONS.length;
  const question = QUESTIONS[qi] ?? QUESTIONS[0]!;
  const answer = answers[qi];
  const isRevealed = !!revealed[qi];
  const isCorrect = answer === question.correct;

  /** Odată verificată grila, răspunsul rămâne blocat. */
  const pick = useCallback(
    (key: OptionKey) => {
      if (revealed[qi]) return;
      setAnswers((prev) => ({ ...prev, [qi]: key }));
    },
    [qi, revealed],
  );

  const goTo = useCallback((index: number) => setQi(((index % total) + total) % total), [total]);
  const next = useCallback(() => setQi((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setQi((i) => (i - 1 + total) % total), [total]);

  const primary = useCallback(() => {
    if (!revealed[qi]) {
      if (answers[qi]) setRevealed((prev) => ({ ...prev, [qi]: true }));
      return;
    }
    next();
  }, [answers, next, qi, revealed]);

  const toggleMark = useCallback(() => setMarked((prev) => ({ ...prev, [qi]: !prev[qi] })), [qi]);

  const tally = useMemo(() => {
    let corecte = 0;
    let gresite = 0;
    QUESTIONS.forEach((q, i) => {
      if (!revealed[i]) return;
      if (answers[i] === q.correct) corecte += 1;
      else gresite += 1;
    });
    return { corecte, gresite, marcate: Object.values(marked).filter(Boolean).length };
  }, [answers, marked, revealed]);

  return {
    qi,
    question,
    total,
    answers,
    revealed,
    marked,
    answer,
    isRevealed,
    isMarked: !!marked[qi],
    isCorrect,
    startedAt,
    pick,
    primary,
    next,
    prev,
    goTo,
    toggleMark,
    tally,
  };
}
