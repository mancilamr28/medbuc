import { describe, expect, it } from 'vitest';
import { chapterLabel } from './chapters';
import { CAPITOLE_SEED, MATERII_SEED, TAXONOMIE_SEED } from './taxonomieSeed';
import { QUESTIONS } from './questions';

/**
 * Capitolele nu mai sunt o constantă compilată — trăiesc în bază și se citesc la
 * runtime (`src/lib/taxonomie.ts`). Ce a rămas aici sunt invarianții fixturii:
 * seed-ul din care pornește un proiect gol și pe care se sprijină toate testele
 * pure trebuie să fie el însuși coerent.
 */
describe('taxonomia de pornire', () => {
  it('are un id unic pentru fiecare capitol', () => {
    const ids = CAPITOLE_SEED.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('leagă fiecare capitol de o materie care există', () => {
    const materii = new Set(MATERII_SEED.map((m) => m.id));
    for (const c of CAPITOLE_SEED) {
      expect(materii.has(c.materie_id), `capitolul ${c.id} arată spre ${c.materie_id}`).toBe(true);
    }
  });

  it('leagă fiecare capitol de numele materiei lui', () => {
    expect(TAXONOMIE_SEED.numeMaterie('bio-nervos')).toBe('Biologie');
    expect(TAXONOMIE_SEED.numeMaterie('chim-arene')).toBe('Chimie organică');
  });

  it('recunoaște un capitol al ei și respinge unul inventat', () => {
    expect(TAXONOMIE_SEED.esteCapitol('bio-nervos')).toBe(true);
    expect(TAXONOMIE_SEED.esteCapitol('capitol-inventat')).toBe(false);
    expect(TAXONOMIE_SEED.esteCapitol(3)).toBe(false);
  });

  it('compune eticheta din număr și nume', () => {
    expect(TAXONOMIE_SEED.eticheta('bio-nervos')).toBe('03. Sistemul nervos');
    expect(chapterLabel({ id: 'x', materie: 'bio', nr: '07', name: 'Ceva' })).toBe('07. Ceva');
  });
});

describe('legătura grilă → capitol', () => {
  it('trimite fiecare grilă de fixtură spre un capitol care există', () => {
    for (const q of QUESTIONS) {
      expect(TAXONOMIE_SEED.capitol(q.capId), `grila ${q.id} arată spre ${q.capId}`).toBeDefined();
    }
  });
});
