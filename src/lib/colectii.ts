/**
 * Colecțiile — lotul din care vine o grilă, ca entitate.
 *
 * Migrarea 0008 a pus `questions.colectie` ca text liber, ceea ce a fost
 * răspunsul corect atunci: nu se știa ce forme ia. Text liber nu se poate însă
 * filtra, nu se poate renumi fără un `update` peste tot, și n-are unde să-și
 * țină anul sau cartea din care vine. Migrarea 0011 îl mută la un tabel.
 *
 * Aici trăiesc și lucrările de admitere. Erau modelate ca materie (`ant`) cu
 * „capitole" care erau de fapt lucrări — model care contrazicea decizia scrisă
 * în `data/questions.ts`: o grilă dintr-un subiect oficial ține în continuare de
 * un capitol **real** de conținut, ca să poată fi filtrată și pe materie, și pe
 * proveniență. O lucrare nu e un capitol.
 *
 * Modul pur, ca `taxonomie.ts` și `tipuriGrile.ts`, din același motiv: citirea
 * stă în `continut.ts`, altfel generatorul de seed trage clientul Supabase în
 * bundle și `npm run seed` cade.
 */

/** Felul colecției. String, nu uniune — valorile trăiesc într-un enum din bază. */
export type ColectieTip = string;

export interface Colectie {
  id: string;
  /** Null la o culegere: o carte nu ține de un centru de admitere. */
  centruId: string | null;
  nume: string;
  tip: ColectieTip;
  an: number | null;
  /** Cartea și ediția — pentru întrebarea de drepturi, care vine înaintea plății. */
  sursaBibliografica: string;
  /** Cine poate folosi grilele colecției într-o lucrare. */
  acces: 'liber' | 'premium';
  publicat: boolean;
}

export interface Colectii {
  lista: Colectie[];
  colectie: (id: string) => Colectie | undefined;
  /** Numele colecției; id-ul brut dacă nu se cunoaște. */
  eticheta: (id: string) => string;
}

export interface RandColectie {
  id: string;
  centru_id: string | null;
  nume: string;
  tip: string;
  an: number | null;
  sursa_bibliografica: string;
  acces: 'liber' | 'premium';
  publicat: boolean;
  position: number;
}

export function construiesteColectii(randuri: readonly RandColectie[]): Colectii {
  const lista = [...randuri]
    .sort((a, b) => a.position - b.position)
    .map<Colectie>((r) => ({
      id: r.id,
      centruId: r.centru_id,
      nume: r.nume,
      tip: r.tip,
      an: r.an,
      sursaBibliografica: r.sursa_bibliografica,
      acces: r.acces,
      publicat: r.publicat,
    }));

  const dupaId = new Map(lista.map((c) => [c.id, c]));

  return {
    lista,
    colectie: (id) => dupaId.get(id),
    eticheta: (id) => dupaId.get(id)?.nume ?? id,
  };
}

export const COLECTII_GOALE: Colectii = construiesteColectii([]);
