import type { ChapterId, MaterieId } from './chapters';
import { TAXONOMIE_GOALA, type Taxonomie } from '../lib/taxonomie';

export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';
/**
 * Formatul grilei — id-ul unui rând din `question_types`, nu o uniune.
 *
 * A fost `'simplu' | 'grupat'`. O uniune compilată peste o listă care trăiește
 * în bază e exact tiparul care a produs divergența `MaterieId`; nu se
 * reintroduce. Ce înseamnă tipul — câte variante, ce șablon, dacă se poate
 * amesteca — se citește din `lib/tipuriGrile.ts`.
 */
export type QuestionType = string;
/**
 * De unde vine grila: scrisă pe curriculum, dintr-un subiect oficial de admitere
 * din anii trecuți, sau dintr-o culegere. Independentă de `capId` — o grilă
 * dintr-un subiect oficial ține în continuare de un capitol real (`bio-nervos`,
 * nu un "capitol" care ar însemna întreaga lucrare din 2026), ca să poată fi
 * filtrată simultan pe materie și pe sursă.
 */
export type QuestionSursa = 'materie' | 'subiect_oficial' | 'culegere';

/**
 * Cele trei surse, cu eticheta lor.
 *
 * Una singură, fiindcă o citesc trei locuri: formularul, importul în masă și
 * validarea lotului. Două copii ar diverge la prima sursă adăugată într-una din
 * ele — exact felul în care importul ar ajunge să accepte ce formularul refuză.
 * Ordinea e cea din `enum question_sursa` (migrarea 0007).
 */
export const SURSE: readonly { id: QuestionSursa; eticheta: string }[] = [
  { id: 'materie', eticheta: 'Curriculum' },
  { id: 'subiect_oficial', eticheta: 'Subiecte oficiale și simulări' },
  { id: 'culegere', eticheta: 'Culegere' },
];

export const esteSursa = (v: string): v is QuestionSursa => SURSE.some((s) => s.id === v);

/**
 * Identitatea unei grile. Până acum identitatea era poziția în `QUESTIONS`, ceea
 * ce lega tot ce se salvează (ordinea unei simulări) de ordinea din fișier:
 * o grilă inserată la mijloc muta răspunsurile tuturor lucrărilor salvate.
 * Id-ul rămâne același indiferent de ordine și supraviețuiește mutării în bază.
 */
export type QuestionId = string;

export interface Question {
  id: QuestionId;
  tip: QuestionType;
  /** Capitolul de care ține grila. Materia și eticheta se citesc din el. */
  capId: ChapterId;
  text: string;
  /** Doar la complement grupat: cele patru afirmații numerotate. */
  enunturi?: string[];
  opts: [OptionKey, string][];
  correct: OptionKey;
  /** Explicația generală, afișată după verificarea răspunsului. */
  expl: string;
  /** De ce cade (sau de ce ține) fiecare variantă. */
  why: Partial<Record<OptionKey, string>>;
  src: string;
  sursa: QuestionSursa;
  /**
   * Lotul din care vine grila — „Simulare 2026 UMFCD", „Corint – Sistemul nervos".
   *
   * Deosebită de `src`, care e citarea de pagină („Celula, p. 11"), și de `sursa`,
   * care e felul materialului. Colecția e nivelul după care se grupează un import
   * întreg, deci și cel după care se filtrează. Gol înseamnă nespus.
   */
  colectie: string;
  /** Anul subiectului, doar la `subiect_oficial` — ex. 2026. */
  an?: number;
}

export const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * „Biologie” — pentru antetul grilei.
 *
 * Taxonomia vine ca parametru fiindcă materiile trăiesc în bază, nu într-o
 * constantă compilată. Fără ea antetul arată gol, nu greșit.
 */
export const questionMaterie = (q: Question, taxonomie: Taxonomie = TAXONOMIE_GOALA): string =>
  taxonomie.numeMaterie(q.capId);

/** „03. Sistemul nervos” — pentru antetul grilei; id-ul brut dacă nu se știe. */
export const questionCap = (q: Question, taxonomie: Taxonomie = TAXONOMIE_GOALA): string =>
  taxonomie.eticheta(q.capId);

