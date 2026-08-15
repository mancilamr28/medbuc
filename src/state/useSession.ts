import { useCallback, useMemo, useState } from 'react';
import type { ChapterId } from '../data/chapters';
import type { OptionKey, Question } from '../data/questions';

export interface SessionScore {
  corecte: number;
  gresite: number;
  neraspunse: number;
  total: number;
  /** Procentul se raportează la total, deci grilele fără răspuns contează în minus. */
  pct: number;
  durataMs: number;
}

/**
 * Bilanțul unei sesiuni, ca funcție pură — ia grilele și răspunsurile, nu starea
 * hook-ului, ca să poată fi testat direct.
 *
 * Spre deosebire de `tally`, numără orice grilă cu răspuns ales, chiar
 * neverificată: „Încheie sesiunea" nu are voie să piardă un răspuns. Procentul e
 * raportat la total, deci grilele fără răspuns contează în minus.
 */
export function scoreOf(
  questions: readonly Question[],
  answers: Record<number, OptionKey>,
  durataMs: number,
): SessionScore {
  let corecte = 0;
  let raspunse = 0;
  questions.forEach((q, i) => {
    const ales = answers[i];
    if (ales === undefined) return;
    raspunse += 1;
    if (ales === q.correct) corecte += 1;
  });
  const total = questions.length;
  return {
    corecte,
    gresite: raspunse - corecte,
    neraspunse: total - raspunse,
    total,
    pct: total === 0 ? 0 : Math.round((corecte / total) * 100),
    durataMs: Math.max(0, durataMs),
  };
}

/**
 * Banca restrânsă la capitolele cerute.
 *
 * Lista goală înseamnă „toată biblioteca" — aceeași convenție ca la coloana
 * `sessions.chapter_ids` din bază, ca să nu existe două înțelesuri pentru gol.
 * În cazul acela se întoarce chiar banca primită, nu o copie: identitatea ei e
 * ce ține memo-ul din `useSession` să nu recalculeze la fiecare randare.
 */
export function filtreazaCapitole(questions: Question[], capitole: readonly ChapterId[]): Question[] {
  if (capitole.length === 0) return questions;
  const cerute = new Set(capitole);
  return questions.filter((q) => cerute.has(q.capId));
}

export interface Session {
  /** Identificator stabil pentru sincronizarea sesiunii finalizate. */
  id: string;
  /**
   * Capitolele din care s-a compus sesiunea; gol înseamnă toată biblioteca.
   * Se scrie ca atare în `sessions.chapter_ids` la finalul sesiunii.
   */
  capitole: ChapterId[];
  /** Indexul grilei curente. */
  qi: number;
  /**
   * Grila curentă. Poate lipsi: banca vine acum din bază, deci există momentul
   * de dinaintea încărcării și cazul unei biblioteci încă goale. Ecranul de
   * grile tratează amândouă înainte să randeze rezolvarea.
   */
  question: Question | undefined;
  /** Banca sesiunii, ca ecranele să nu mai importe una proprie. */
  questions: Question[];
  total: number;
  answers: Record<number, OptionKey>;
  revealed: Record<number, boolean>;
  marked: Record<number, boolean>;
  answer: OptionKey | undefined;
  isRevealed: boolean;
  isMarked: boolean;
  isCorrect: boolean;
  startedAt: number;
  /** Momentul finalizării; rămâne stabil pentru sincronizare și scor. */
  finishedAt: number | null;
  /** Sesiunea a fost încheiată: ecranul de grile arată panoul de rezultat. */
  finished: boolean;
  pick: (key: OptionKey) => void;
  /** Enter: verifică răspunsul, iar dacă e deja verificat trece mai departe. */
  primary: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  toggleMark: () => void;
  /** Încheie sesiunea și îngheață timpul; apelurile ulterioare nu schimbă nimic. */
  finish: () => void;
  /**
   * Deschide o sesiune nouă peste capitolele date; lista goală ia toată
   * biblioteca. Ce era început se pierde — o sesiune trăiește doar în memorie.
   */
  start: (capitole: ChapterId[]) => void;
  /** Reia sesiunea de la prima grilă, pe aceleași capitole, cu cronometrul de la zero. */
  restart: () => void;
  /** Câte grile sunt corecte / greșite / marcate în sesiunea curentă. */
  tally: { corecte: number; gresite: number; marcate: number };
  /** Bilanțul final, raportat la toate grilele din sesiune. */
  score: SessionScore;
}

