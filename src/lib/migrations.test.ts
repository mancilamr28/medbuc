import { describe, expect, it } from 'vitest';
import { NOTE_PREFIX, noteKeyMoves } from './migrations';

describe('noteKeyMoves', () => {
  it('mută notița de pe eticheta capitolului pe id', () => {
    expect(noteKeyMoves([`${NOTE_PREFIX}03. Sistemul nervos`])).toEqual([
      { from: `${NOTE_PREFIX}03. Sistemul nervos`, to: `${NOTE_PREFIX}bio-nervos` },
    ]);
  });

  it('nu atinge cheile care nu sunt notițe', () => {
    expect(noteKeyMoves(['medbuc.theme', 'medbuc.sim.run', 'altceva'])).toEqual([]);
  });

  it('lasă pe loc notițele deja trecute pe id', () => {
    expect(noteKeyMoves([`${NOTE_PREFIX}bio-nervos`])).toEqual([]);
  });

  it('nu acoperă o notiță nouă cu una veche', () => {
    const moves = noteKeyMoves([`${NOTE_PREFIX}03. Sistemul nervos`, `${NOTE_PREFIX}bio-nervos`]);
    expect(moves).toEqual([]);
  });

  it('păstrează o notiță al cărei capitol nu mai există', () => {
    expect(noteKeyMoves([`${NOTE_PREFIX}99. Capitol scos`])).toEqual([]);
  });

  it('mută mai multe notițe deodată', () => {
    const moves = noteKeyMoves([
      `${NOTE_PREFIX}05. Alcooli. Fenoli`,
      'medbuc.theme',
      `${NOTE_PREFIX}07. Sângele. Hemostaza`,
    ]);
    expect(moves.map((m) => m.to)).toEqual([
      `${NOTE_PREFIX}chim-alcooli`,
      `${NOTE_PREFIX}bio-sange`,
    ]);
  });
});