export const QUESTIONS: Question[] = [
  {
    tip: 'simplu',
    id: 'bio-nervos-01',
    capId: 'bio-nervos',
    text: 'Substanța cenușie a medulei spinării este dispusă:',
    opts: [
      ['A', 'la periferie, sub forma unui strat continuu'],
      ['B', 'central, având pe secțiune forma literei „H”'],
      ['C', 'numai în coarnele anterioare'],
      ['D', 'în cordoane, alături de substanța albă'],
      ['E', 'exclusiv în ganglionii spinali'],
    ],
    correct: 'B',
    expl: 'În medula spinării substanța cenușie este așezată central și are pe secțiune transversală forma literei „H”, cu coarne anterioare, posterioare și laterale. Substanța albă este dispusă la periferie, organizată în cordoane.',
    why: {
      A: 'Descrie dispunerea din emisferele cerebrale, unde substanța cenușie formează scoarța la periferie. La medulă raportul este invers.',
      B: 'Corect. Cenușia este centrală, cu coarne anterioare (motorii), posterioare (senzitive) și laterale în regiunea toraco-lombară.',
      C: 'Coarnele anterioare sunt doar o parte a „H”-ului; cenușia cuprinde și coarnele posterioare și laterale.',
      D: 'În cordoane este organizată substanța albă, nu cea cenușie.',
      E: 'Nu este dispusă în noduli; formațiunile nodulare sunt ganglionii spinali, situați în afara medulei.',
    },
    src: 'Biologie, manual clasa a XI-a · Sistemul nervos',
    sursa: 'materie',
    colectie: '',
  },
  {
    tip: 'grupat',
    id: 'chim-alcooli-01',
    capId: 'chim-alcooli',
    text: 'Referitor la etanol sunt corecte afirmațiile:',
    enunturi: [
      'are formula moleculară C₂H₆O',
      'este un alcool secundar',
      'se poate obține prin fermentația glucozei',
      'este insolubil în apă',
    ],
    opts: [
      ['A', '1, 2, 3'],
      ['B', '1, 3'],
      ['C', '2, 4'],
      ['D', 'doar 4'],
      ['E', 'toate'],
    ],
    correct: 'B',
    expl: 'Etanolul are formula moleculară C₂H₆O (C₂H₅–OH), deci afirmația 1 este corectă, iar fermentația alcoolică a glucozei este metoda clasică de obținere, deci și 3. Este un alcool primar, nu secundar, și este miscibil cu apa în orice proporție — afirmațiile 2 și 4 sunt false.',
    why: {
      A: 'Include afirmația 2, dar etanolul este alcool primar: gruparea –OH este legată de un carbon care mai are doi atomi de hidrogen.',
      B: 'Corect. Afirmațiile 1 și 3 sunt adevărate, iar 2 și 4 sunt false.',
      C: 'Ambele afirmații din grup sunt false: nu este secundar și este miscibil cu apa în orice proporție.',
      D: 'Afirmația 4 este falsă — etanolul se amestecă complet cu apa datorită legăturilor de hidrogen.',
      E: 'Nu toate: 2 și 4 sunt false.',
    },
    src: 'Chimie organică, manual clasa a X-a · Alcooli',
    sursa: 'materie',
    colectie: '',
  },
  {
    tip: 'simplu',
    id: 'bio-endocrin-01',
    capId: 'bio-endocrin',
    text: 'Insulina este secretată de:',
    opts: [
      ['A', 'celulele alfa ale insulelor pancreatice'],
      ['B', 'celulele acinoase ale pancreasului exocrin'],
      ['C', 'celulele beta ale insulelor pancreatice'],
      ['D', 'medulosuprarenală'],
      ['E', 'adenohipofiză'],
    ],
    correct: 'C',
    expl: 'Insulina este produsă de celulele beta din insulele pancreatice (Langerhans) și are efect hipoglicemiant. Celulele alfa secretă glucagon, cu efect antagonist.',
    why: {
      A: 'Celulele alfa secretă glucagon, hormon hiperglicemiant, cu efect opus insulinei.',
      B: 'Celulele acinoase produc sucul pancreatic cu enzime digestive, nu hormoni.',
      C: 'Corect. Celulele beta din insulele Langerhans secretă insulina, singurul hormon hipoglicemiant al organismului.',
      D: 'Medulosuprarenala secretă adrenalină și noradrenalină.',
      E: 'Celulele delta secretă somatostatină, care inhibă atât insulina, cât și glucagonul.',
    },
    src: 'Biologie, manual clasa a XI-a · Glandele endocrine',
    sursa: 'materie',
    colectie: '',
  },
  {
    tip: 'grupat',
    id: 'bio-sange-01',
    capId: 'bio-sange',
    text: 'Despre hematiile adultului sunt adevărate afirmațiile:',
    enunturi: [
      'sunt celule anucleate',
      'conțin hemoglobină',
      'au o durată de viață de aproximativ 120 de zile',
      'asigură apărarea specifică a organismului',
    ],
    opts: [
      ['A', '1, 2, 3'],
      ['B', '1, 3'],
      ['C', '2, 4'],
      ['D', 'doar 4'],
      ['E', 'toate'],
    ],
    correct: 'A',
    expl: 'Hematiile adulte sunt anucleate, conțin hemoglobină și trăiesc în medie 120 de zile. Apărarea specifică este realizată de limfocite, nu de hematii, deci afirmația 4 este falsă.',
    why: {
      A: 'Corect. Afirmațiile 1, 2 și 3 descriu exact hematia adultă.',
      B: 'Omite afirmația 2, deși hemoglobina este chiar conținutul principal al hematiei.',
      C: 'Include afirmația 4, care aparține limfocitelor, nu hematiilor.',
      D: 'Afirmația 4 este singura falsă din grup.',
      E: 'Nu toate: apărarea specifică revine limfocitelor.',
    },
    src: 'Biologie, manual clasa a XI-a · Sângele',
    sursa: 'materie',
    colectie: '',
  },
  {
    tip: 'simplu',
    id: 'bio-osos-01',
    capId: 'bio-osos',
    text: 'Numărul vertebrelor din regiunea toracală a coloanei vertebrale este:',
    opts: [
      ['A', '7'],
      ['B', '12'],
      ['C', '5'],
      ['D', '4–5, sudate'],
      ['E', '33–34'],
    ],
    correct: 'B',
    expl: 'Coloana vertebrală cuprinde 7 vertebre cervicale, 12 toracale, 5 lombare, 5 sacrale sudate și 4–5 coccigiene.',
    why: {
      A: '7 este numărul vertebrelor cervicale.',
      B: 'Corect. Regiunea toracală are 12 vertebre, câte una pentru fiecare pereche de coaste.',
      C: '5 corespunde vertebrelor lombare.',
      D: '4–5 sudate descriu coccisul.',
      E: '33–34 este numărul total al vertebrelor din întreaga coloană.',
    },
    src: 'Biologie, manual clasa a XI-a · Sistemul osos',
    sursa: 'materie',
    colectie: '',
  },
  {
    tip: 'simplu',
    id: 'chim-arene-01',
    capId: 'chim-arene',
    text: 'Formula moleculară a benzenului este:',
    opts: [
      ['A', 'C₆H₁₂'],
      ['B', 'C₆H₁₄'],
      ['C', 'C₆H₆'],
      ['D', 'C₇H₈'],
      ['E', 'C₂H₂'],
    ],
    correct: 'C',
    expl: 'Benzenul este prima arenă mononucleară, cu formula C₆H₆ și un ciclu de șase atomi de carbon cu electroni π delocalizați. C₇H₈ corespunde toluenului.',
    why: {
      A: 'C₆H₁₂ este ciclohexanul, hidrocarbură saturată ciclică.',
      B: 'C₆H₁₄ este hexanul, alcan cu catenă deschisă.',
      C: 'Corect. Benzenul are formula C₆H₆, cu grad de nesaturare 4 dat de ciclu și de sistemul aromatic.',
      D: 'C₇H₈ este toluenul, primul omolog al benzenului.',
      E: 'C₂H₂ este acetilena, o alchină.',
    },
    src: 'Chimie organică, manual clasa a X-a · Arene',
    sursa: 'materie',
    colectie: '',
  },
];

