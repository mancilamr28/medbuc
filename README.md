# MedBuc

Aplicație de pregătire pentru admiterea la UMFCD „Carol Davila” — grile cu explicații,
plan de învățare, simulări de examen și un panou de administrare a conținutului.

Implementarea urmează designul din `design/MedBuc.dc.html` (proiectul Claude Design).

## Rulare

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de producție în dist/
npm run preview    # servește build-ul
npm run typecheck
```

## Structura

```
src/
  App.tsx              cadrul aplicației: bară laterală, antet, conținut, navigație de jos
  main.tsx             punctul de intrare
  styles.css           tokenurile de design (light/dark) și stările interactive
  components/          bucăți reutilizabile (nav, grafice, variante de răspuns, switch…)
  data/                bibliografia, banca de grile, datele contului
  lib/                 rutare pe hash, hooks, utilitare de timp, helperi de stil
  screens/             câte un fișier per ecran
  state/               contextul aplicației + logica sesiunii și a simulării
design/
  MedBuc.dc.html       designul sursă, păstrat ca referință vizuală
```

## Ce face aplicația

| Ecran | Rută | Stare |
| --- | --- | --- |
| Pagina principală | `#/acasa` | două variante: **Focus** și **Dens** |
| Materii și capitole | `#/materii` | trei materii, filtre funcționale |
| Grile | `#/grile` | rezolvare cu verificare, explicații pe variantă, taste A–E / Enter |
| Planul meu | `#/plan` | parametrii planului și următoarele patru săptămâni |
| Simulări | `#/simulari` | configurare + simulare cu cronometru real |
| Profil și setări | `#/setari` | date cont, examen, notificări, temă |
| Administrare | `#/admin` | adăugare grile; blocat pentru rolul „Elev” |

Ecranele `#/recapitulare`, `#/statistici` și `#/notite` afișează pagina „în lucru”, ca în design.

## Decizii de implementare

- **Rutare pe hash**, fără dependințe: fiecare ecran are adresă proprie și butonul „înapoi”
  al browserului funcționează.
- **Layout responsiv real** în locul comutatorului desktop/telefon din design, care era un
  ajutor de prezentare: sub 960 px bara laterală devine navigație de jos.
- **Cronometre reale.** Sesiunea numără timpul scurs; simularea numără invers din durata
  aleasă și își ține starea în `localStorage`, deci „dacă închizi fereastra, timpul curge mai
  departe” este adevărat. Când timpul expiră, lucrarea se încheie.
- **Zile până la examen** se calculează din `EXAM_DATE` (25 iulie 2027), nu sunt scrise fix.
- **Filtrele de la Materii** funcționează: primele trei restrâng lista de capitole, iar
  „Include grilele neverificate” lărgește bazinul de grile, deci nu schimbă lista.
- **Persistență locală** pentru temă, notificări, notițele pe capitol și preferințele de
  afișare. Nu există încă backend — datele de conținut sunt în `src/data/`.
- **Ctrl/⌘ + K** duce cursorul în câmpul de căutare, așa cum promite indicația din câmp.
  Căutarea propriu-zisă rămâne de implementat, împreună cu ecranele marcate „în lucru”.

## De înlocuit

`public/logo-kitty.svg` este o marcă provizorie. Fișierul original `logo-kitty.png` din
proiectul de design nu a putut fi descărcat întreg (a fost tăiat de limita de transfer);
pune PNG-ul în `public/` și schimbă calea din `src/components/Logo.tsx`.
