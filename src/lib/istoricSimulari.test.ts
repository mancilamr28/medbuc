import { describe, expect, it } from 'vitest';
import { QUESTIONS, QUESTION_BY_ID } from '../data/questions';
import type { AttemptRow } from './progres';
import {
  pozitiaDinClientKey,
  reconstituieLucrarea,
  rezumaLucrari,
  type RaspunsLucrare,
  type SimRunRow,
} from './istoricSimulari';

const ORA = 60 * 60 * 1000;
const inceput = Date.parse('2026-08-20T09:00:00.000Z');

const lucrare = (over: Partial<SimRunRow> = {}): SimRunRow => ({
  id: 'lucrare-1',
  started_at: new Date(inceput).toISOString(),
  finished_at: new Date(inceput + ORA).toISOString(),
  config: { model: 'UMFCD · Medicină', nr: '100', durata: '180 minute' },
  question_ids: [QUESTIONS[0]!.id, QUESTIONS[1]!.id, QUESTIONS[2]!.id, QUESTIONS[3]!.id],
  ...over,
});

const raspuns = (simRunId: string, corect: boolean): AttemptRow => ({
  question_id: QUESTIONS[0]!.id,
  is_correct: corect,
  source: 'simulare',
  session_id: null,
  sim_run_id: simRunId,
  answered_at: new Date(inceput + ORA).toISOString(),
});

describe('rezumaLucrari', () => {
  /**
   * Punctajul UMFCD se raportează la lucrarea întreagă: o grilă lăsată goală
   * valorează cât una greșită. Raportat doar la grilele atinse, o lucrare de
   * 100 abandonată după 4 răspunsuri bune ar arăta 100%.
   */
  it('împarte la lucrarea întreagă, nu la câte grile s-au atins', () => {
    const [rezumat] = rezumaLucrari([lucrare()], [raspuns('lucrare-1', true), raspuns('lucrare-1', false)]);

    expect(rezumat).toMatchObject({ total: 4, corecte: 1, gresite: 1, neraspunse: 2, pct: 25 });
    expect(rezumat!.durataMs).toBe(ORA);
    expect(rezumat!.model).toBe('UMFCD · Medicină');
  });

  it('nu amestecă răspunsurile a două lucrări', () => {
    const rezumate = rezumaLucrari(
      [lucrare(), lucrare({ id: 'lucrare-2', finished_at: new Date(inceput + 2 * ORA).toISOString() })],
      [raspuns('lucrare-1', true), raspuns('lucrare-2', true), raspuns('lucrare-2', true)],
    );

    // Cea mai recentă predare stă prima.
    expect(rezumate.map((l) => l.id)).toEqual(['lucrare-2', 'lucrare-1']);
    expect(rezumate[0]!.corecte).toBe(2);
    expect(rezumate[1]!.corecte).toBe(1);
  });

  /** O lucrare în curs trăiește în localStorage; în istoric n-are ce căuta. */
  it('lasă pe dinafară lucrările nepredate și datele imposibile', () => {
    const rezumate = rezumaLucrari(
      [lucrare({ id: 'in-curs', finished_at: null }), lucrare({ id: 'stricata', finished_at: 'nicicând' })],
      [],
    );

    expect(rezumate).toEqual([]);
  });

  /** Răspunsurile din sesiuni libere n-au `sim_run_id` și nu intră în nicio lucrare. */
  it('ignoră răspunsurile care nu vin dintr-o simulare', () => {
    const dinSesiune: AttemptRow = { ...raspuns('lucrare-1', true), source: 'sesiune', sim_run_id: null, session_id: 's1' };
    const [rezumat] = rezumaLucrari([lucrare()], [dinSesiune]);

    expect(rezumat).toMatchObject({ corecte: 0, neraspunse: 4 });
  });
});

describe('reconstituieLucrarea', () => {
  const raspunsulLa = (pozitie: number, chosen: string): RaspunsLucrare => ({
    client_key: `lucrare-1:${pozitie}`,
    question_id: QUESTIONS[pozitie]!.id,
    chosen,
  });

  it('pune fiecare răspuns la poziția lui și lasă goale grilele neatinse', () => {
    const grile = reconstituieLucrarea(lucrare(), [raspunsulLa(2, 'B'), raspunsulLa(0, 'A')], QUESTION_BY_ID);

    expect(grile).toHaveLength(4);
    expect(grile.map((g) => g.ales)).toEqual(['A', null, 'B', null]);
    expect(grile[0]!.question?.id).toBe(QUESTIONS[0]!.id);
  });

  /**
   * O bibliotecă mică e repetată ca să umple lucrarea, deci aceeași grilă apare
   * de mai multe ori. Legate după `question_id`, cele două poziții ar fi arătat
   * amândouă același răspuns — unul dintre ele fiind al celeilalte.
   */
  it('deosebește două apariții ale aceleiași grile în aceeași lucrare', () => {
    const repetata = lucrare({ question_ids: [QUESTIONS[0]!.id, QUESTIONS[0]!.id] });
    const grile = reconstituieLucrarea(
      repetata,
      [
        { client_key: 'lucrare-1:1', question_id: QUESTIONS[0]!.id, chosen: 'C' },
      ],
      QUESTION_BY_ID,
    );

    expect(grile.map((g) => g.ales)).toEqual([null, 'C']);
  });

  it('păstrează locul unei grile retrase din bibliotecă', () => {
    const grile = reconstituieLucrarea(
      lucrare({ question_ids: ['grila-stearsa', QUESTIONS[1]!.id] }),
      [],
      QUESTION_BY_ID,
    );

    expect(grile[0]).toMatchObject({ pozitie: 0, question: null, ales: null });
    expect(grile[1]!.question?.id).toBe(QUESTIONS[1]!.id);
  });
});

describe('pozitiaDinClientKey', () => {
  it('citește poziția doar din cheia lucrării cerute', () => {
    expect(pozitiaDinClientKey('lucrare-1', 'lucrare-1:12')).toBe(12);
    expect(pozitiaDinClientKey('lucrare-1', 'lucrare-2:12')).toBeNull();
    expect(pozitiaDinClientKey('lucrare-1', 'lucrare-1:nu')).toBeNull();
    expect(pozitiaDinClientKey('lucrare-1', null)).toBeNull();
  });
});
