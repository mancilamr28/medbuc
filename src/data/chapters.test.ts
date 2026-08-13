import { describe, expect, it } from 'vitest';
import { CHAPTER_BY_ID, MATERII, chapterById, isChapterId, materieNameOf } from './chapters';
import { QUESTIONS } from './questions';

const TOATE = Object.values(MATERII).flatMap((m) => m.list);

describe('identitatea capitolelor', () => {
  it('are un id unic pentru fiecare capitol', () => {
    expect(CHAPTER_BY_ID.size).toBe(TOATE.length);
  });

  it('distinge cele două sesiuni din 2026, deși au același nr', () => {
    const din2026 = MATERII.ant.list.filter((c) => c.nr === '2026');
    expect(din2026).toHaveLength(2);
    expect(new Set(din2026.map((c) => c.id)).size).toBe(2);
  });

  it('leagă fiecare capitol de materia lui', () => {
    expect(materieNameOf('bio-nervos')).toBe('Biologie');
    expect(materieNameOf('chim-arene')).toBe('Chimie organică');
  });

  it('respinge un id inexistent', () => {
    expect(isChapterId('bio-nervos')).toBe(true);
    expect(isChapterId('capitol-inventat')).toBe(false);
    expect(isChapterId(3)).toBe(false);
  });
});

describe('legătura grilă → capitol', () => {
  it('trimite fiecare grilă spre un capitol care există', () => {
    for (const q of QUESTIONS) {
      expect(chapterById(q.capId), `grila ${q.id} arată spre ${q.capId}`).toBeDefined();
    }
  });
});
