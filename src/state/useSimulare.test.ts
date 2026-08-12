import { describe, expect, it } from 'vitest';
import { QUESTIONS, questionById, type OptionKey } from '../data/questions';
import { DEFAULT_SIM_CONFIG, buildOrder, questionAtPosition, scoreOf, type SimRun } from './useSimulare';

const ID = QUESTIONS.map((q) => q.id);
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
    expect(buildOrder(60, 'Amestecate')).toHaveLength(60);
    expect(buildOrder(100, 'Amestecate')).toHaveLength(100);
    expect(buildOrder(3, 'Amestecate')).toHaveLength(3);
  });

  it('folosește doar id-uri care există în bancă', () => {
    for (const id of buildOrder(100, 'Amestecate')) {
      expect(questionById(id)).toBeDefined();
    }
  });

  it('nu returnează nimic pentru zero grile', () => {
    expect(buildOrder(0, 'Amestecate')).toEqual([]);
  });
});

describe('questionAtPosition', () => {
  it('întoarce grila cerută de id, nu pe cea de pe poziția din bancă', () => {
    const run = lucrare([ID[2]!, ID[0]!]);
    expect(questionAtPosition(run, 0).id).toBe(ID[2]);
    expect(questionAtPosition(run, 1).id).toBe(ID[0]);
  });

  it('nu crapă pe o poziție inexistentă', () => {
    expect(questionAtPosition(lucrare([ID[0]!]), 99)).toBeDefined();
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
    expect(scoreOf(lucrare(order, answers), 1_000)).toMatchObject({
      corecte: 2,
      gresite: 1,
      neraspunse: 1,
      total: 4,
      pct: 50,
    });
  });

  it('punctaj UMFCD: grila fără răspuns valorează cât una greșită', () => {
    const order = [ID[0]!, ID[1]!];
    const doarUnaCorecta = scoreOf(lucrare(order, { 0: corectPentru(order[0]!) }), 1_000);
    const unaCorectaUnaGresita = scoreOf(
      lucrare(order, { 0: corectPentru(order[0]!), 1: gresitPentru(order[1]!) }),
      1_000,
    );
    expect(doarUnaCorecta.pct).toBe(unaCorectaUnaGresita.pct);
    expect(doarUnaCorecta.pct).toBe(50);
  });

  it('părțile însumează întotdeauna totalul', () => {
    const order = buildOrder(60, 'Amestecate');
    const answers: Record<number, OptionKey> = {};
    order.forEach((id, i) => {
      if (i % 3 === 0) answers[i] = corectPentru(id);
      else if (i % 3 === 1) answers[i] = gresitPentru(id);
    });
    const s = scoreOf(lucrare(order, answers), 1_000);
    expect(s.corecte + s.gresite + s.neraspunse).toBe(s.total);
    expect(s.total).toBe(60);
  });

  it('scorul urmărește id-ul, nu poziția din bancă', () => {
    // Aceeași grilă pe două poziții: același răspuns trebuie să fie corect de două ori.
    const order = [ID[3]!, ID[3]!];
    const c = corectPentru(ID[3]!);
    expect(scoreOf(lucrare(order, { 0: c, 1: c }), 1_000).corecte).toBe(2);
  });

  it('calculează durata din momentul predării', () => {
    expect(scoreOf(lucrare([ID[0]!]), 1_000 + 90_000).durataMs).toBe(90_000);
  });

  it('nu dă durată negativă dacă predarea pare înainte de start', () => {
    expect(scoreOf(lucrare([ID[0]!]), 0).durataMs).toBe(0);
  });

  it('dă 0% pe o lucrare neatinsă și 100% pe una completă', () => {
    const order = buildOrder(12, 'Amestecate');
    expect(scoreOf(lucrare(order), 1_000).pct).toBe(0);
    const toate: Record<number, OptionKey> = {};
    order.forEach((id, i) => {
      toate[i] = corectPentru(id);
    });
    expect(scoreOf(lucrare(order, toate), 1_000).pct).toBe(100);
  });
});
