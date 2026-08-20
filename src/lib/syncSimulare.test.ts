import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS, type OptionKey } from '../data/questions';
import { DEFAULT_SIM_CONFIG, type SimRun } from '../state/useSimulare';
import { syncFinishedSimulare } from './syncSimulare';

const baza = vi.hoisted(() => ({
  apeluri: [] as { tabel: string; rows: unknown; options: unknown }[],
  eroareLucrare: null as Error | null,
}));

vi.mock('./supabase', () => ({
  supabase: {
    from: (tabel: string) => ({
      upsert: async (rows: unknown, options: unknown) => {
        baza.apeluri.push({ tabel, rows, options });
        return { error: tabel === 'sim_runs' ? baza.eroareLucrare : null };
      },
    }),
  },
}));

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
const USER = '00000000-0000-0000-0000-000000000099';
const RUN_ID = '00000000-0000-0000-0000-0000000000aa';
const PREDAT = Date.parse('2026-08-16T11:00:00.000Z');

const gresitPentru = (correct: OptionKey): OptionKey => (correct === 'A' ? 'E' : 'A');

/** Trei poziții, două cu răspuns (una corectă, una greșită), una necompletată. */
const lucrare = (): SimRun => ({
  id: RUN_ID,
  startedAt: Date.parse('2026-08-16T10:00:00.000Z'),
  endsAt: Date.parse('2026-08-16T13:00:00.000Z'),
  finishedAt: PREDAT,
  config: DEFAULT_SIM_CONFIG,
  order: [QUESTIONS[0]!.id, QUESTIONS[1]!.id, QUESTIONS[2]!.id],
  qi: 0,
  answers: { 0: QUESTIONS[0]!.correct, 1: gresitPentru(QUESTIONS[1]!.correct) },
  marks: {},
});

const randuri = (tabel: string) => baza.apeluri.find((a) => a.tabel === tabel)?.rows as never;

beforeEach(() => {
  baza.apeluri = [];
  baza.eroareLucrare = null;
});

describe('syncFinishedSimulare', () => {
  /**
   * Regresia din spatele întregului fișier: nu exista deloc. O lucrare de 100
   * de grile se termina, arăta scorul, și dispărea la „Simulare nouă" —
   * istoricul rămânea gol, rândul „Simulări" din Statistici era structural
   * zero, iar greșelile din examen nu ajungeau niciodată în Recapitulare.
   */
  it('scrie mai întâi lucrarea, apoi răspunsurile, ambele idempotent', async () => {
    await syncFinishedSimulare(USER, lucrare(), PREDAT, BY_ID);

    expect(baza.apeluri.map((a) => a.tabel)).toEqual(['sim_runs', 'attempts']);
    expect(baza.apeluri[0]!.options).toEqual({ onConflict: 'id', ignoreDuplicates: true });
    expect(baza.apeluri[1]!.options).toEqual({ onConflict: 'client_key', ignoreDuplicates: true });
  });

  it('păstrează ordinea întreagă a lucrării, ca numitor al punctajului', async () => {
    await syncFinishedSimulare(USER, lucrare(), PREDAT, BY_ID);

    expect(randuri('sim_runs')).toMatchObject({
      id: RUN_ID,
      user_id: USER,
      question_ids: [QUESTIONS[0]!.id, QUESTIONS[1]!.id, QUESTIONS[2]!.id],
      finished_at: new Date(PREDAT).toISOString(),
    });
  });

  /**
   * Sursa e ce leagă examenul de restul aplicației: `AttemptInsert.source` nici
   * nu putea exprima `'simulare'`, deși enum-ul din bază, coloana `sim_run_id`
   * și filtrul din Statistici o așteptau toate.
   */
  it('marchează răspunsurile ca `simulare` și le leagă de lucrare, nu de o sesiune', async () => {
    await syncFinishedSimulare(USER, lucrare(), PREDAT, BY_ID);

    const rows = randuri('attempts') as { source: string; sim_run_id: string; session_id: null }[];
    expect(rows.every((r) => r.source === 'simulare')).toBe(true);
    expect(rows.every((r) => r.sim_run_id === RUN_ID)).toBe(true);
    expect(rows.every((r) => r.session_id === null)).toBe(true);
  });

  /**
   * O grilă necompletată valorează 0 la punctaj, dar nu e dovadă că elevul n-o
   * știe — de obicei înseamnă că a rămas fără timp. Scrisă ca răspuns greșit,
   * ar intra în coada de Recapitulare, care se formează din „a greșit măcar o
   * dată", și ar umple-o cu grile nevăzute.
   */
  it('scrie doar grilele la care s-a răspuns, nu și pe cele lăsate goale', async () => {
    await syncFinishedSimulare(USER, lucrare(), PREDAT, BY_ID);

    const rows = randuri('attempts') as { question_id: string; is_correct: boolean }[];
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.question_id)).toEqual([QUESTIONS[0]!.id, QUESTIONS[1]!.id]);
    expect(rows.map((r) => r.is_correct)).toEqual([true, false]);
  });

  it('nu scrie răspunsuri dacă lucrarea n-a fost salvată', async () => {
    baza.eroareLucrare = new Error('rls');

    await expect(syncFinishedSimulare(USER, lucrare(), PREDAT, BY_ID)).rejects.toThrow('rls');
    expect(baza.apeluri.map((a) => a.tabel)).toEqual(['sim_runs']);
  });

  /** O grilă retrasă între predare și sincronizare ar pica pe cheia străină. */
  it('sare peste o grilă care nu mai e în bibliotecă, fără să piardă restul', async () => {
    const banca = new Map(BY_ID);
    banca.delete(QUESTIONS[1]!.id);

    await syncFinishedSimulare(USER, lucrare(), PREDAT, banca);

    const rows = randuri('attempts') as { question_id: string }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]!.question_id).toBe(QUESTIONS[0]!.id);
  });
});
