export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';
export type QuestionType = 'simplu' | 'grupat';

export interface Question {
  tip: QuestionType;
  materie: string;
  cap: string;
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
}

export const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

export const tipLabel = (tip: QuestionType): string =>
  tip === 'simplu' ? 'Complement simplu' : 'Complement grupat';

export const QUESTIONS: Question[] = [
  {
    tip: 'simplu',
    materie: 'Biologie',
    cap: '03. Sistemul nervos',
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
  },
  {
    tip: 'grupat',
    materie: 'Chimie organică',
    cap: '05. Alcooli. Fenoli',
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
  },
  {
    tip: 'simplu',
    materie: 'Biologie',
    cap: '04. Glandele endocrine',
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
  },
  {
    tip: 'grupat',
    materie: 'Biologie',
    cap: '07. Sângele. Hemostaza',
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
  },
  {
    tip: 'simplu',
    materie: 'Biologie',
    cap: '05. Sistemul osos',
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
  },
  {
    tip: 'simplu',
    materie: 'Chimie organică',
    cap: '04. Arene',
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
  },
];
