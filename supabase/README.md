# Baza de date

Schema pentru backend-ul MedBuc, scrisă **înainte** de a exista proiectul Supabase, ca modelul să fie gândit direct în SQL și nu tradus mai târziu din tipuri TypeScript.

Proiectul Supabase există acum (regiune UE) și are schema, politicile și seed-ul aplicate. Din aplicație e legată deocamdată doar autentificarea: `AuthContext` citește sesiunea și `profiles.role` din bază. Ecranele de conținut citesc în continuare din `src/data/` — restul Fazei 3.

## Fișiere

| fișier | ce face |
|---|---|
| `migrations/0001_schema.sql` | tabelele, tipurile, constrângerile, indexurile |
| `migrations/0002_rls.sql` | Row Level Security: cine vede și cine scrie ce |
| `migrations/0003_functii_private.sql` | funcțiile mutate din `public`, cu drepturi și `search_path` explicite |
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

Politicile au fost verificate și invers: slăbind `notes_proprii` la `using (true)`, testele de izolare cad — deci chiar măsoară ceva. La fel și pentru funcții: scoțând migrarea 0003, cele patru teste din `describe('funcțiile')` cad; scoțând doar `grant execute ... on private.is_admin()`, cad nouă teste de bibliotecă cu `permission denied for function is_admin` — acordarea aceea e portantă, nu decor.

`harness.ts` citește migrările din director și le sortează după nume. Erau enumerate pe rând, iar o migrare nouă s-ar fi aplicat pe proiectul real fără să intre în teste — suita ar fi rămas verde demonstrând altceva decât ce rulează în producție.

`harness.ts` construiește bucățile pe care le pune Supabase și de care depind migrările (schema `auth`, `auth.uid()`, rolurile `anon` și `authenticated`). Sunt puține și ușor de comparat cu documentația — dacă se abat de la ce face Supabase, testele mint.

## Decizii de model

**Id-urile de conținut sunt `text` scris de om** (`bio-nervos`, `bio-nervos-01`), nu `uuid`. Sunt deja identitatea din aplicație și din lucrările salvate în `localStorage`, deci o simulare începută înainte de migrare rămâne validă după.

**`attempts` — o linie per răspuns — e singura sursă pentru progres.** Nimic nu ține un `pct` sau un `done` denormalizat; exact așa au apărut cifrele care nu corespundeau cu nimic. Tabelul e jurnal, nu stare: nu există politici de `update` sau `delete`, altfel „procent corecte" ar putea fi îmbunătățit din client.

**Răspunsul corect e o cheie externă compusă** către variantele grilei, deci nu se poate publica o grilă al cărei răspuns corect nu e printre variantele scrise. E amânată la commit, ca grila să poată fi inserată înaintea variantelor ei.

**Rolul trăiește în `profiles`, nu în client.** Azi e `useState<Role>('admin')`: aplicația pornește ca administrator și `#/admin` se deschide din bara de adrese. Un trigger refuză schimbarea rolului din browser; primul administrator se face din server, cu cheia de serviciu.

**Elevii nu văd ciornele.** Grilele au `status`, iar politica de citire lasă la vedere doar `publicata` — pentru toți în afară de administratori.

**Funcțiile stau în schema `private`, nu în `public`.** PostgREST publică `public`, deci orice funcție de acolo e apelabilă din browser la `/rest/v1/rpc/<nume>` — inclusiv cele `security definer`, care rulează cu drepturile proprietarului. Linterul Supabase a semnalat toate trei; `private` nu e publicată, iar `execute` e acordat doar lui `is_admin()`, singura chemată din expresiile politicilor. Cele de declanșator rămân fără drept pentru oricine, fiindcă execuția lor e verificată la `create trigger`, nu la fiecare declanșare.

Aici e și greșeala de reținut: 0002 avea `revoke execute on function public.is_admin() from anon` și nu făcea nimic. Dreptul nu venea de la `anon`, ci de la `public`, pseudo-rolul din care moștenesc toate rolurile — **un `revoke` de la un rol anume nu înseamnă nimic cât timp `public` mai are dreptul.** Testele din `rls.test.ts` întreabă acum `has_function_privilege`, adică dreptul efectiv, nu textul migrării.

**`public.sterge_contul()` e excepția deliberată.** E singura funcție rămasă în schema publicată, fiindcă e un RPC scris anume ca să fie chemat din client: dreptul GDPR de eliminare nu se poate exercita altfel, `auth.users` cerând drepturi pe care browserul nu are voie să le aibă. E sigură prin construcție — nu ia niciun parametru și șterge exact `auth.uid()`, deci nu există nimic de falsificat în cerere; `anon` nu o poate chema, iar fără sesiune ridică excepție.

Linterul Supabase **o va semnala** la `authenticated_security_definer_function_executable`. Semnalarea aia se lasă așa: e intenția, nu o scăpare. Testul din `rls.test.ts` ține o listă explicită a RPC-urilor admise în `public`, deci orice altă funcție ajunsă acolo din neatenție pică suita.

**Fiecare funcție are `search_path = ''`.** Fără o cale fixă, cine poate crea obiecte într-o schemă din calea de căutare poate umbri o funcție de sistem, iar un corp `security definer` o execută cu drepturi de proprietar. Corpurile califică deja fiecare referință cu schema ei.

## Ce lipsește, intenționat

- Legarea ecranelor de conținut la bază, cu stări de încărcare și de eroare.
- Migrarea datelor din `localStorage` la primul login.
- Validarea răspunsurilor de la API. Se face când există un API: o schemă scrisă acum, pe ghicite, s-ar rescrie la primul contact cu clientul real.
