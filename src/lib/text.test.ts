import { describe, expect, it } from 'vitest';
import { needsDe, numar } from './text';

describe('needsDe', () => {
  it('nu cere „de” sub 20', () => {
    expect(needsDe(1)).toBe(false);
    expect(needsDe(6)).toBe(false);
    expect(needsDe(19)).toBe(false);
  });

  it('cere „de” de la 20 în sus', () => {
    expect(needsDe(20)).toBe(true);
    expect(needsDe(99)).toBe(true);
    expect(needsDe(346)).toBe(true);
  });

  it('tratează sutele rotunde: 100 de grile, dar 101 grile', () => {
    expect(needsDe(100)).toBe(true);
    expect(needsDe(101)).toBe(false);
    expect(needsDe(119)).toBe(false);
    expect(needsDe(120)).toBe(true);
  });

  it('zero cere „de”', () => {
    expect(needsDe(0)).toBe(false);
  });
});

describe('numar', () => {
  it('acordă singularul', () => {
    expect(numar(1, 'grilă', 'grile')).toBe('1 grilă');
  });

  it('lasă pluralul fără „de” sub 20', () => {
    expect(numar(6, 'grilă', 'grile')).toBe('6 grile');
  });

  it('pune „de” peste 19', () => {
    expect(numar(346, 'zi', 'zile')).toBe('346 de zile');
    expect(numar(100, 'grilă', 'grile')).toBe('100 de grile');
  });

  it('acordă și zeroul', () => {
    expect(numar(0, 'grilă', 'grile')).toBe('0 grile');
  });
});