/** Grilele după id. Un id duplicat ar face o grilă de negăsit, deci se semnalează. */
export const QUESTION_BY_ID: ReadonlyMap<QuestionId, Question> = (() => {
  const map = new Map<QuestionId, Question>();
  for (const q of QUESTIONS) {
    if (map.has(q.id)) throw new Error(`Id de grilă duplicat: ${q.id}`);
    map.set(q.id, q);
  }
  return map;
})();

export const questionById = (id: QuestionId): Question | undefined => QUESTION_BY_ID.get(id);

/** Un id care chiar există în bancă — folosit la validarea lucrărilor salvate. */
export const isQuestionId = (v: unknown): v is QuestionId =>
  typeof v === 'string' && QUESTION_BY_ID.has(v);

/**
 * Câte grile există pe fiecare capitol.
 *
 * Capitolele purtau până acum un `total` scris de mână — „60 de grile" la un
 * capitol în care nu era scrisă niciuna. Numărul se numără acum din bancă, deci
 * nu poate să mintă: crește exact pe măsură ce se adaugă conținut.
 */
export const QUESTION_COUNT_BY_CHAPTER: ReadonlyMap<ChapterId, number> = (() => {
  const map = new Map<ChapterId, number>();
  for (const q of QUESTIONS) map.set(q.capId, (map.get(q.capId) ?? 0) + 1);
  return map;
})();

export const chapterQuestionCount = (id: ChapterId): number => QUESTION_COUNT_BY_CHAPTER.get(id) ?? 0;

/** Câte grile de fixtură are o materie. Numărul de la runtime e `numaraGrile`. */
export const materieQuestionCount = (materie: MaterieId, taxonomie: Taxonomie): number =>
  QUESTIONS.reduce((n, q) => (taxonomie.capitol(q.capId)?.materie === materie ? n + 1 : n), 0);
