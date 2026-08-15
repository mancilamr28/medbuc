import { describe, expect, it } from 'vitest';
import { MATERII } from '../data/chapters';
import { descriereScop, frazaCorecte } from './grileText';

const BIO = MATERII.bio.list.map((c) => c.id);

/**
 * Panoul de rezultat scria „1 din 1 grile corecte". Al cincilea caz al aceluiași
 * defect: un cuvânt lăsat la plural lângă un numeral de unu.
 */
describe('frazaCorecte', () => {
  it('acordă substantivul și adjectivul cu numărul, la 1, 2 și 20', () => {
    expect(frazaCorecte(1, 1)).toBe('1 grilă corectă din 1');
    expect(frazaCorecte(2, 6)).toBe('2 grile corecte din 6');
    expect(frazaCorecte(20, 40)).toBe('20 de grile corecte din 40');
  });

  it('merge și pe zero', () => {
    expect(frazaCorecte(0, 3)).toBe('0 grile corecte din 3');
  });
});

describe('descriereScop', () => {
  it('fără capitole, sesiunea e peste toată biblioteca', () => {
    expect(descriereScop([])).toEqual({ titlu: 'Sesiune rapidă', detaliu: 'Toate capitolele' });
  });

  it('un singur capitol se numește pe nume, cu materia lui', () => {
    expect(descriereScop(['bio-nervos'])).toEqual({
      titlu: 'Sesiune pe capitol',
      detaliu: 'Biologie · 03. Sistemul nervos',
    });
  });

  /** Acordul numeralului, verificat la 1, 2 și 20 — tiparul care a picat de patru ori. */
  it('acordă numeralul cu numărul de capitole', () => {
    expect(descriereScop(BIO.slice(0, 1)).detaliu).toContain('01. Celula');
    expect(descriereScop(BIO.slice(0, 2)).detaliu).toBe('Biologie · 2 capitole');
    // 20 de capitole din materii amestecate: „de" apare, materia nu.
    const douazeci = [...MATERII.bio.list, ...MATERII.chim.list].map((c) => c.id).slice(0, 20);
    expect(douazeci).toHaveLength(20);
    expect(descriereScop(douazeci).detaliu).toBe('20 de capitole');
  });

  it('numește materia doar când toate capitolele sunt din ea', () => {
    expect(descriereScop(['bio-nervos', 'bio-osos']).detaliu).toBe('Biologie · 2 capitole');
    expect(descriereScop(['bio-nervos', 'chim-arene']).detaliu).toBe('2 capitole');
  });

  /**
   * „Biologie · 12 capitole" e adevărat, dar sugerează un bazin de douăsprezece
   * ori mai mare decât e: grile sunt scrise doar pe câteva dintre ele.
   */
  it('materia întreagă se numește ca atare, nu prin numărul de capitole', () => {
    expect(descriereScop(BIO).detaliu).toBe('Biologie · toate capitolele');
    expect(descriereScop(BIO.slice(0, -1)).detaliu).toBe('Biologie · 11 capitole');
  });

  it('un capitol necunoscut își arată id-ul, nu o etichetă inventată', () => {
    expect(descriereScop(['nu-exista']).detaliu).toBe('nu-exista');
  });
});
