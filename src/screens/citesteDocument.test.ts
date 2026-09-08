import { describe, expect, it } from 'vitest';
import { TIPURI_SEED } from '../data/tipuriSeed';
import { documentCatreTabel, EXEMPLU_DOCUMENT, fisierTabel } from './citesteDocument';
import { celuleDin, tabelCatreJson } from './importTabel';

const tip = TIPURI_SEED.tip('simplu')!;
describe('pregătirea documentelor și fișierelor de tabel', () => {
  it('convertește exemplul în două întrebări în ordinea inițială', () => {
    const grile = JSON.parse(tabelCatreJson(documentCatreTabel(EXEMPLU_DOCUMENT, tip), 'bio-nervos', tip, 'lot'));
    expect(grile).toHaveLength(2);
    expect(grile[0]).toMatchObject({ correct: 'A', opts: [['A', 'Neuronul'], ['B', 'Nefronul']] });
    expect(grile[1].text).toBe('Unde se găsește ADN-ul nuclear?');
  });
  it('păstrează continuările de text și răspunsurile lipsă', () => {
    const r = JSON.parse(tabelCatreJson(documentCatreTabel('1. Întrebare\npe două rânduri\na) Una\nb) Două', tip), 'bio-nervos', tip, 'lot'));
    expect(r[0]).toMatchObject({ text: 'Întrebare\npe două rânduri', correct: '', expl: '' });
  });
  it('refuză numerotarea și câmpurile duplicate în loc să le suprascrie', () => {
    expect(() => documentCatreTabel('1. Una\n1. Două', tip)).toThrow(/două ori/);
    expect(() => documentCatreTabel('1. Una\nA. Unu\nA. Doi', tip)).toThrow(/două ori/);
    expect(() => documentCatreTabel('Titlu neîncadrat\n1. Una', tip)).toThrow(/linia 1/);
  });
  it('păstrează separatorii și rândurile noi din celulele CSV citate', () => {
    expect(celuleDin(fisierTabel('Enunț;A;B\r\n"Text, cu virgulă\nși continuare";"a;b";c', 'csv'))).toEqual([
      ['Enunț', 'A', 'B'], ['Text, cu virgulă\nși continuare', 'a;b', 'c'],
    ]);
    expect(celuleDin(fisierTabel('Enunț,A,B\n"Unu, doi",a,b', 'csv'))[1]).toEqual(['Unu, doi', 'a', 'b']);
  });
});
