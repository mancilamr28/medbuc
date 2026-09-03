import { describe, expect, it } from 'vitest';
import { COLECTII_GOALE, construiesteColectii, type RandColectie } from './colectii';

const rand = (peste: Partial<RandColectie> = {}): RandColectie => ({
  id: 'umfcd-2026-mg',
  centru_id: 'umfcd',
  nume: 'Admitere UMFCD · Medicină · 2026',
  tip: 'subiect_oficial',
  an: 2026,
  sursa_bibliografica: '',
  acces: 'liber',
  publicat: true,
  position: 0,
  ...peste,
});

describe('construiesteColectii', () => {
  it('ordonează după position și rezolvă după id', () => {
    const c = construiesteColectii([
      rand({ id: 'corint-nervos', nume: 'Corint – Sistemul nervos', position: 5 }),
      rand(),
    ]);

    expect(c.lista.map((x) => x.id)).toEqual(['umfcd-2026-mg', 'corint-nervos']);
    expect(c.colectie('corint-nervos')?.nume).toBe('Corint – Sistemul nervos');
  });

  /**
   * Aceeași regulă de degradare ca la taxonomie și la tipuri: o colecție
   * necunoscută își arată id-ul, ca să fie vizibilă și reparabilă, nu să dispară
   * din ecran ca și cum grila n-ar veni de nicăieri.
   */
  it('cade pe id-ul brut pentru o colecție pe care nu o cunoaște', () => {
    const c = construiesteColectii([rand()]);

    expect(c.eticheta('lot-inventat')).toBe('lot-inventat');
    expect(c.colectie('lot-inventat')).toBeUndefined();
  });

  /** O culegere n-are centru: o carte nu ține de un centru de admitere. */
  it('acceptă o colecție fără centru și fără an', () => {
    const c = construiesteColectii([
      rand({ id: 'corint-nervos', centru_id: null, an: null, tip: 'culegere' }),
    ]);

    expect(c.colectie('corint-nervos')).toMatchObject({ centruId: null, an: null, tip: 'culegere' });
  });

  it('nu aruncă pe o listă goală', () => {
    expect(COLECTII_GOALE.lista).toEqual([]);
    expect(COLECTII_GOALE.eticheta('umfcd-2026-mg')).toBe('umfcd-2026-mg');
  });
});
