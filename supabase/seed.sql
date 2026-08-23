-- GENERAT DE scripts/genereaza-seed.mjs — nu edita direct.
-- Sursa e src/data/; rulează din nou generatorul după ce adaugi conținut.
--
-- Idempotent: se poate rula peste o bază care are deja datele. Grilele se
-- actualizează la valorile din cod, deci o corectură făcută în sursă ajunge
-- în bază fără migrare nouă.

begin;

-- materii ---------------------------------------------------------------

insert into materii (id, name, unit, position) values ('bio', 'Biologie', 'grile', 0)
  on conflict (id) do update set name = excluded.name, position = excluded.position;
insert into materii (id, name, unit, position) values ('chim', 'Chimie organică', 'grile', 1)
  on conflict (id) do update set name = excluded.name, position = excluded.position;

-- capitole --------------------------------------------------------------

insert into chapters (id, materie_id, nr, name, position) values ('bio-celula', 'bio', '01', 'Celula. Țesuturile', 0)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-analizatori', 'bio', '02', 'Analizatorii', 1)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-nervos', 'bio', '03', 'Sistemul nervos', 2)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-endocrin', 'bio', '04', 'Glandele endocrine', 3)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-osos', 'bio', '05', 'Sistemul osos', 4)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-muscular', 'bio', '06', 'Sistemul muscular', 5)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-sange', 'bio', '07', 'Sângele. Hemostaza', 6)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-circulator', 'bio', '08', 'Sistemul circulator', 7)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-digestie', 'bio', '09', 'Digestia și absorbția', 8)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-respiratie', 'bio', '10', 'Respirația', 9)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-excretie', 'bio', '11', 'Excreția', 10)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('bio-reproducere', 'bio', '12', 'Reproducerea', 11)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-introducere', 'chim', '01', 'Introducere în chimia organică', 0)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-alcani', 'chim', '02', 'Alcani', 1)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-alchene', 'chim', '03', 'Alchene și alchine', 2)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-arene', 'chim', '04', 'Arene', 3)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-alcooli', 'chim', '05', 'Alcooli. Fenoli', 4)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-acizi', 'chim', '06', 'Acizi carboxilici', 5)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-amine', 'chim', '07', 'Amine', 6)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-aminoacizi', 'chim', '08', 'Aminoacizi și proteine', 7)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-zaharide', 'chim', '09', 'Zaharide', 8)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;
insert into chapters (id, materie_id, nr, name, position) values ('chim-izomerie', 'chim', '10', 'Izomerie', 9)
  on conflict (id) do update set materie_id = excluded.materie_id, nr = excluded.nr, name = excluded.name, position = excluded.position;

-- grile ------------------------------------------------------------------
--
-- `questions_correct_exists` e o cheie externă amânată: grila se inserează
-- înaintea variantelor ei, iar verificarea se face la commit.

insert into questions (id, chapter_id, tip, tip_id, status, text, enunturi, correct, expl, src, sursa, an) values (
  'bio-nervos-01', 'bio-nervos', 'simplu', 'simplu', 'publicata',
  'Substanța cenușie a medulei spinării este dispusă:',
  null,
  'B',
  'În medula spinării substanța cenușie este așezată central și are pe secțiune transversală forma literei „H”, cu coarne anterioare, posterioare și laterale. Substanța albă este dispusă la periferie, organizată în cordoane.',
  'Biologie, manual clasa a XI-a · Sistemul nervos',
  'materie',
  null
) on conflict (id) do update set
  chapter_id = excluded.chapter_id, tip = excluded.tip, tip_id = excluded.tip_id, text = excluded.text,
  enunturi = excluded.enunturi, correct = excluded.correct, expl = excluded.expl, src = excluded.src,
  sursa = excluded.sursa, an = excluded.an;

