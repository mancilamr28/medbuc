import { describe, expect, it } from 'vitest';
import { tabelCatreJson, tabelCuIdentitati, randuriRepetate, celuleDin, scrieCelule } from './importTabel';
import { TIPURI_SEED } from '../data/tipuriSeed';

const citeste = (text: string) => JSON.parse(tabelCatreJson(text, 'bio-nervos', TIPURI_SEED.tip('simplu')!, 'lot-test'));
describe('importul din tabel', () => {
  it('semnalează enunțurile repetate fără să considere celulele goale duplicate', () => {
    expect(randuriRepetate('Enunț\tA\nȚesut\ta\n tesut \tb\n\tc\n\td')).toEqual([[1, 2]]);
  });
  it('editarea păstrează taburile, ghilimelele și rândurile noi', () => {
    const celule = [['Enunț', 'A'], ['O "întrebare"\npe două rânduri', 'un\ttab']];
    expect(celuleDin(scrieCelule(celule))).toEqual(celule);
  });
  it('păstrează codul unui rând la reîncercare chiar după eliminarea celui dinainte', () => {
    const cuCod = tabelCuIdentitati('Enunț\tA\tB\tCorect\tExplicație\nPrima\ta\tb\tB\te\nA doua\ta\tb\tB\te', 'lot-test');
    const [antet, , alDoilea] = cuCod.split('\n');
    expect(citeste(`${antet}\n${alDoilea}`)[0].id).toBe('lot-test-2');
    expect(tabelCuIdentitati(cuCod, 'alt-lot')).toBe(cuCod);
  });
  it('transformă antetul și păstrează textul cu taburi, ghilimele și rânduri noi', () => {
    const r = citeste('Enunț\tA\tB\tCorect\tExplicație\n"O întrebare\ncu ""citat"""\t"a\tb"\tb\tB\tExplicație');
    expect(r[0]).toMatchObject({ id: 'lot-test-1', capId: 'bio-nervos', text: 'O întrebare\ncu "citat"', correct: 'B', opts: [['A', 'a\tb'], ['B', 'b']] });
  });
  it('nu inventează un răspuns corect și nu acceptă antete necunoscute', () => {
    expect(citeste('Enunț\tA\tB\tCorect\tExplicație\nÎntrebare\ta\tb\t\te')[0].correct).toBe('');
    expect(() => citeste('Întrebare\tA\tB')).toThrow(/Enunț/);
    expect(() => citeste('Enunț\tA\tB\tCorect\tExplicație\tSurpriză')).toThrow(/Surpriză/);
  });
  it('completează cheia grupată din registrul tipurilor', () => {
    const r = JSON.parse(tabelCatreJson('Enunț\tAfirmația 1\tAfirmația 2\tAfirmația 3\tAfirmația 4\tCorect\tExplicație\nQ\tu\td\tt\tp\tA\tE', 'bio-nervos', TIPURI_SEED.tip('grupat')!, 'lot'));
    expect(r[0].enunturi).toEqual(['u', 'd', 't', 'p']);
    expect(r[0].opts.map((o: string[]) => o[1])).toEqual(TIPURI_SEED.tip('grupat')!.sablonOptiuni);
  });
  it('refuză un rând cu coloane în plus și ghilimele neînchise', () => {
    expect(() => citeste('Enunț\tA\tB\tCorect\tExplicație\nq\ta\tb\tA\te\textra')).toThrow(/Rândul 2/);
    expect(() => citeste('Enunț\tA\tB\tCorect\tExplicație\n"q')).toThrow(/ghilimele/);
  });
});
