import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChapterId } from '../data/chapters';
import type { OptionKey, Question, QuestionId, QuestionSursa } from '../data/questions';
import { usePersistentState } from '../lib/hooks';

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
  // Poziția poate fi goală: banca se rezolvă din id-uri, iar o grilă retrasă
  // după pornirea sesiunii lasă un gol care nu are voie să mute restul.
  questions: readonly (Question | undefined)[],
  answers: Record<number, OptionKey>,
  durataMs: number,
): SessionScore {
  let corecte = 0;
  let raspunse = 0;
  questions.forEach((q, i) => {
    const ales = answers[i];
    if (ales === undefined) return;
    raspunse += 1;
    if (q !== undefined && ales === q.correct) corecte += 1;
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

/**
 * Sesiunea salvată, în forma care ajunge în `localStorage`.
 *
 * Până acum sesiunea trăia doar în `useState`: o reîncărcare ștergea
 * răspunsurile, cronometrul și rezultatul, deși „Reia sesiunea" de pe Acasă
 * promitea contrariul. Din 18 sesiuni înregistrate, 8 n-au ajuns să scrie
 * niciun răspuns.
 *
 * `order` ține **id-uri, nu poziții**, ca la `SimRun`: banca se recalcula din
 * biblioteca vie, deci o grilă adăugată sau retrasă între două randări muta
 * răspunsurile pe alte grile — iar `attemptsFromSession` scria în jurnalul
 * *imuabil* `attempts` id-ul grilei aflate acum pe poziția aceea.
 */
export interface SessionRun {
  id: string;
  capitole: ChapterId[];
  surse: QuestionSursa[];
  /** Ordinea grilelor, înghețată la pornire. */
  order: QuestionId[];
  qi: number;
  answers: Record<number, OptionKey>;
  revealed: Record<number, boolean>;
  marked: Record<number, boolean>;
  startedAt: number;
  finishedAt: number | null;
}

const esteHartaDe = (v: unknown): boolean => typeof v === 'object' && v !== null;

/** Ce nu trece e aruncat și șters, ca o formă veche să nu albească ecranul. */
export const isSessionRun = (v: unknown): v is SessionRun => {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Partial<SessionRun>;
  return (
    typeof r.id === 'string' &&
    r.id.length > 0 &&
    Array.isArray(r.capitole) &&
    Array.isArray(r.surse) &&
    Array.isArray(r.order) &&
    r.order.every((id) => typeof id === 'string' && id.length > 0) &&
    typeof r.qi === 'number' &&
    r.qi >= 0 &&
    typeof r.startedAt === 'number' &&
    (r.finishedAt === null || typeof r.finishedAt === 'number') &&
    esteHartaDe(r.answers) &&
    esteHartaDe(r.revealed) &&
    esteHartaDe(r.marked)
  );
};

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
   * Banca sesiunii: grilele din `order`, rezolvate prin biblioteca încărcată.
   *
   * O poziție poate fi goală — grilă retrasă după pornire — și golul se
   * păstrează, nu se compactează: altfel răspunsurile de după ar aluneca pe
   * alte grile.
   *
   * Se numește altfel decât `useApp().questions` intenționat. Cele două stau la
   * o linie de destructurare una de alta, iar bug-ul care a impus scopul pe
   * capitole a fost exact confuzia dintre ele. Cu nume diferite, greșeala nu
   * mai compilează în loc să dea o cifră greșită.
   */
  banca: (Question | undefined)[];
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
  const [run, setRun] = usePersistentState<SessionRun | null>(
    'medbuc.sesiune',
    null,
    (v): v is SessionRun | null => v === null || isSessionRun(v),
  );
  // Intenție de interfață, nu date: după o reîncărcare vrem sesiunea reluată,
  // nu formularul de configurare.
  const [forcedConfig, setForcedConfig] = useState(false);

  /**
   * `start` nu are voie să depindă de identitatea bibliotecii: `Grile` pornește
   * sesiunea dintr-un efect care depinde de `start`, iar o reîncărcare a
   * conținutului ar reporni sesiunea în curs.
   */
  const questionsRef = useRef(questions);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const id = run?.id ?? '';
  const capitole = useMemo(() => run?.capitole ?? [], [run]);
  const surse = useMemo(() => run?.surse ?? [], [run]);
  const qi = run?.qi ?? 0;
  const answers = useMemo(() => run?.answers ?? {}, [run]);
  const revealed = useMemo(() => run?.revealed ?? {}, [run]);
  const marked = useMemo(() => run?.marked ?? {}, [run]);
  const startedAt = run?.startedAt ?? 0;
  const finishedAt = run?.finishedAt ?? null;
  const hasStarted = run !== null;

  /** Golurile se păstrează: compactarea ar muta răspunsurile pe alte grile. */
  const banca = useMemo(
    () => (run ? run.order.map((qid) => byId.get(qid)) : []),
    [byId, run],
  );

  const total = banca.length;
  const question = banca[qi];
  const answer = answers[qi];
  const isRevealed = !!revealed[qi];
  const isCorrect = question !== undefined && answer === question.correct;

  const patch = useCallback(
    (change: (prev: SessionRun) => SessionRun) => setRun((prev) => (prev ? change(prev) : prev)),
    [setRun],
  );

  /** Odată verificată grila, răspunsul rămâne blocat. */
  const pick = useCallback(
    (key: OptionKey) =>
      patch((prev) =>
        prev.revealed[prev.qi] ? prev : { ...prev, answers: { ...prev.answers, [prev.qi]: key } },
      ),
    [patch],
  );

  /** Navigarea se oprește la capete: ultima grilă trebuie să rămână ultima. */
  const goTo = useCallback(
    (index: number) =>
      patch((prev) => ({ ...prev, qi: Math.max(0, Math.min(index, prev.order.length - 1)) })),
    [patch],
  );
  const next = useCallback(
    () => patch((prev) => ({ ...prev, qi: Math.min(prev.qi + 1, prev.order.length - 1) })),
    [patch],
  );
  const prev = useCallback(() => patch((p) => ({ ...p, qi: Math.max(p.qi - 1, 0) })), [patch]);

  /** Idempotent: o sesiune încheiată nu-și rescrie momentul de final. */
  const finish = useCallback(
    () => patch((prev) => (prev.finishedAt === null ? { ...prev, finishedAt: Date.now() } : prev)),
    [patch],
  );

  // Parametrul nu se numește `capitole`: `restart` chiar dedesubt închide peste
  // starea cu același nume, iar confuzia dintre ele ar schimba tăcut din ce
  // capitole se reia sesiunea.
  const start = useCallback(
    (noiCapitole: ChapterId[], noiSurse: QuestionSursa[] = []) => {
      // Ordinea se îngheață aici, ca id-uri: de acum înainte sesiunea nu se mai
      // uită la ce e în bibliotecă, ci la ce avea când a pornit.
      const bazin = filtreazaCapitole(questionsRef.current, noiCapitole, noiSurse);
      setRun({
        id: crypto.randomUUID(),
        capitole: noiCapitole,
        surse: noiSurse,
        order: bazin.map((q) => q.id),
        qi: 0,
        answers: {},
        revealed: {},
        marked: {},
        startedAt: Date.now(),
        finishedAt: null,
      });
      setForcedConfig(false);
    },
    [setRun],
  );

  /** Aceleași capitole și surse, de la zero: „Reia sesiunea" nu are voie să lărgească bazinul. */
  const restart = useCallback(() => start(capitole, surse), [capitole, start, surse]);

  /** Vezi documentația câmpurilor `cereConfigurare`/`renuntaConfigurare` din `Session`. */
  const cereConfigurare = useCallback(() => setForcedConfig(true), []);
  const renuntaConfigurare = useCallback(() => setForcedConfig(false), []);
  const configPending = !hasStarted || forcedConfig;

  const primary = useCallback(() => {
    if (!revealed[qi]) {
      if (answers[qi]) patch((prev) => ({ ...prev, revealed: { ...prev.revealed, [prev.qi]: true } }));
      return;
    }
    if (qi >= total - 1) finish();
    else next();
  }, [answers, finish, next, patch, qi, revealed, total]);

  const toggleMark = useCallback(
    () => patch((p) => ({ ...p, marked: { ...p.marked, [p.qi]: !p.marked[p.qi] } })),
    [patch],
  );

  const tally = useMemo(() => {
    let corecte = 0;
    let gresite = 0;
    banca.forEach((q, i) => {
      if (!revealed[i] || q === undefined) return;
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
