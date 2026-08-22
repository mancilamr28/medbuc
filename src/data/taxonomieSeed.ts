import { construiesteTaxonomie, type RandCapitol, type RandMaterie, type Taxonomie } from '../lib/taxonomie';

/**
 * Taxonomia de pornire a unui proiect gol — **nu** adevărul de la runtime.
 *
 * Aplicația citește materiile și capitolele din bază (`src/lib/taxonomie.ts`).
 * Fișierul ăsta există pentru două lucruri, ambele în afara aplicației:
 * `npm run seed` generează din el `supabase/seed.sql`, iar testele îl folosesc
 * ca fixtură. Nimic din `src/` care rulează în browser nu are voie să-l importe
 * — dacă se întâmplă, lista compilată redevine o a doua sursă de adevăr și
 * divergența pe care migrarea 0009 a reparat-o se întoarce.
 *
 * De aceea nu conține materia `ant` din producție: ce s-a scris în bază după
 * pornire nu se întoarce aici.
 */

export const MATERII_SEED: RandMaterie[] = [
  { id: 'bio', name: 'Biologie', position: 0 },
  { id: 'chim', name: 'Chimie organică', position: 1 },
];

/** `[id, nr, name]`, în ordinea în care apar sub materia lor. */
type LinieCapitol = [string, string, string];

const capitole = (materie: string, de: number, randuri: LinieCapitol[]): RandCapitol[] =>
  randuri.map(([id, nr, name], i) => ({ id, materie_id: materie, nr, name, position: de + i }));

export const CAPITOLE_SEED: RandCapitol[] = [
  ...capitole('bio', 0, [
    ['bio-celula', '01', 'Celula. Țesuturile'],
    ['bio-analizatori', '02', 'Analizatorii'],
    ['bio-nervos', '03', 'Sistemul nervos'],
    ['bio-endocrin', '04', 'Glandele endocrine'],
    ['bio-osos', '05', 'Sistemul osos'],
    ['bio-muscular', '06', 'Sistemul muscular'],
    ['bio-sange', '07', 'Sângele. Hemostaza'],
    ['bio-circulator', '08', 'Sistemul circulator'],
    ['bio-digestie', '09', 'Digestia și absorbția'],
    ['bio-respiratie', '10', 'Respirația'],
    ['bio-excretie', '11', 'Excreția'],
    ['bio-reproducere', '12', 'Reproducerea'],
  ]),
  ...capitole('chim', 0, [
    ['chim-introducere', '01', 'Introducere în chimia organică'],
    ['chim-alcani', '02', 'Alcani'],
    ['chim-alchene', '03', 'Alchene și alchine'],
    ['chim-arene', '04', 'Arene'],
    ['chim-alcooli', '05', 'Alcooli. Fenoli'],
    ['chim-acizi', '06', 'Acizi carboxilici'],
    ['chim-amine', '07', 'Amine'],
    ['chim-aminoacizi', '08', 'Aminoacizi și proteine'],
    ['chim-zaharide', '09', 'Zaharide'],
    ['chim-izomerie', '10', 'Izomerie'],
  ]),
];

/**
 * Taxonomia de pornire, gata construită.
 *
 * Fixtura testelor pure: acolo unde o funcție cere acum o `Taxonomie`, testul îi
 * dă asta în loc să inventeze una. Aplicația nu o folosește niciodată — ea
 * citește din bază.
 */
export const TAXONOMIE_SEED: Taxonomie = construiesteTaxonomie(MATERII_SEED, CAPITOLE_SEED);
