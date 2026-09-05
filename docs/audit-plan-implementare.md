# Audit de implementare — 5 septembrie 2026

Evaluare a codului din master la 6ab440d și a bazei live. Raportul distinge funcțiile utilizabile de structurile care există numai în bază. Planul inițial nu este încă implementat integral.

## Publicare și date istorice

Publicarea GitHub Pages pentru 6ab440d este finalizată cu succes. CI-ul ramurii sursă 204a304 este trecut. La verificare, CI-ul separat pentru commitul de merge era încă în curs; nu a fost așteptat repetitiv.

Toate cele 23 de lucrări istorice au corespondent în test_runs cu același proprietar. Alegerile și momentele răspunsurilor din simulările vechi corespund jurnalului: zero diferențe după reparația din PR #73.

Publicarea este foarte recentă. Nu există încă dovezi de rodaj sau că toate filele deschise folosesc noua versiune. Tabelele vechi sunt păstrate, conform porții din retragere-sistem-vechi.md. Nu s-a executat nicio ștergere de date.

## Ce există și ce lipsește

| Domeniu | Stadiu și dovadă |
|---|---|
| Materii și capitole | Citite din bază; creare și redenumire în AdminTaxonomie.tsx. Nu mai sunt liste compilate. |
| Centre, facultăți, programe | centre_admitere există, dar taxonomia clientului nu include centrul. Nu există ecran de administrare a centrelor sau selector general în asistent; AdminColectii.tsx atribuie încă umfcd lucrărilor oficiale. Facultățile și programele nu sunt implementate. |
| Subcapitole și clasificări multiple | Nu există parent_id, tags sau question_tags în schema curentă. O grilă are un capitol și o colecție. |
| Proveniență | Importul și editorul salvează sursa, colecția, anul și referința de pagină. Asistentul permite colecții multiple. Referința sursei nu este expusă încă de contractul GrilaDinLucrare și de ecranul de rezolvare. |
| Tipuri de grile | Registru question_types; complement simplu și grupat. Modelul fixează șablonul grupat și interzice amestecarea lui; salveaza_grila validează șablonul. Nu există editor general de tipuri în Admin. |
| Biblioteca Admin | Căutare, paginare, status, import, editare, publicare/retragere și operații în masă există. Nu există toate axele din plan: etichete, verificare și dificultate administrabilă. |
| Verificarea conținutului | Publicarea există, dar nu există verificat_de/verificat_la sau un flux separat de verificare editorială. |
| Dificultate | Coloană și filtre în motor; lipsesc controalele complete de editare și filtrare pentru utilizator. |
| Generare | Server-side, fără duplicate, numărători comune cu selecția, insuficiență explicită, amestecare sigură, filtre pentru greșeli și întrebări nevăzute. |
| Cote pe materie | Acceptate de motor și de constructorul Admin pentru teste după regulă. Asistentul elevului trimite numai un total, fără cote individuale. |
| Teste predefinite | Definiții fixe și după regulă, constructor Admin și selecție în asistent. |
| Persistență | Ordinea, opțiunile, răspunsurile, timpul și rezultatele se citesc prin lucrare/id. Reluarea prin adresă funcționează. |
| Istoricul testelor | Lipsește lista accesibilă elevului cu lucrări începute și terminate. Datele există; singura citire de listă test_runs din client este exportul personal. Utilizatorul trebuie să păstreze adresa lucrării. |
| Favorite | Tabel, politici și mod de generare există. Nu există scriere din client în favorite. Butonul Marchează modifică numai marcajul acelei lucrări; nu creează un favorit permanent. |
| Stabilitatea conținutului | Se fixează id-urile și ordinea, nu textul și baremul. citeste_test face join la questions, iar preda_test corectează după q.correct curent. Editarea ulterioară poate schimba o lucrare sau rezultatul recitit. Cerința inițială de stabilitate completă nu este îndeplinită. |
| Statistici | Activitate, corectitudine, grile distincte, evoluție și capitole slabe există. Lipsesc analiza pe tip de întrebare/proveniență, istoric complet de note, comparații între simulări și clasamente. Distribuția după tipul exercițiului este despre modul de lucru, nu simplu/grupat. |
| Acces premium | Grile, colecții și teste sunt verificate în bază. Nu există flux complet de plăți/abonare sau configurarea separată a accesului pe funcții. |
| Performanță | Paginare în Admin, jurnal și export; generare pe server; catalog global redus. Catalogul și jurnalul se încarcă încă integral prin pagini. Nu există dovadă de testare la 20.000 de grile sau agregare incrementală a statisticilor. |
| Curățare | Motoarele și ecranele vechi sunt retrase. sessions/sim_runs și coloanele de compatibilitate sunt încă în bază. questions.tip are încă 181 valori, iar vechiul colectie este gol; eliminarea cere migrare și audit de dependențe. |

## Ordinea recomandată a lucrărilor rămase

1. **Înghețarea conținutului și a baremului la generare.** Recomandare: instantaneu per test_run_item, folosit atât la afișare, cât și la corectare. O corectură în bancă influențează testele noi; modificarea unui rezultat istoric trebuie să fie o operație explicită. Pentru lucrările vechi nu se poate inventa versiunea istorică a textului: documentați limita și păstrați jurnalul existent.
2. **Lucrările mele.** Listă paginată, limitată la proprietar, cu În curs / Terminate, reluare și rezultate. Folosiți contracte care nu expun baremul înainte de termen.
3. **Favorite reale.** Buton distinct de marcajul temporar, scriere/ștergere în favorite cu RLS, apoi verificarea modului deja existent în asistent.
4. **Administrarea conținutului completă.** Verificare editorială, dificultate, sursă vizibilă elevului, controale de publicare pentru taxonomie și colecții.
5. **Taxonomie extinsă și filtre.** Centre dinamice, cote pe materie în asistent, apoi subcapitole și etichete atunci când conținutul le cere.
6. **Statistici și volum.** Istoric de note bazat pe lucrări, clasificări păstrate la momentul răspunsului, agregare server-side și teste de volum.
7. **Retragerea fizică a structurii vechi.** Numai după rodaj și copie recuperabilă; refaceți auditul, păstrați testele migrărilor istorice la versiunile lor și eliminați fără CASCADE.

## Limitele acestui audit

Acest pas a inspectat codul, structura live, integritatea migrării și starea publicării. Nu a introdus funcțiile lipsă, nu a făcut teste de încărcare și nu a verificat vizual fiecare pagină. Comportamentele live și browser verificate în PR #73 rămân consemnate separat. Faptul că migrarea datelor a reușit nu înseamnă că fiecare funcție din plan are interfață utilizabilă.
