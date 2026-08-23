/**
 * Tipurile de grilă, citite din bază.
 *
 * Erau o uniune compilată — `'simplu' | 'grupat'` — plus o ramură în fiecare loc
 * care se uita la ea: validare, salvare, randare, import. Un format nou ar fi
 * cerut un `alter type ... add value` (ireversibil, cu restricții în tranzacție)
 * și patru ramuri noi. Acum e un rând în `question_types`.
 *
 * `id` e **string, nu uniune**, și e deliberat: uniunea compilată e exact ce a
 * produs divergența `MaterieId = 'bio' | 'chim'` față de baza care avea trei
 * materii. Nu se reintroduce cu un nivel mai jos.
 *
 * Modulul e pur, ca `taxonomie.ts` și din același motiv: generatorul de seed îl
 * atinge prin esbuild cu `platform: 'neutral'`, unde un import de client Supabase
 * oprește `npm run seed`. Citirea stă în `continut.ts`.
 */

export interface TipGrila {
  /** Nu o uniune: tipurile trăiesc în bază, unde pot fi adăugate fără build. */
  id: string;
  nume: string;
  descriere: string;
  /**
   * Textele fixe ale variantelor, când formatul le prescrie.
   *
   * La complementul grupat variantele nu sunt conținut, sunt cheia formatului:
   * A = „1, 2, 3", B = „1, 3", C = „2, 4", D = „doar 4", E = „toate". Non-null
   * înseamnă și că sunt poziționale, deci netransportabile prin amestecare.
   */
  sablonOptiuni: string[] | null;
  nrOptiuniMin: number;
  nrOptiuniMax: number;
  /** Dacă variantele pot fi amestecate la generarea unui test. */
  permiteAmestecare: boolean;
  cereEnunturi: boolean;
  nrEnunturi: number | null;
  /** Vocabular mic; un hint necunoscut se randează ca `lista`, nu gol. */
  hintRandare: string;
}

export interface TipuriGrile {
  lista: TipGrila[];
  tip: (id: string) => TipGrila | undefined;
  /** Numele tipului; id-ul brut dacă nu se cunoaște. */
  eticheta: (id: string) => string;
}

export interface RandTip {
  id: string;
  nume: string;
  descriere: string;
  sablon_optiuni: string[] | null;
  nr_optiuni_min: number;
  nr_optiuni_max: number;
  permite_amestecare: boolean;
  cere_enunturi: boolean;
  nr_enunturi: number | null;
  hint_randare: string;
  position: number;
}

export function construiesteTipuri(randuri: readonly RandTip[]): TipuriGrile {
  const lista = [...randuri]
    .sort((a, b) => a.position - b.position)
    .map<TipGrila>((r) => ({
      id: r.id,
      nume: r.nume,
      descriere: r.descriere,
      sablonOptiuni: r.sablon_optiuni,
      nrOptiuniMin: r.nr_optiuni_min,
      nrOptiuniMax: r.nr_optiuni_max,
      permiteAmestecare: r.permite_amestecare,
      cereEnunturi: r.cere_enunturi,
      nrEnunturi: r.nr_enunturi,
      hintRandare: r.hint_randare,
    }));

  const dupaId = new Map(lista.map((t) => [t.id, t]));

  return {
    lista,
    tip: (id) => dupaId.get(id),
    eticheta: (id) => dupaId.get(id)?.nume ?? id,
  };
}

/**
 * Goale, pentru momentul dinaintea primei citiri.
 *
 * Nu e un caz special de tratat peste tot: un tip necunoscut se randează ca
 * listă simplă de variante și își arată id-ul în loc de nume. Un ecran randat
 * prea devreme e sărac, nu stricat.
 */
export const TIPURI_GOALE: TipuriGrile = construiesteTipuri([]);
