# Importă întrebări sau un test din JSON

În **Administrare → Importă un lot**, încarcă fișierul `.json` (maximum 5 MB).
Poți descărca un model pentru întrebări sau pentru un test complet chiar din panou.

1. Alege capitolul și formatul pentru întrebările care nu le au deja în fișier.
2. Verifică întrebările. Corectează enunțul, variantele, explicația sau răspunsul corect în formular; nu este nevoie să modifici JSON-ul.
3. Alege proveniența și starea. Implicit, întrebările se salvează ca **ciorne**.
4. Bifează că ai verificat răspunsurile și apasă **Importă**. Pentru publicare sau modificarea întrebărilor existente se cere o confirmare suplimentară.
5. Pentru o lucrare cu ordine fixă, apasă **Creează un test din acest lot** după importul complet. Completează sau verifică numele, durata și colecția, apoi salvează testul. Întrebările rămân disponibile și separat în bibliotecă.

Un test poate fi salvat ca ciornă. Pentru a-l publica, toate întrebările sale trebuie să fie publicate. Constructorul cere un centru de admitere, determinat din colecțiile configurate.

## Pentru persoana care pregătește fișierul

O listă de întrebări are forma de mai jos. Repetă obiectul pentru fiecare întrebare, cu o virgulă între obiecte.

```json
[
  {
    "text": "Care este unitatea structurală a sistemului nervos?",
    "opts": [["A", "Neuronul"], ["B", "Nefronul"]],
    "correct": "A",
    "expl": "Neuronul este celula specializată în transmiterea impulsurilor nervoase.",
    "src": "Manual, capitolul Sistemul nervos"
  }
]
```

Pentru un test complet, pune lista în `grile` și adaugă numele și durata:

```json
{
  "test": { "nume": "Simulare de biologie", "durataMinute": 90 },
  "grile": [
    {
      "text": "Care este unitatea structurală a sistemului nervos?",
      "opts": [["A", "Neuronul"], ["B", "Nefronul"]],
      "correct": "A",
      "expl": "Neuronul transmite impulsuri nervoase."
    }
  ]
}
```

Durata este un număr întreg pozitiv; omiterea ei înseamnă fără limită de timp. Ordinea întrebărilor din listă devine ordinea testului.

- `id` este opțional pentru întrebări noi: aplicația generează codurile. Un `id` existent actualizează întrebarea, după confirmare. Un fișier fără coduri încărcat ca lot nou creează întrebări noi.
- `capId` și `tip` sunt opționale dacă alegi capitolul și formatul în panou. Pot fi specificate individual pentru un lot mixt.
- `correct` este o singură literă A–E care corespunde unei variante scrise. Răspunsurile nu sunt ghicite.
- `expl` este obligatorie. `src` este referința bibliografică opțională.
- Pentru complement grupat, folosește modelul descărcat după alegerea acestui format; el include afirmațiile și variantele potrivite.
- Exporturile JSON existente ale bibliotecii sunt acceptate. Proveniența și starea deja scrise pe fiecare întrebare au prioritate față de alegerile comune din panou.

## Corecturi și reîncercări

**Descarcă lotul pregătit** păstrează corecturile și codurile într-un fișier care poate fi reluat. După o eroare de rețea, păstrează lotul în panou și reîncearcă: codurile rămân aceleași, deci întrebările salvate deja nu se dublează. Importul folosește câte o salvare pentru fiecare întrebare, nu o singură tranzacție; bilanțul arată eventualele reușite parțiale.

Un pachet cu `test` trebuie să treacă integral validarea înainte de import. Dacă o salvare eșuează, testul nu poate fi creat din lot până când importul nu reușește complet. O listă obișnuită poate omite rândurile invalide numai după confirmarea explicită.

Se semnalează enunțurile repetate în același lot. Verificarea nu caută duplicate după text în biblioteca existentă.

Panoul acceptă și CSV/TSV sau celule copiate din Excel. Textul numerotat din Word/PDF poate fi pregătit prin **Din document**. Fișierele Word, PDF și imaginile scanate nu se încarcă direct; pentru acestea este necesară copierea sau transcrierea textului.
