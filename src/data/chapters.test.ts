import { describe, expect, it } from 'vitest';
import { CHAPTER_BY_ID, MATERII, chapterById, isChapterId, materieNameOf } from './chapters';
import { QUESTIONS } from './questions';

const TOATE = Object.values(MATERII).flatMap((m) => m.list);

describe('identitatea capitolelor', () => {
  it('are un id unic pentru fiecare capitol', () => {
    expect(CHAPTER_BY_ID.size).toBe(TOATE.length);
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