insert into question_options (question_id, key, text, why) values ('bio-nervos-01', 'A', 'la periferie, sub forma unui strat continuu', 'Descrie dispunerea din emisferele cerebrale, unde substanța cenușie formează scoarța la periferie. La medulă raportul este invers.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-nervos-01', 'B', 'central, având pe secțiune forma literei „H”', 'Corect. Cenușia este centrală, cu coarne anterioare (motorii), posterioare (senzitive) și laterale în regiunea toraco-lombară.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-nervos-01', 'C', 'numai în coarnele anterioare', 'Coarnele anterioare sunt doar o parte a „H”-ului; cenușia cuprinde și coarnele posterioare și laterale.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-nervos-01', 'D', 'în cordoane, alături de substanța albă', 'În cordoane este organizată substanța albă, nu cea cenușie.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-nervos-01', 'E', 'exclusiv în ganglionii spinali', 'Nu este dispusă în noduli; formațiunile nodulare sunt ganglionii spinali, situați în afara medulei.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;

insert into questions (id, chapter_id, tip, tip_id, status, text, enunturi, correct, expl, src, sursa, an) values (
  'chim-alcooli-01', 'chim-alcooli', 'grupat', 'grupat', 'publicata',
  'Referitor la etanol sunt corecte afirmațiile:',
  array['are formula moleculară C₂H₆O', 'este un alcool secundar', 'se poate obține prin fermentația glucozei', 'este insolubil în apă']::text[],
  'B',
  'Etanolul are formula moleculară C₂H₆O (C₂H₅–OH), deci afirmația 1 este corectă, iar fermentația alcoolică a glucozei este metoda clasică de obținere, deci și 3. Este un alcool primar, nu secundar, și este miscibil cu apa în orice proporție — afirmațiile 2 și 4 sunt false.',
  'Chimie organică, manual clasa a X-a · Alcooli',
  'materie',
  null
) on conflict (id) do update set
  chapter_id = excluded.chapter_id, tip = excluded.tip, tip_id = excluded.tip_id, text = excluded.text,
  enunturi = excluded.enunturi, correct = excluded.correct, expl = excluded.expl, src = excluded.src,
  sursa = excluded.sursa, an = excluded.an;

insert into question_options (question_id, key, text, why) values ('chim-alcooli-01', 'A', '1, 2, 3', 'Include afirmația 2, dar etanolul este alcool primar: gruparea –OH este legată de un carbon care mai are doi atomi de hidrogen.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('chim-alcooli-01', 'B', '1, 3', 'Corect. Afirmațiile 1 și 3 sunt adevărate, iar 2 și 4 sunt false.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('chim-alcooli-01', 'C', '2, 4', 'Ambele afirmații din grup sunt false: nu este secundar și este miscibil cu apa în orice proporție.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('chim-alcooli-01', 'D', 'doar 4', 'Afirmația 4 este falsă — etanolul se amestecă complet cu apa datorită legăturilor de hidrogen.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('chim-alcooli-01', 'E', 'toate', 'Nu toate: 2 și 4 sunt false.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;

insert into questions (id, chapter_id, tip, tip_id, status, text, enunturi, correct, expl, src, sursa, an) values (
  'bio-endocrin-01', 'bio-endocrin', 'simplu', 'simplu', 'publicata',
  'Insulina este secretată de:',
  null,
  'C',
  'Insulina este produsă de celulele beta din insulele pancreatice (Langerhans) și are efect hipoglicemiant. Celulele alfa secretă glucagon, cu efect antagonist.',
  'Biologie, manual clasa a XI-a · Glandele endocrine',
  'materie',
  null
) on conflict (id) do update set
  chapter_id = excluded.chapter_id, tip = excluded.tip, tip_id = excluded.tip_id, text = excluded.text,
  enunturi = excluded.enunturi, correct = excluded.correct, expl = excluded.expl, src = excluded.src,
  sursa = excluded.sursa, an = excluded.an;

insert into question_options (question_id, key, text, why) values ('bio-endocrin-01', 'A', 'celulele alfa ale insulelor pancreatice', 'Celulele alfa secretă glucagon, hormon hiperglicemiant, cu efect opus insulinei.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-endocrin-01', 'B', 'celulele acinoase ale pancreasului exocrin', 'Celulele acinoase produc sucul pancreatic cu enzime digestive, nu hormoni.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-endocrin-01', 'C', 'celulele beta ale insulelor pancreatice', 'Corect. Celulele beta din insulele Langerhans secretă insulina, singurul hormon hipoglicemiant al organismului.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-endocrin-01', 'D', 'medulosuprarenală', 'Medulosuprarenala secretă adrenalină și noradrenalină.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-endocrin-01', 'E', 'adenohipofiză', 'Celulele delta secretă somatostatină, care inhibă atât insulina, cât și glucagonul.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;

insert into questions (id, chapter_id, tip, tip_id, status, text, enunturi, correct, expl, src, sursa, an) values (
  'bio-sange-01', 'bio-sange', 'grupat', 'grupat', 'publicata',
  'Despre hematiile adultului sunt adevărate afirmațiile:',
  array['sunt celule anucleate', 'conțin hemoglobină', 'au o durată de viață de aproximativ 120 de zile', 'asigură apărarea specifică a organismului']::text[],
  'A',
  'Hematiile adulte sunt anucleate, conțin hemoglobină și trăiesc în medie 120 de zile. Apărarea specifică este realizată de limfocite, nu de hematii, deci afirmația 4 este falsă.',
  'Biologie, manual clasa a XI-a · Sângele',
  'materie',
  null
) on conflict (id) do update set
  chapter_id = excluded.chapter_id, tip = excluded.tip, tip_id = excluded.tip_id, text = excluded.text,
  enunturi = excluded.enunturi, correct = excluded.correct, expl = excluded.expl, src = excluded.src,
  sursa = excluded.sursa, an = excluded.an;

insert into question_options (question_id, key, text, why) values ('bio-sange-01', 'A', '1, 2, 3', 'Corect. Afirmațiile 1, 2 și 3 descriu exact hematia adultă.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-sange-01', 'B', '1, 3', 'Omite afirmația 2, deși hemoglobina este chiar conținutul principal al hematiei.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-sange-01', 'C', '2, 4', 'Include afirmația 4, care aparține limfocitelor, nu hematiilor.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-sange-01', 'D', 'doar 4', 'Afirmația 4 este singura falsă din grup.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-sange-01', 'E', 'toate', 'Nu toate: apărarea specifică revine limfocitelor.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;

insert into questions (id, chapter_id, tip, tip_id, status, text, enunturi, correct, expl, src, sursa, an) values (
  'bio-osos-01', 'bio-osos', 'simplu', 'simplu', 'publicata',
  'Numărul vertebrelor din regiunea toracală a coloanei vertebrale este:',
  null,
  'B',
  'Coloana vertebrală cuprinde 7 vertebre cervicale, 12 toracale, 5 lombare, 5 sacrale sudate și 4–5 coccigiene.',
  'Biologie, manual clasa a XI-a · Sistemul osos',
  'materie',
  null
) on conflict (id) do update set
  chapter_id = excluded.chapter_id, tip = excluded.tip, tip_id = excluded.tip_id, text = excluded.text,
  enunturi = excluded.enunturi, correct = excluded.correct, expl = excluded.expl, src = excluded.src,
  sursa = excluded.sursa, an = excluded.an;

insert into question_options (question_id, key, text, why) values ('bio-osos-01', 'A', '7', '7 este numărul vertebrelor cervicale.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-osos-01', 'B', '12', 'Corect. Regiunea toracală are 12 vertebre, câte una pentru fiecare pereche de coaste.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-osos-01', 'C', '5', '5 corespunde vertebrelor lombare.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-osos-01', 'D', '4–5, sudate', '4–5 sudate descriu coccisul.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('bio-osos-01', 'E', '33–34', '33–34 este numărul total al vertebrelor din întreaga coloană.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;

insert into questions (id, chapter_id, tip, tip_id, status, text, enunturi, correct, expl, src, sursa, an) values (
  'chim-arene-01', 'chim-arene', 'simplu', 'simplu', 'publicata',
  'Formula moleculară a benzenului este:',
  null,
  'C',
  'Benzenul este prima arenă mononucleară, cu formula C₆H₆ și un ciclu de șase atomi de carbon cu electroni π delocalizați. C₇H₈ corespunde toluenului.',
  'Chimie organică, manual clasa a X-a · Arene',
  'materie',
  null
) on conflict (id) do update set
  chapter_id = excluded.chapter_id, tip = excluded.tip, tip_id = excluded.tip_id, text = excluded.text,
  enunturi = excluded.enunturi, correct = excluded.correct, expl = excluded.expl, src = excluded.src,
  sursa = excluded.sursa, an = excluded.an;

insert into question_options (question_id, key, text, why) values ('chim-arene-01', 'A', 'C₆H₁₂', 'C₆H₁₂ este ciclohexanul, hidrocarbură saturată ciclică.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('chim-arene-01', 'B', 'C₆H₁₄', 'C₆H₁₄ este hexanul, alcan cu catenă deschisă.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('chim-arene-01', 'C', 'C₆H₆', 'Corect. Benzenul are formula C₆H₆, cu grad de nesaturare 4 dat de ciclu și de sistemul aromatic.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('chim-arene-01', 'D', 'C₇H₈', 'C₇H₈ este toluenul, primul omolog al benzenului.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;
insert into question_options (question_id, key, text, why) values ('chim-arene-01', 'E', 'C₂H₂', 'C₂H₂ este acetilena, o alchină.')
  on conflict (question_id, key) do update set text = excluded.text, why = excluded.why;

commit;
