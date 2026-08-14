import { describe, expect, it } from 'vitest';
import { QUESTIONS, questionById, type OptionKey } from '../data/questions';
import { DEFAULT_SIM_CONFIG, buildOrder, questionAtPosition, scoreOf, type SimRun } from './useSimulare';

const ID = QUESTIONS.map((q) => q.id);
/** Banca nu mai vine dintr-un import în cod, deci testele o dau explicit. */
const BANCA = QUESTIONS;
const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
const corectPentru = (id: string): OptionKey => questionById(id)!.correct;
const gresitPentru = (id: string): OptionKey => (corectPentru(id) === 'A' ? 'E' : 'A');

const lucrare = (order: string[], answers: Record<number, OptionKey> = {}): SimRun => ({
  startedAt: 1_000,
  endsAt: 1_000 + 120 * 60_000,
  finishedAt: null,
  config: DEFAULT_SIM_CONFIG,
  order,
  qi: 0,
  answers,
  marks: {},
});

describe('buildOrder', () => {
  it('produce exact câte grile s-au cerut, chiar dacă banca e mai mică', () => {
    expect(buildOrder(60, 'Amestecate', BANCA)).toHaveLength(60);
    expect(buildOrder(100, 'Amestecate', BANCA)).toHaveLength(100);
    expect(buildOrder(3, 'Amestecate', BANCA)).toHaveLength(3);
  });

  it('folosește doar id-uri care există în bancă', () => {
    for (const id of buildOrder(100, 'Amestecate', BANCA)) {
      expect(questionById(id)).toBeDefined();
    }
  });

  it('nu returnează nimic pentru zero grile', () => {
    expect(buildOrder(0, 'Amestecate', BANCA)).toEqual([]);
  });
});

describe('questionAtPosition', () => {
  it('întoarce grila cerută de id, nu pe cea de pe poziția din bancă', () => {
    const run = lucrare([ID[2]!, ID[0]!]);
    expect(questionAtPosition(run, 0, BY_ID)?.id).toBe(ID[2]);
    expect(questionAtPosition(run, 1, BY_ID)?.id).toBe(ID[0]);
  });

  it('nu crapă pe o poziție inexistentă', () => {
    expect(() => questionAtPosition(lucrare([ID[0]!]), 99, BY_ID)).not.toThrow();
    expect(questionAtPosition(lucrare([ID[0]!]), 99, BY_ID)).toBeUndefined();
  });

  /**
   * Schimbare deliberată față de versiunea de dinainte de Faza 4: se cădea pe
   * `QUESTIONS[0]`, deci o lucrare care trimitea la o grilă dispărută afișa în
   * tăcere **altă grilă**. Cu banca venind din bază, o grilă retrasă după ce
   * cineva a început lucrarea e un caz obișnuit, nu unul teoretic.
   */
  it('întoarce gol pentru o grilă care nu mai e în bibliotecă', () => {
    const bancaFaraEa = new Map(BY_ID);
    bancaFaraEa.delete(ID[0]!);

    expect(questionAtPosition(lucrare([ID[0]!]), 0, bancaFaraEa)).toBeUndefined();
  });
});

describe('scoreOf', () => {
  it('numără corectele, greșelile și grilele fără răspuns', () => {
    const order = [ID[0]!, ID[1]!, ID[2]!, ID[3]!];
    const answers: Record<number, OptionKey> = {
      0: corectPentru(order[0]!),
      1: corectPentru(order[1]!),
      2: gresitPentru(order[2]!),
      // poziția 3 rămâne fără răspuns
    };
    expect(scoreOf(lucrare(order, answers), 1_000, BY_ID)).toMatchObject({
      corecte: 2,
      gresite: 1,
      neraspunse: 1,
      total: 4,
      pct: 50,
    });
  });

  it('punctaj UMFCD: grila fără răspuns valorează cât una greșită', () => {
    const order = [ID[0]!, ID[1]!];
    const doarUnaCorecta = scoreOf(lucrare(order, { 0: corectPentru(order[0]!) }), 1_000, BY_ID);
    const unaCorectaUnaGresita = scoreOf(
      lucrare(order, { 0: corectPentru(order[0]!), 1: gresitPentru(order[1]!) }),
      1_000,
      BY_ID,
    );
    expect(doarUnaCorecta.pct).toBe(unaCorectaUnaGresita.pct);
    expect(doarUnaCorecta.pct).toBe(50);
  });

  it('părțile însumează întotdeauna totalul', () => {
    const order = buildOrder(60, 'Amestecate', BANCA);
    const answers: Record<number, OptionKey> = {};
    order.forEach((id, i) => {
      if (i % 3 === 0) answers[i] = corectPentru(id);
      else if (i % 3 === 1) answers[i] = gresitPentru(id);
    });
    const s = scoreOf(lucrare(order, answers), 1_000, BY_ID);
    expect(s.corecte + s.gresite + s.neraspunse).toBe(s.total);
    expect(s.total).toBe(60);
  });

  it('scorul urmărește id-ul, nu poziția din bancă', () => {
    // Aceeași grilă pe două poziții: același răspuns trebuie să fie corect de două ori.
    const order = [ID[3]!, ID[3]!];
    const c = corectPentru(ID[3]!);
    expect(scoreOf(lucrare(order, { 0: c, 1: c }), 1_000, BY_ID).corecte).toBe(2);
  });

  it('calculează durata din momentul predării', () => {
    expect(scoreOf(lucrare([ID[0]!]), 1_000 + 90_000, BY_ID).durataMs).toBe(90_000);
  });

  it('nu dă durată negativă dacă predarea pare înainte de start', () => {
    expect(scoreOf(lucrare([ID[0]!]), 0, BY_ID).durataMs).toBe(0);
  });

  it('dă 0% pe o lucrare neatinsă și 100% pe una completă', () => {
    const order = buildOrder(12, 'Amestecate', BANCA);
    expect(scoreOf(lucrare(order), 1_000, BY_ID).pct).toBe(0);
    const toate: Record<number, OptionKey> = {};
    order.forEach((id, i) => {
      toate[i] = corectPentru(id);
    });
    expect(scoreOf(lucrare(order, toate), 1_000, BY_ID).pct).toBe(100);
  });
});
