import { describe, expect, it } from 'vitest';
import { TAXONOMIE_GOALA, construiesteTaxonomie } from './taxonomie';

const materii = [
  { id: 'chim', name: 'Chimie organică', position: 1 },
  { id: 'bio', name: 'Biologie', position: 0 },
];

const capitole = [
  { id: 'bio-nervos', materie_id: 'bio', nr: '03', name: 'Sistemul nervos', position: 2 },
  { id: 'bio-celula', materie_id: 'bio', nr: '01', name: 'Celula. Țesuturile', position: 0 },
  { id: 'chim-arene', materie_id: 'chim', nr: '04', name: 'Arene', position: 0 },
  { id: 'bio-analizatori', materie_id: 'bio', nr: '02', name: 'Analizatorii', position: 1 },
];

describe('construiesteTaxonomie', () => {
  /**
   * Rândurile vin de la PostgREST în orice ordine dacă nu se cere alta, iar
   * `position` e singurul lucru care spune cum se citește programa. Sortarea nu
   * poate rămâne în interogare: aceeași funcție e folosită și peste fixturi.
   */
  it('ordonează materiile și capitolele după position, nu după cum au venit', () => {
    const t = construiesteTaxonomie(materii, capitole);

    expect(t.materii.map((m) => m.id)).toEqual(['bio', 'chim']);
    expect(t.materii[0]!.list.map((c) => c.id)).toEqual([
      'bio-celula',
      'bio-analizatori',
      'bio-nervos',
    ]);
  });

  it('rezolvă eticheta și materia unui capitol', () => {
    const t = construiesteTaxonomie(materii, capitole);

    expect(t.eticheta('bio-nervos')).toBe('03. Sistemul nervos');
    expect(t.numeMaterie('bio-nervos')).toBe('Biologie');
    expect(t.capitol('chim-arene')?.materie).toBe('chim');
    expect(t.materie('chim')?.name).toBe('Chimie organică');
  });

  /**
   * Regula de degradare a întregului modul: un capitol necunoscut își arată
   * id-ul brut. E vizibil și reparabil — spre deosebire de a dispărea din
   * ecran, ceea ce ar arăta ca o pierdere de conținut.
   */
  it('cade pe id-ul brut pentru un capitol pe care nu-l cunoaște', () => {
    const t = construiesteTaxonomie(materii, capitole);

    expect(t.eticheta('ant-2026-mg')).toBe('ant-2026-mg');
    expect(t.numeMaterie('ant-2026-mg')).toBe('');
    expect(t.capitol('ant-2026-mg')).toBeUndefined();
    expect(t.esteCapitol('ant-2026-mg')).toBe(false);
  });

  it('recunoaște doar id-uri de capitol care există', () => {
    const t = construiesteTaxonomie(materii, capitole);

    expect(t.esteCapitol('bio-celula')).toBe(true);
    expect(t.esteCapitol(3)).toBe(false);
    expect(t.esteCapitol(null)).toBe(false);
  });

  /**
   * Exact situația care a produs divergența pe care migrarea 0009 o repară: în
   * bază apăruse materia `ant`, iar codul n-o cunoștea. Un capitol orfan trebuie
   * să rămână rezolvabil după id — altfel notițele și grilele care arată spre el
   * dispar tăcut — dar n-are voie să-și inventeze o materie.
   */
  it('păstrează un capitol a cărui materie lipsește, fără să-i inventeze una', () => {
    const t = construiesteTaxonomie(materii, [
      ...capitole,
      { id: 'ant-2026-mg', materie_id: 'ant', nr: '2026', name: 'Admitere UMFCD', position: 0 },
    ]);

    expect(t.capitol('ant-2026-mg')?.name).toBe('Admitere UMFCD');
    expect(t.eticheta('ant-2026-mg')).toBe('2026. Admitere UMFCD');
    expect(t.numeMaterie('ant-2026-mg')).toBe('');
    expect(t.materii.map((m) => m.id)).toEqual(['bio', 'chim']);
  });

  it('nu aruncă pe o taxonomie goală', () => {
    expect(TAXONOMIE_GOALA.materii).toEqual([]);
    expect(TAXONOMIE_GOALA.capitole).toEqual([]);
    expect(TAXONOMIE_GOALA.eticheta('bio-celula')).toBe('bio-celula');
    expect(TAXONOMIE_GOALA.esteCapitol('bio-celula')).toBe(false);
  });
});
