# Baza de date

Schema pentru backend-ul MedBuc, scrisă **înainte** de a exista proiectul Supabase, ca modelul să fie gândit direct în SQL și nu tradus mai târziu din tipuri TypeScript.

Nimic din ce e aici nu e conectat încă la aplicație. Ecranele citesc în continuare din `src/data/`. Pasul următor (Faza 3 din plan) leagă clientul de baza reală.

## Fișiere

| fișier | ce face |
|---|---|
| `migrations/0001_schema.sql` | tabelele, tipurile, constrângerile, indexurile |
| `migrations/0002_rls.sql` | Row Level Security: cine vede și cine scrie ce |
| `seed.sql` | **generat** — materiile, capitolele și grilele din `src/data/` |
| `harness.ts` | pornește un Postgres gol și aplică tot, pentru teste |
| `schema.test.ts`, `rls.test.ts` | verifică schema și politicile prin rulare |

Migrările se aplică în ordinea numerelor și sunt imutabile odată aplicate: o schimbare de model înseamnă un fișier nou, nu o editare a celui vechi.

## Cum se regenerează seed-ul

```bash
npm run seed
```

Citește chiar modulele din `src/data/`, deci nu poate rămâne în urma bibliotecii. Conținutul nu se transcrie de mână — cele șase grile au împreună treizeci de explicații per variantă, iar o greșeală de copiere ar strica o grilă fără ca nimic să semnaleze.

Seed-ul e idempotent: se poate rula peste o bază care are deja datele, iar o corectură făcută în sursă ajunge în bază fără migrare nouă.

## Cum sunt verificate

Prin rulare, nu prin citire. Testele pornesc un Postgres adevărat în proces — [PGlite](https://pglite.dev), Postgres 18 compilat în WebAssembly — aplică migrările și seed-ul, apoi interoghează în numele unor utilizatori diferiți.

```bash
npx vitest run --project unit supabase
```

Asta contează mai ales pentru RLS: **o politică greșită nu dă eroare, ci arată datele altcuiva.** Un test care doar citește fișierul de politici n-ar prinde nimic, așa că fiecare interogare trece prin rolul `authenticated`, cu un id de utilizator pus în cerere, exact cum ajunge o interogare din browser.

Politicile au fost verificate și invers: slăbind `notes_proprii` la `using (true)`, testele de izolare cad — deci chiar măsoară ceva.

`harness.ts` construiește bucățile pe care le pune Supabase și de care depind migrările (schema `auth`, `auth.uid()`, rolurile `anon` și `authenticated`). Sunt puține și ușor de comparat cu documentația — dacă se abat de la ce face Supabase, testele mint.

## Decizii de model

**Id-urile de conținut sunt `text` scris de om** (`bio-nervos`, `bio-nervos-01`), nu `uuid`. Sunt deja identitatea din aplicație și din lucrările salvate în `localStorage`, deci o simulare începută înainte de migrare rămâne validă după.

**`attempts` — o linie per răspuns — e singura sursă pentru progres.** Nimic nu ține un `pct` sau un `done` denormalizat; exact așa au apărut cifrele care nu corespundeau cu nimic. Tabelul e jurnal, nu stare: nu există politici de `update` sau `delete`, altfel „procent corecte" ar putea fi îmbunătățit din client.

**Răspunsul corect e o cheie externă compusă** către variantele grilei, deci nu se poate publica o grilă al cărei răspuns corect nu e printre variantele scrise. E amânată la commit, ca grila să poată fi inserată înaintea variantelor ei.

**Rolul trăiește în `profiles`, nu în client.** Azi e `useState<Role>('admin')`: aplicația pornește ca administrator și `#/admin` se deschide din bara de adrese. Un trigger refuză schimbarea rolului din browser; primul administrator se face din server, cu cheia de serviciu.

**Elevii nu văd ciornele.** Grilele au `status`, iar politica de citire lasă la vedere doar `publicata` — pentru toți în afară de administratori.

## Ce lipsește, intenționat

- Proiectul Supabase și cheile — le creezi tu, cu regiune în UE.
- Legarea clientului de bază, cu stări de încărcare și de eroare.
- Migrarea datelor din `localStorage` la primul login.
- Validarea răspunsurilor de la API. Se face când există un API: o schemă scrisă acum, pe ghicite, s-ar rescrie la primul contact cu clientul real.
