# Administrare: fluxuri orientate spre conținut

## Probleme observate în browser

În versiunea publicată, formularul unei grile era permanent lângă o coloană cu biblioteca, filtre și acțiuni de ștergere. Importul începea cu JSON, colecțiile și materiile cereau identificatori tehnici, iar constructorul de teste cerea o listă de coduri de grile. După o autentificare nouă, lista formatelor putea rămâne goală: citirea era făcută înainte de sesiune și nu se relua.

## Fluxurile noi

- **Biblioteca** este punctul de intrare: căutare, filtre și paginare, fără formular alături. Adăugarea și importul sunt acțiuni explicite; acțiunile secundare ale unui rând sunt sub „Mai multe acțiuni”. Ștergerea păstrează confirmarea existentă.
- **O grilă** are trei pași: încadrare/proveniență, conținut/răspuns, verificare/salvare. Codul se generează automat, dar rămâne accesibil în detaliile avansate. Nicio variantă nu este implicit marcată corect. Șabloanele complementului grupat se citesc din registrul tipurilor și nu se editează manual.
- **Proveniența** are aceeași componentă la scriere și import. O colecție poate fi creată fără părăsirea formularului, apoi este selectată automat. Datele grilei se salvează prin același RPC ca înainte.
- **Importul** pornește de la celule copiate din Excel/Google Sheets, cu antet. Modelul TSV se descarcă din interfață și urmează formatul ales. JSON rămâne disponibil pentru loturi eterogene și corecturi/exporturi. Conversia tabelului trece prin validarea comună existentă, nu introduce alte reguli de salvare.
- **Verificarea importului** arată rândurile invalide, rescrierile și numărul de grile care vor fi publicate. Salvarea cere confirmarea verificării; publicarea, rescrierea sau omiterea rândurilor invalide cer și confirmarea consecințelor. Previzualizarea arată întrebările și cheia corectă.
- **Reîncercarea importului** nu șterge rândurile invalide. După o reușită parțială, tabelul primește o coloană „Cod intern”, astfel încât mutarea/ștergerea unui rând nu schimbă identitatea celor salvate deja. Codurile trebuie păstrate la reîncercare.
- **Materiile și colecțiile** au formulare de creare închise inițial. Materiile se deschid separat; colecțiile se caută după nume/an. Codurile noi se generează automat. Formularele nu se golesc și editarea nu se închide dacă salvarea eșuează.
- **Testele fixe** se construiesc căutând grile publicate, adăugându-le și mutându-le sus/jos. Lista este paginată pe server; adăugarea aceleiași grile este blocată în selector. Introducerea manuală a codurilor rămâne în detaliile avansate. Regulile de generare și autorizare nu se schimbă.

## Limite explicite

- Nu există migrare de bază de date în această schimbare. Nu s-a publicat conținut de probă.
- Importul simplu citește celule TSV cu antetul modelului, nu fișiere arbitrare XLSX, PDF, imagini sau OCR. Un lot de tabel folosește un singur capitol și un singur format de întrebare.
- Un import nou din tabel produce coduri noi. Nu există încă detecție de duplicate după sensul/textul întrebării; reimportarea aceluiași tabel ca lot nou poate crea duplicate. Corecturile se fac în bibliotecă sau prin JSON cu codurile existente.
- Grila manuală și textul importului rămân când se schimbă **secțiunea administrării**. Nu sunt salvate automat pe server și nu supraviețuiesc reîncărcării; închiderea/reîncărcarea paginii avertizează când există text nesalvat. Părăsirea întregului ecran Administrare nu este o salvare de ciornă.
- Salvarea ca ciornă păstrează validarea existentă: întrebarea, variantele, răspunsul corect și explicația trebuie completate. Ciorna înseamnă conținut valid, încă nepublicat, nu un autosave incomplet.
- Constructorul de teste și datele de structură păstrează limitările descrise în auditul planului (de exemplu administrarea completă a centrelor). Copierea imuabilă a conținutului în lucrări rămâne o sarcină separată.

## Verificare

Teste de randare pentru biblioteca separată, parcursul manual fără cod introdus, alegerea explicită a răspunsului, cheia grupată, păstrarea ciornei și a importului între secțiuni, eșecul salvării colecției, ordinea selectorului de grile și recitirea formatelor la autentificare. Teste pure pentru TSV cu ghilimele, taburi, rânduri multiple, antete invalide și păstrarea identității la reîncercare. Parcursuri în browser fără salvări în biblioteca reală; verificare la lățime de telefon și în ambele teme.
