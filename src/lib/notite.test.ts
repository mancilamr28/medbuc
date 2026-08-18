import { describe, expect, it } from 'vitest';
import { NOTE_PREFIX } from './migrations';
import { capitoleCuNotita } from './notite';

const val = (map: Record<string, string | null>) => (key: string) => map[key] ?? null;

describe('capitoleCuNotita', () => {
  it('exclude cheile care nu sunt notițe', () => {
    expect(capitoleCuNotita(['medbuc.theme', 'medbuc.sim.run'], val({}))).toEqual([]);
  });

  it('exclude o notiță goală sau doar spații', () => {
    const keys = [`${NOTE_PREFIX}bio-nervos`, `${NOTE_PREFIX}bio-celula`];
    expect(
      capitoleCuNotita(
        keys,
        val({
          [`${NOTE_PREFIX}bio-nervos`]: JSON.stringify(''),
          [`${NOTE_PREFIX}bio-celula`]: JSON.stringify('   '),
        }),
      ),
    ).toEqual([]);
  });

  it('exclude o valoare JSON coruptă', () => {
    expect(capitoleCuNotita([`${NOTE_PREFIX}bio-nervos`], val({ [`${NOTE_PREFIX}bio-nervos`]: '{nu e json' }))).toEqual([]);
  });

  it('exclude un capitol care nu mai există', () => {
    expect(
      capitoleCuNotita(['medbuc.note.capitol-scos'], val({ 'medbuc.note.capitol-scos': JSON.stringify('text') })),
    ).toEqual([]);
  });

  it('ordonează după bibliografie, nu după ordinea cheilor', () => {
    const keys = [`${NOTE_PREFIX}bio-osos`, `${NOTE_PREFIX}bio-celula`, `${NOTE_PREFIX}bio-nervos`];
    const notite = capitoleCuNotita(
      keys,
      val({
        [`${NOTE_PREFIX}bio-osos`]: JSON.stringify('despre oase'),
        [`${NOTE_PREFIX}bio-celula`]: JSON.stringify('despre celulă'),
        [`${NOTE_PREFIX}bio-nervos`]: JSON.stringify('despre nervi'),
      }),
    );
    expect(notite).toEqual(['bio-celula', 'bio-nervos', 'bio-osos']);
  });
});
