# Retragerea sistemului vechi

## Livrarea curentă

- Motoarele și ecranele vechi de exersare, simulare și recapitulare au fost retrase.
- Adresa grile deschide asistentul; adresa simulari păstrează importul instantaneului de pe dispozitiv.
- Progresul nu mai citește sim_runs. Exportul personal citește lucrările noi și grilele lor, paginat.
- Nu se șterg date locale înainte de confirmarea importului.
- Migrarea 20260905114309 repară alegerile lipsă din simulările istorice, folosind jurnalul imutabil.

## Audit live — 5 septembrie 2026

Au fost găsite 19 sesiuni și 4 simulări istorice. Toate au corespondent în test_runs, cu același proprietar. Nicio legătură din jurnal nu lipsește. Ordinea grilelor de simulare corespunde poziție cu poziție.

Verificarea alegerilor a găsit 5 răspunsuri prezente în attempts, dar absente din test_run_items. Migrarea de recuperare completează numai celulele goale, verifică proprietarul, identitatea grilei și poziția, și refuză conflictele. Nu schimbă jurnalul și nu inventează grile pentru sesiunile care nu au avut ordinea salvată.

Migrarea a fost aplicată live. Verificarea ulterioară a găsit zero diferențe; declanșatorul de protecție este activ. Rezultatul unei simulări a fost verificat în browser: cele patru alegeri recuperate apar la pozițiile lor, cu 4 răspunsuri greșite și 96 fără răspuns.

## Poarta înainte de ștergerea tabelelor

Tabelele sessions și sim_runs NU se șterg în această livrare. Clientul publicat anterior încă le citește pentru progres și export; ștergerea lor înaintea publicării ar produce erori.

După merge, publicare confirmată și perioada de rodaj:
1. Reluați auditul, inclusiv alegerile și timpii răspunsurilor, nu doar numărul rândurilor.
2. Verificați că niciun client/server activ nu mai depinde de tabele sau de attempts.session_id / sim_run_id.
3. Păstrați o copie recuperabilă și verificați exportul unui cont cu istoric.
4. Pregătiți retragerea într-o migrare separată cu verificări care opresc execuția dacă datele diferă. Fără CASCADE.
5. Actualizați testele migrărilor istorice astfel încât acestea să ruleze la versiunea de schemă potrivită.

Coloanele questions.tip și questions.colectie au aceeași regulă: auditarea dependențelor, apoi o migrare separată. Nu se modifică retroactiv migrările deja aplicate.
