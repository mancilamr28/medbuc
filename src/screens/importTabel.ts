import { OPTION_KEYS } from '../data/questions';
import type { TipGrila } from '../lib/tipuriGrile';

/** TSV copiat dintr-un tabel; celulele citate pot avea taburi și rânduri noi. */
export function celuleDin(text: string): string[][] {
  const randuri: string[][] = [];
  let rand: string[] = [], celula = '', citat = false;
  const brut = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < brut.length; i++) {
    const c = brut[i]!;
    if (c === '"' && (citat || celula === '')) {
      if (citat && brut[i + 1] === '"') { celula += '"'; i++; }
      else citat = !citat;
    } else if (!citat && (c === '\t' || c === '\n')) {
      rand.push(celula); celula = '';
      if (c === '\n') { randuri.push(rand); rand = []; }
    } else celula += c;
  }
  if (citat) throw new Error('Există o celulă cu ghilimele neînchise. Copiază din nou tabelul complet.');
  rand.push(celula); randuri.push(rand);
  return randuri.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Serializarea simetrică păstrează inclusiv taburile și rândurile din celule. */
export function scrieCelule(randuri: string[][]): string {
  return randuri.map((r) => r.map((c) => /[\t\n\r"]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join('\t')).join('\n');
}

/** Indici de date (fără antet); avertizare, nu eliminare automată. */
export function randuriRepetate(text: string): number[][] {
  const [antet = [], ...randuri] = celuleDin(text);
  const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  const col = antet.findIndex((c) => normal(c) === 'enunt');
  if (col < 0) return [];
  const grupuri = new Map<string, number[]>();
  randuri.forEach((r, i) => {
    const cheie = normal(r[col] ?? '');
    if (cheie) grupuri.set(cheie, [...(grupuri.get(cheie) ?? []), i + 1]);
  });
  return [...grupuri.values()].filter((r) => r.length > 1);
}

export const antetTabel = (tip: TipGrila): string => [
  'Enunț',
  ...(tip.cereEnunturi ? Array.from({ length: tip.nrEnunturi ?? 0 }, (_, i) => `Afirmația ${i + 1}`) : OPTION_KEYS),
  'Corect', 'Explicație', 'Referință',
].join('\t');

/** După o reușită parțială, fiecare rând își păstrează identitatea chiar dacă e mutat. */
export function tabelCuIdentitati(text: string, lotId: string): string {
  const [antet = [], ...randuri] = celuleDin(text);
  if (antet.some((c) => c.trim().toLowerCase() === 'cod intern')) return text;
  const citeaza = (c: string) => /[\t\n"]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c;
  return [[...antet, 'Cod intern'], ...randuri.map((r, i) => [
    ...antet.map((_, j) => r[j] ?? ''), `${lotId}-${i + 1}`,
  ])].map((r) => r.map(citeaza).join('\t')).join('\n');
}

/** Se convertește, apoi se validează prin același citesteImport ca JSON-ul. */
export function tabelCatreJson(text: string, capitol: string, tip: TipGrila, lotId: string): string {
  if (!text.trim()) return '';
  const [antet = [], ...randuri] = celuleDin(text);
  const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const nume = antet.map(normal);
  const admise = [...antetTabel(tip).split('\t').map(normal), 'cod intern'];
  const obligatorii = ['enunt', 'corect', 'explicatie', ...(tip.cereEnunturi ? admise.filter((c) => c.startsWith('afirmatia')) : ['a', 'b'])];
  if (obligatorii.some((c) => !nume.includes(c))) throw new Error('Lipsește o coloană obligatorie. Folosește modelul cu Enunț, variante, Corect și Explicație.');
  const necunoscute = antet.filter((_, i) => !admise.includes(nume[i]!));
  if (necunoscute.length) throw new Error(`Coloane necunoscute: ${necunoscute.join(', ')}. Folosește antetul din model.`);
  if (new Set(nume).size !== nume.length) throw new Error('Antetul are coloane repetate.');
  return JSON.stringify(randuri.map((r, i) => {
    if (r.length > antet.length) throw new Error(`Rândul ${i + 2} are mai multe coloane decât antetul.`);
    const citeste = (k: string) => r[nume.indexOf(k)]?.trim() ?? '';
    return {
      id: citeste('cod intern') || `${lotId}-${i + 1}`, capId: capitol, tip: tip.id, text: citeste('enunt'),
      opts: OPTION_KEYS.flatMap((k, j) => {
        const text = tip.sablonOptiuni?.[j] ?? citeste(k.toLowerCase());
        return text ? [[k, text]] : [];
      }),
      ...(tip.cereEnunturi ? { enunturi: Array.from({ length: tip.nrEnunturi ?? 0 }, (_, j) => citeste(`afirmatia ${j + 1}`)) } : {}),
      correct: citeste('corect').toUpperCase(), expl: citeste('explicatie'), src: citeste('referinta'),
    };
  }));
}