/**
 * Sesiunea de exersare, peste banca primită.
 *
 * Banca vine prin parametru, nu dintr-un import: din Faza 4 grilele se citesc
 * din Supabase, iar `AppProvider` le pasează din `ContentContext`. Testele trec
 * `QUESTIONS` din `src/data/`, care rămâne fixtură.
 *
 * Peste banca aia se așază capitolele sesiunii: hook-ul ține **biblioteca
 * întreagă** ca parametru și restrânge singur. Ecranele care numără grile pe
 * capitol au deci nevoie de banca de la `useApp().questions`, nu de
 * `session.questions` — altfel „Exersează" pe un capitol ar face ca celelalte
 * capitole să pară goale.
 */
export function useSession(questions: Question[]): Session {
  const [id, setId] = useState(() => crypto.randomUUID());
  const [capitole, setCapitole] = useState<ChapterId[]>([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const banca = useMemo(() => filtreazaCapitole(questions, capitole), [capitole, questions]);

  const total = banca.length;
  const question = banca[qi];
  const answer = answers[qi];
  const isRevealed = !!revealed[qi];
  const isCorrect = question !== undefined && answer === question.correct;

  /** Odată verificată grila, răspunsul rămâne blocat. */
  const pick = useCallback(
    (key: OptionKey) => {
      if (revealed[qi]) return;
      setAnswers((prev) => ({ ...prev, [qi]: key }));
    },
    [qi, revealed],
  );

  /** Navigarea se oprește la capete: ultima grilă trebuie să rămână ultima. */
  const goTo = useCallback((index: number) => setQi(Math.max(0, Math.min(index, total - 1))), [total]);
  const next = useCallback(() => setQi((i) => Math.min(i + 1, total - 1)), [total]);
  const prev = useCallback(() => setQi((i) => Math.max(i - 1, 0)), []);

  /** Idempotent: o sesiune încheiată nu-și rescrie momentul de final. */
  const finish = useCallback(() => setFinishedAt((f) => f ?? Date.now()), []);

  const start = useCallback((capitole: ChapterId[]) => {
    setCapitole(capitole);
    setId(crypto.randomUUID());
    setQi(0);
    setAnswers({});
    setRevealed({});
    setMarked({});
    setFinishedAt(null);
    setStartedAt(Date.now());
  }, []);

  /** Aceleași capitole, de la zero: „Reia sesiunea" nu are voie să lărgească bazinul. */
  const restart = useCallback(() => start(capitole), [capitole, start]);

  const primary = useCallback(() => {
    if (!revealed[qi]) {
      if (answers[qi]) setRevealed((prev) => ({ ...prev, [qi]: true }));
      return;
    }
    if (qi >= total - 1) finish();
    else next();
  }, [answers, finish, next, qi, revealed, total]);

  const toggleMark = useCallback(() => setMarked((prev) => ({ ...prev, [qi]: !prev[qi] })), [qi]);

  const tally = useMemo(() => {
    let corecte = 0;
    let gresite = 0;
    banca.forEach((q, i) => {
      if (!revealed[i]) return;
      if (answers[i] === q.correct) corecte += 1;
      else gresite += 1;
    });
    return { corecte, gresite, marcate: Object.values(marked).filter(Boolean).length };
  }, [answers, banca, marked, revealed]);

  const score = useMemo<SessionScore>(
    () => scoreOf(banca, answers, (finishedAt ?? Date.now()) - startedAt),
    [answers, banca, finishedAt, startedAt],
  );

  /**
   * `AppState`'s own `useMemo` can only skip recomputing when `session` keeps
   * the same identity across renders that changed nothing here. Returning a
   * fresh object literal every render (as this used to) made that outer memo
   * inert — every field on it, including `session`, was "new" every time.
   */
  return useMemo<Session>(
    () => ({
      id,
      capitole,
      qi,
      question,
      questions: banca,
      total,
      answers,
      revealed,
      marked,
      answer,
      isRevealed,
      isMarked: !!marked[qi],
      isCorrect,
      startedAt,
      finishedAt,
      finished: finishedAt !== null,
      pick,
      primary,
      next,
      prev,
      goTo,
      toggleMark,
      finish,
      start,
      restart,
      tally,
      score,
    }),
    [
      answer,
      answers,
      banca,
      capitole,
      finish,
      finishedAt,
      goTo,
      id,
      isCorrect,
      isRevealed,
      marked,
      next,
      pick,
      prev,
      primary,
      qi,
      question,
      restart,
      revealed,
      score,
      start,
      startedAt,
      tally,
      toggleMark,
      total,
    ],
  );
}
