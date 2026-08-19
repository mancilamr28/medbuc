import { describe, expect, it } from 'vitest';
import { navWindow } from './navWindow';

describe('navWindow', () => {
  it('arată toată sesiunea când e mai mică decât fereastra', () => {
    expect(navWindow(0, 6)).toEqual({ start: 0, end: 6 });
    expect(navWindow(5, 6)).toEqual({ start: 0, end: 6 });
  });

  /** Motivul întregului fișier: un pătrat unic nu are voie să se întindă pe tot cardul. */
  it('nu se sparge la o sesiune de o singură grilă', () => {
    expect(navWindow(0, 1)).toEqual({ start: 0, end: 1 });
  });

  it('urmărește grila curentă peste granița ferestrei', () => {
    expect(navWindow(0, 60)).toEqual({ start: 0, end: 24 });
    expect(navWindow(23, 60)).toEqual({ start: 0, end: 24 });
    expect(navWindow(24, 60)).toEqual({ start: 24, end: 48 });
    expect(navWindow(47, 60)).toEqual({ start: 24, end: 48 });
    // A treia fereastră ar începe teoretic la 48, dar doar 12 grile mai rămân —
    // se trage înapoi la 36, ca ultimele 24 să încapă întregi.
    expect(navWindow(48, 60)).toEqual({ start: 36, end: 60 });
  });

  it('ultima fereastră se oprește la total, chiar dacă nu umple mărimea', () => {
    expect(navWindow(59, 60)).toEqual({ start: 36, end: 60 });
    expect(navWindow(50, 55)).toEqual({ start: 31, end: 55 });
  });

  it('acceptă o mărime de fereastră diferită de cea implicită', () => {
    expect(navWindow(7, 20, 6)).toEqual({ start: 6, end: 12 });
  });
});
