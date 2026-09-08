import type { TipGrila } from '../lib/tipuriGrile';
import { antetTabel, celuleDin, scrieCelule } from './importTabel';

export const EXEMPLU_DOCUMENT = `1. Care este unitatea structurală a sistemului nervos?
A. Neuronul
B. Nefronul
Corect: A
Explicație: Neuronul este celula specializată în transmiterea impulsurilor nervoase.
Referință: Manual, capitolul Sistemul nervos

2. Unde se găsește ADN-ul nuclear?
A. În nucleu
B. În membrana celulară
Corect: A
Explicație: ADN-ul nuclear se află în nucleul celulei.`;

/** Conversie explicită: nu ghicim răspunsuri și nu pierdem text neîncadrat. */
export function documentCatreTabel(text: string, tip: TipGrila): string {
  if (!text.trim()) throw new Error('Lipește mai întâi întrebările.');
  const antet = antetTabel(tip).split('\t');
  const randuri: string[][] = [];
  const numere = new Set<string>();
  let rand: string[] | null = null;
  let coloana = 0;
  const scrise = new Set<number>();
  for (const [index, original] of text.replace(/\r\n?/g, '\n').split('\n').entries()) {
    const linie = original.trim();
    if (!linie) continue;
    const inceput = /^(\d+)[.)]\s+(.+)$/.exec(linie);
    if (inceput) {
      if (numere.has(inceput[1]!)) throw new Error(`Numărul ${inceput[1]} apare de două ori. Numerotează fiecare întrebare o singură dată.`);
      numere.add(inceput[1]!);
      rand = antet.map(() => ''); rand[0] = inceput[2]!;
      randuri.push(rand); coloana = 0; scrise.clear();
      continue;
    }
    if (!rand) throw new Error(`La linia ${index + 1}, începe întrebarea cu un număr și punct, de exemplu „1. Enunțul”.`);
    const varianta = /^([A-E])[.)]\s*(.*)$/i.exec(linie);
    const afirmatie = /^Afirma[tț]ia\s+(\d+)\s*:\s*(.*)$/i.exec(linie);
    const camp = /^(Corect|R[aă]spuns(?:ul)? corect|Explica[tț]ie|Referin[tț][aă])\s*:\s*(.*)$/i.exec(linie);
    let nume: string | undefined, valoare = '';
    if (varianta) { nume = varianta[1]!.toUpperCase(); valoare = varianta[2]!; }
    else if (afirmatie) { nume = `Afirmația ${afirmatie[1]}`; valoare = afirmatie[2]!; }
    else if (camp) {
      const cheie = camp[1]!.toLowerCase();
      nume = cheie.startsWith('explica') ? 'Explicație' : cheie.startsWith('referin') ? 'Referință' : 'Corect';
      valoare = camp[2]!;
    }
    if (nume) {
      coloana = antet.indexOf(nume);
      if (coloana < 0) throw new Error(`Linia ${index + 1}: „${nume}” nu corespunde formatului ales. Verifică formatul întrebărilor.`);
      if (scrise.has(coloana)) throw new Error(`Linia ${index + 1}: câmpul „${nume}” apare de două ori în aceeași întrebare.`);
      scrise.add(coloana); rand[coloana] = valoare;
    } else {
      rand[coloana] += `\n${linie}`;
    }
  }
  return scrieCelule([antet, ...randuri]);
}

/** CSV românesc (;) sau internațional (,), fără separarea celulelor citate. */
export function fisierTabel(text: string, extensie: string): string {
  if (extensie === 'tsv' || extensie === 'txt') return scrieCelule(celuleDin(text));
  const variante = [',', ';', '\t'].map((separator) => {
    try { return celuleDin(text, separator); }
    catch { return []; }
  });
  const potrivite = variante.filter((r) => (r[0]?.length ?? 0) > 1);
  if (potrivite.length !== 1) throw new Error('Separatorul tabelului nu este clar. Salvează fișierul ca TSV sau copiază celulele din Excel.');
  return scrieCelule(potrivite[0]!);
}
