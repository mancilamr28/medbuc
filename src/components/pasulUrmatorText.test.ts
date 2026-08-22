import { describe, expect, it } from 'vitest';
import { frazaGreseliInCoada } from './pasulUrmatorText';

describe('frazaGreseliInCoada', () => {
  it('acordă substantivul și adjectivul cu numărul', () => {
    expect(frazaGreseliInCoada(1)).toBe('1 grilă greșită intră în coada de recapitulare.');
    expect(frazaGreseliInCoada(2)).toBe('2 grile greșite intră în coada de recapitulare.');
    expect(frazaGreseliInCoada(20)).toBe('20 de grile greșite intră în coada de recapitulare.');
  });
});
