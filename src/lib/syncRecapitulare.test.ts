import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { syncFinishedRecapitulare } from './syncRecapitulare';

const baza = vi.hoisted(() => ({
  apeluri: [] as { tabel: string; rows: unknown; options: unknown }[],
  eroareSesiune: null as Error | null,
}));

vi.mock('./supabase', () => ({
  supabase: {
    from: (tabel: string) => ({
      upsert: async (rows: unknown, options: unknown) => {
        baza.apeluri.push({ tabel, rows, options });
        return { error: tabel === 'sessions' ? baza.eroareSesiune : null };
      },
    }),
  },
}));

const recapitulare = {
  id: '00000000-0000-0000-0000-000000000003',
  banca: [QUESTIONS[0]!, QUESTIONS[1]!],
  answers: { 0: QUESTIONS[0]!.correct, 1: 'A' as const },
  startedAt: Date.parse('2026-08-16T10:00:00.000Z'),
};

beforeEach(() => {
  baza.apeluri = [];
  baza.eroareSesiune = null;
});

describe('syncFinishedRecapitulare', () => {
  it('scrie mai întâi sesiunea proprie, apoi răspunsurile idempotente cu sursa corectă', async () => {
    await syncFinishedRecapitulare(
      '00000000-0000-0000-0000-000000000099',
      recapitulare,
      Date.parse('2026-08-16T10:05:00.000Z'),
    );

    expect(baza.apeluri.map((apel) => apel.tabel)).toEqual(['sessions', 'attempts']);
    expect(baza.apeluri[0]).toMatchObject({
      rows: {
        id: recapitulare.id,
        user_id: '00000000-0000-0000-0000-000000000099',
        chapter_ids: [...new Set(recapitulare.banca.map((question) => question.capId))],
      },
      options: { onConflict: 'id', ignoreDuplicates: true },
    });
    expect(baza.apeluri[1]).toMatchObject({
      rows: [
        expect.objectContaining({ source: 'recapitulare', client_key: `${recapitulare.id}:0` }),
        expect.objectContaining({ source: 'recapitulare', client_key: `${recapitulare.id}:1` }),
      ],
      options: { onConflict: 'client_key', ignoreDuplicates: true },
    });
  });

  it('nu scrie răspunsuri orfane când sesiunea nu a putut fi salvată', async () => {
    baza.eroareSesiune = new Error('sesiune refuzată');

    await expect(syncFinishedRecapitulare('user-1', recapitulare, Date.now())).rejects.toThrow(
      'sesiune refuzată',
    );
    expect(baza.apeluri.map((apel) => apel.tabel)).toEqual(['sessions']);
  });
});
