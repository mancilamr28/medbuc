import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  citesteTest,
  codEroare,
  genereazaTest,
  importaSimulareVeche,
  numaraCandidati,
  predaTest,
  raspunde,
} from './lucrari';

const baza = vi.hoisted(() => ({
  apeluri: [] as { nume: string; args: Record<string, unknown> }[],
  eroare: null as { message: string } | null,
  data: null as unknown,
}));

vi.mock('./supabase', () => ({
  supabase: {
    rpc: async (nume: string, args: Record<string, unknown>) => {
      baza.apeluri.push({ nume, args });
      return { data: baza.data, error: baza.eroare };
    },
  },
}));

beforeEach(() => {
  baza.apeluri = [];
  baza.eroare = null;
  baza.data = null;
});

const ultimul = () => baza.apeluri[baza.apeluri.length - 1]!;

describe('poarta către motorul de generare', () => {
  /**
   * Un singur argument `payload`, nu parametri tipizați: PostgREST rezolvă
   * supraîncărcările **după numele argumentelor**, deci un filtru nou ar fi o
   * schimbare de semnătură, iar un bundle rămas în cache ar începe să primească
   * `PGRST202 function not found` în mijlocul sesiunii cuiva.
   */
  it('trimite cererea într-un singur payload', async () => {
    baza.data = { run_id: 'r1', nr_cerut: 10, nr_obtinut: 10, insuficient: false, lipsa: [] };
    await genereazaTest({ mod: 'exersare', nr: 10, filtre: { capitole: ['bio-nervos'] } });

    expect(ultimul().nume).toBe('genereaza_test');
    expect(ultimul().args).toEqual({
      payload: { mod: 'exersare', nr: 10, filtre: { capitole: ['bio-nervos'] } },
    });
  });

  it('cheamă numărătoarea cu aceleași filtre ca generarea', async () => {
    baza.data = { total: 6, pe_materie: [] };
    const r = await numaraCandidati({ mod: 'nevazute', filtre: { materii: ['bio'] } });

    expect(ultimul().nume).toBe('numara_candidati');
    expect(ultimul().args).toEqual({ payload: { mod: 'nevazute', filtre: { materii: ['bio'] } } });
    expect(r.total).toBe(6);
  });

  it('cere lucrarea și scorul după id, nu prin payload', async () => {
    baza.data = { run: {}, grile: [] };
    await citesteTest('r1');
    expect(ultimul()).toEqual({ nume: 'citeste_test', args: { run_id: 'r1' } });

    baza.data = { run_id: 'r1', corecte: 1, gresite: 0, nr_cerut: 3, pct: 33 };
    await predaTest('r1');
    expect(ultimul()).toEqual({ nume: 'preda_test', args: { run_id: 'r1' } });
  });

  it('trimite răspunsul cu poziția, nu cu id-ul grilei', async () => {
    baza.data = { inregistrat: true };
    await raspunde({ runId: 'r1', pozitie: 3, aleasa: 'B' });

    expect(ultimul().args).toEqual({
      payload: { run_id: 'r1', pozitie: 3, aleasa: 'B', marcata: null },
    });
  });

  /**
   * Nemarcat trebuie să rămână deosebit de „n-am atins marcajul": `null` îi
   * spune serverului să lase marcajul cum e, `false` îl scoate.
   */
  it('deosebește marcajul neatins de marcajul scos', async () => {
    baza.data = { inregistrat: true };

    await raspunde({ runId: 'r1', pozitie: 0, aleasa: null });
    expect((ultimul().args.payload as { marcata: unknown }).marcata).toBeNull();

    await raspunde({ runId: 'r1', pozitie: 0, aleasa: null, marcata: false });
    expect((ultimul().args.payload as { marcata: unknown }).marcata).toBe(false);
  });

  it('ridică eroarea bazei, nu o înghite', async () => {
    baza.eroare = { message: 'fara_candidati' };
    await expect(genereazaTest({ mod: 'exersare', nr: 5 })).rejects.toThrow(/fara_candidati/);
  });

  it('trimite instantaneul simulării vechi fără să-l reconstruiască în client', async () => {
    baza.data = { run_id: 'r-vechi' };
    const run = {
      id: 'r-vechi',
      startedAt: 1_000,
      endsAt: 11_000,
      finishedAt: null,
      config: { model: 'UMFCD · Medicină', nr: '2', durata: '180 minute', ordine: 'Amestecate' },
      order: ['bio-nervos-01', 'bio-sange-01'],
      qi: 1,
      answers: { 0: 'A' as const },
      marks: { 1: true },
    };

    await expect(importaSimulareVeche(run)).resolves.toEqual({ run_id: 'r-vechi' });
    expect(ultimul()).toEqual({
      nume: 'importa_simulare_veche',
      args: { payload: run },
    });
  });
});

/**
 * Codurile sunt singurul lucru pe care un ecran are voie să ramifice. Restul
 * RPC-urilor vorbesc românește fiindcă le citește un administrator; pe astea le
 * citește asistentul, iar pe o propoziție tradusă nu se poate ramifica.
 */
describe('codul unei erori', () => {
  it('îl scoate din mesajul mai lung al PostgREST', () => {
    expect(codEroare(new Error('fara_candidati'))).toBe('fara_candidati');
    expect(codEroare(new Error('Postgres: raise exception "lucrare_predata" at line 12'))).toBe(
      'lucrare_predata',
    );
  });

  /**
   * Lista e închisă tocmai ca un mesaj oarecare să nu fie citit drept cod. Un
   * `catch` care ramifică pe orice text ar începe să se poarte diferit când
   * cineva schimbă o formulare din bază.
   */
  it('nu inventează un cod dintr-un mesaj oarecare', () => {
    expect(codEroare(new Error('Nu am putut salva colecția.'))).toBeNull();
    expect(codEroare(new Error(''))).toBeNull();
    expect(codEroare(null)).toBeNull();
    expect(codEroare({ message: 'fara_candidati' })).toBeNull();
  });

  /**
   * Potrivirea e pe cuvânt întreg, nu pe „conține". Fără asta, un identificator
   * mai lung care poartă un cod în el ar fi citit drept codul acela, iar ecranul
   * ar ramifica pe ceva ce nu s-a întâmplat.
   */
  it('nu citește un cod dintr-un identificator mai lung', () => {
    expect(codEroare(new Error('super_fara_candidati_extins'))).toBeNull();
    expect(codEroare(new Error('xlucrare_predata'))).toBeNull();
    // Dar între spații sau ghilimele, tot cod e.
    expect(codEroare(new Error('eroare: "lucrare_predata" (r1)'))).toBe('lucrare_predata');
  });
});
