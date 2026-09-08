import type { TipGrila } from '../lib/tipuriGrile';

export interface TestDinFisier { nume: string; durata: string }
export interface JsonPregatit { grile: Record<string, unknown>[]; test: TestDinFisier | null }
const obiect = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Identitatea se fixează înainte de editare sau de prima cerere de salvare. */
export function pregatesteJson(text: string, lotId: string, capitol: string, tip: string): JsonPregatit {
  let brut: unknown;
  try { brut = JSON.parse(text); }
  catch { throw new Error('Fișierul JSON nu poate fi citit. Verifică virgulele și ghilimelele sau pornește de la modelul descărcabil.'); }
  const lista: unknown = obiect(brut) ? brut['grile'] : brut;
  if (!Array.isArray(lista)) throw new Error('Fișierul trebuie să conțină o listă de grile sau un obiect cu lista „grile”. Descarcă modelul pentru un exemplu complet.');
  if (lista.some((r) => !obiect(r))) throw new Error('Fiecare element din listă trebuie să fie o întrebare. Verifică modelul descărcabil.');
  let test: TestDinFisier | null = null;
  if (obiect(brut) && brut['test'] !== undefined) {
    const t = brut['test'];
    if (!obiect(t) || typeof t['nume'] !== 'string' || !t['nume'].trim()) throw new Error('Completează numele testului în câmpul „test.nume”.');
    const durata = t['durataMinute'];
    if (durata !== undefined && durata !== null && (typeof durata !== 'number' || !Number.isInteger(durata) || durata <= 0)) throw new Error('Durata testului trebuie să fie un număr întreg de minute, mai mare decât zero.');
    test = { nume: t['nume'].trim(), durata: durata == null ? '' : String(durata) };
  }
  return {
    grile: lista.map((r: Record<string, unknown>, i: number) => ({
      ...r, id: r['id'] || `${lotId}-${i + 1}`, capId: r['capId'] || capitol, tip: r['tip'] || tip,
    })), test,
  };
}

export function scrieJsonPregatit(pregatit: JsonPregatit): string {
  return JSON.stringify(pregatit.test ? {
    test: { nume: pregatit.test.nume, ...(pregatit.test.durata ? { durataMinute: Number(pregatit.test.durata) } : {}) },
    grile: pregatit.grile,
  } : pregatit.grile, null, 2);
}

export function modelJson(tip: TipGrila, cuTest: boolean): string {
  const grile = [{
    tip: tip.id,
    text: 'Înlocuiește acest text cu enunțul întrebării.',
    ...(tip.cereEnunturi ? { enunturi: Array.from({ length: tip.nrEnunturi ?? 0 }, (_, i) => `Afirmația ${i + 1}`) } : {}),
    opts: (tip.sablonOptiuni ?? ['Prima variantă', 'A doua variantă', 'A treia variantă', 'A patra variantă', 'A cincea variantă']).map((text, i) => [String.fromCharCode(65 + i), text]),
    correct: 'A', expl: 'Înlocuiește cu explicația răspunsului corect.', src: '',
  }];
  return JSON.stringify(cuTest ? { test: { nume: 'Numele testului', durataMinute: 120 }, grile } : grile, null, 2);
}
