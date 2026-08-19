import { useCallback, useMemo, useState } from 'react';
import type { ChapterId } from '../data/chapters';
import type { OptionKey, Question, QuestionSursa } from '../data/questions';

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
 * Banca restrânsă la capitolele și sursele cerute.
 *
 * Lista goală înseamnă „toată biblioteca" / „orice sursă" — aceeași convenție ca
 * la coloana `sessions.chapter_ids` din bază, ca să nu existe două înțelesuri
 * pentru gol. Fără niciun filtru se întoarce chiar banca primită, nu o copie:
 * identitatea ei e ce ține memo-ul din `useSession` să nu recalculeze la fiecare
 * randare.
 */
export function filtreazaCapitole(
  questions: Question[],
  capitole: readonly ChapterId[],
  surse: readonly QuestionSursa[] = [],
): Question[] {
  if (capitole.length === 0 && surse.length === 0) return questions;
  const cerute = capitole.length > 0 ? new Set(capitole) : null;
  const surseCerute = surse.length > 0 ? new Set(surse) : null;
  return questions.filter(
    (q) => (!cerute || cerute.has(q.capId)) && (!surseCerute || surseCerute.has(q.sursa)),
  );
}

export interface Session {
  /** Identificator stabil pentru sincronizarea sesiunii finalizate. */
  id: string;
  /**
   * Capitolele din care s-a compus sesiunea; gol înseamnă toată biblioteca.
   * Se scrie ca atare în `sessions.chapter_ids` la finalul sesiunii.
   */
  capitole: ChapterId[];
  /** Sursele din care s-a compus sesiunea; gol înseamnă orice sursă. */
  surse: QuestionSursa[];
  /** Indexul grilei curente. */
  qi: number;
  /**
   * Grila curentă. Poate lipsi: banca vine acum din bază, deci există momentul
   * de dinaintea încărcării și cazul unei biblioteci încă goale. Ecranul de
   * grile tratează amândouă înainte să randeze rezolvarea.
   */
  question: Question | undefined;
  /**
   * Banca sesiunii: biblioteca restrânsă la `capitole`.
   *
   * Se numește altfel decât `useApp().questions` intenționat. Cele două sunt
   * amândouă `Question[]` și stau la o linie de destructurare una de alta, iar
   * bug-ul care a impus scopul pe capitole a fost exact confuzia dintre ele —
   * `Materii` număra biblioteca din bancă. Cu nume diferite, greșeala nu mai
   * compilează în loc să dea o cifră greșită.
   */
  banca: Question[];
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
  /** `start()` a fost chemată măcar o dată de la încărcarea aplicației. */
  hasStarted: boolean;
  /**
   * Ecranul de grile trebuie să arate configurarea (materie, scop, sursă) în
   * loc de sesiunea curentă: fie nu a fost pornită încă nicio sesiune, fie
   * elevul a cerut explicit una nouă prin `cereConfigurare`.
   */
  configPending: boolean;
  /**
   * Redeschide configurarea fără să atingă sesiunea curentă — o sesiune
   * neterminată nu se pierde, doar rămâne ascunsă până la un nou `start`.
   */
  cereConfigurare: () => void;
  /**
   * Opusul lui `cereConfigurare`: renunță la configurare fără să pornească
   * nimic nou, revenind la sesiunea deja în curs. N-are efect dacă nu există
   * încă nicio sesiune — `configPending` ar rămâne oricum adevărat.
   */
  renuntaConfigurare: () => void;
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
  start: (capitole: ChapterId[], surse?: QuestionSursa[]) => void;
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
 * capitol au deci nevoie de `useApp().questions`, nu de `session.banca` —
 * altfel „Exersează" pe un capitol ar face ca celelalte capitole să pară goale.
 */
export function useSession(questions: Question[]): Session {
  const [id, setId] = useState(() => crypto.randomUUID());
  const [capitole, setCapitole] = useState<ChapterId[]>([]);
  const [surse, setSurse] = useState<QuestionSursa[]>([]);
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, OptionKey>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [forcedConfig, setForcedConfig] = useState(false);

  const banca = useMemo(() => filtreazaCapitole(questions, capitole, surse), [capitole, questions, surse]);

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

  // Parametrul nu se numește `capitole`: `restart` chiar dedesubt închide peste
  // starea cu același nume, iar confuzia dintre ele ar schimba tăcut din ce
  // capitole se reia sesiunea.
  const start = useCallback((noiCapitole: ChapterId[], noiSurse: QuestionSursa[] = []) => {
    setCapitole(noiCapitole);
    setSurse(noiSurse);
    setId(crypto.randomUUID());
    setQi(0);
    setAnswers({});
    setRevealed({});
    setMarked({});
    setFinishedAt(null);
    setStartedAt(Date.now());
    setHasStarted(true);
    setForcedConfig(false);
  }, []);

  /** Aceleași capitole și surse, de la zero: „Reia sesiunea" nu are voie să lărgească bazinul. */
  const restart = useCallback(() => start(capitole, surse), [capitole, start, surse]);

  /** Vezi documentația câmpurilor `cereConfigurare`/`renuntaConfigurare` din `Session`. */
  const cereConfigurare = useCallback(() => setForcedConfig(true), []);
  const renuntaConfigurare = useCallback(() => setForcedConfig(false), []);
  const configPending = !hasStarted || forcedConfig;

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
      surse,
      qi,
      question,
      banca,
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
      hasStarted,
      configPending,
      cereConfigurare,
      renuntaConfigurare,
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
      cereConfigurare,
      configPending,
      finish,
      finishedAt,
      goTo,
      hasStarted,
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
      renuntaConfigurare,
      restart,
      revealed,
      score,
      start,
      startedAt,
      surse,
      tally,
      toggleMark,
      total,
    ],
  );
}
