import { describe, expect, it } from 'vitest';
import { NOTE_PREFIX } from './migrations';
import { TAXONOMIE_SEED } from '../data/taxonomieSeed';
import { alegeNotita, capitoleCuNotita as capitoleCuNotitaPure, normalizeazaNotita, type NotitaBaza } from './notite';

/** Ordinea și „mai există capitolul?" vin acum din taxonomie, nu dintr-o constantă. */
const capitoleCuNotita = (keys: readonly string[], getValue: (key: string) => string | null) =>
  capitoleCuNotitaPure(keys, getValue, TAXONOMIE_SEED);

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

/**
 * Cu notițele ținute și pe cont, aceeași notiță poate exista în două locuri.
 * Regula e cea mai simplă care nu pierde text: câștigă cea scrisă ultima, iar
 * la egalitate cea de pe cont, fiindcă acolo a ajuns deja.
 */
describe('alegeNotita', () => {
  const peCont = (body: string, la: number): NotitaBaza => ({
    chapter_id: 'bio-celula',
    body,
    updated_at: new Date(la).toISOString(),
  });

  it('ia notița de pe cont când e mai nouă', () => {
    expect(alegeNotita({ body: 'veche', updatedAt: 1000 }, peCont('nouă', 5000))).toMatchObject({
      body: 'nouă',
      provenienta: 'cont',
    });
  });

  it('ține notița locală când e mai nouă', () => {
    expect(alegeNotita({ body: 'chiar acum', updatedAt: 9000 }, peCont('veche', 1000))).toMatchObject({
      body: 'chiar acum',
      provenienta: 'local',
    });
  });

  /**
   * O notiță scrisă înainte de câmpul `updatedAt` n-are oră, deci nu poate
   * pretinde că e mai nouă decât ce s-a sincronizat deja de pe alt dispozitiv.
   */
  it('lasă contul să câștige în fața unei notițe vechi, fără oră', () => {
    expect(alegeNotita(normalizeazaNotita('scrisă cândva'), peCont('de pe laptop', 5000))).toMatchObject({
      provenienta: 'cont',
    });
  });

  it('urcă localul când pe cont nu e nimic', () => {
    expect(alegeNotita({ body: 'doar aici', updatedAt: 1000 }, null)).toMatchObject({
      body: 'doar aici',
      provenienta: 'local',
    });
  });

  it('nu inventează nimic când nu există nici una, nici alta', () => {
    expect(alegeNotita(null, null)).toEqual({ body: '', updatedAt: 0, provenienta: 'goala' });
    expect(alegeNotita({ body: '   ', updatedAt: 5 }, null).provenienta).toBe('goala');
  });

  /** O oră imposibilă de pe cont nu are voie să șteargă textul de pe dispozitiv. */
  it('ignoră o dată coruptă de pe cont', () => {
    const stricata: NotitaBaza = { chapter_id: 'bio-celula', body: 'x', updated_at: 'nicicând' };
    expect(alegeNotita({ body: 'al meu', updatedAt: 1 }, stricata)).toMatchObject({
      body: 'al meu',
      provenienta: 'local',
    });
  });
});

describe('normalizeazaNotita', () => {
  it('aduce forma veche — doar textul — la cea cu oră', () => {
    expect(normalizeazaNotita('text vechi')).toEqual({ body: 'text vechi', updatedAt: 0 });
    expect(normalizeazaNotita({ body: 'nou', updatedAt: 7 })).toEqual({ body: 'nou', updatedAt: 7 });
  });
});
