import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useNavGroups } from './useNavGroups';

const sesiune = { hasStarted: false, finished: false, total: 0, revealed: {} as Record<number, boolean> };
const simulare = { phase: 'config' };

vi.mock('../state/appContextValue', () => ({ useApp: () => ({ session: sesiune, sim: simulare }) }));
vi.mock('../state/authState', () => ({ useAuth: () => ({ role: 'elev' }) }));

const navigarea = () => renderHook(() => useNavGroups()).result.current.main;
const badgeGrile = () => navigarea().find((e) => e.id === 'grile')?.badge;

describe('useNavGroups', () => {
  /**
   * Regresia: `ramase` se calcula din `session.total` necondiționat. Fără nicio
   * sesiune pornită, scopul e gol, iar scopul gol înseamnă „toată biblioteca" —
   * deci un elev care nu începuse niciodată nimic vedea lângă „Grile" un număr
   * egal cu întreaga bibliotecă, ca și cum ar fi avut o sesiune în așteptare.
   */
  it('nu arată drumurile vechi cât timp nu e nimic de reluat', () => {
    Object.assign(sesiune, { hasStarted: false, finished: false, total: 181, revealed: {} });
    simulare.phase = 'config';

    expect(navigarea().map((e) => e.id)).toEqual(['acasa', 'test-nou', 'recapitulare', 'statistici']);
  });

  it('pune insigna cu câte au rămas în sesiunea pornită', () => {
    Object.assign(sesiune, { hasStarted: true, finished: false, total: 10, revealed: { 0: true, 1: true } });

    expect(badgeGrile()).toBe('8');
  });

  it('nu ascunde sesiunea nepredată doar fiindcă toate grilele au fost verificate', () => {
    Object.assign(sesiune, {
      hasStarted: true,
      finished: false,
      total: 2,
      revealed: { 0: true, 1: true },
    });

    expect(navigarea().find((e) => e.id === 'grile')?.label).toBe('Continuă sesiunea');
    expect(badgeGrile()).toBeUndefined();
  });

  it('păstrează simularea veche în navigare numai cât este în curs', () => {
    simulare.phase = 'rulare';

    expect(navigarea().find((e) => e.id === 'simulari')?.label).toBe('Continuă simularea');
  });

  /** O sesiune încheiată n-are „rămase": panoul de rezultat e ce urmează, nu grile. */
  it('scoate insigna după ce sesiunea s-a încheiat', () => {
    Object.assign(sesiune, { hasStarted: true, finished: true, total: 10, revealed: { 0: true } });

    expect(badgeGrile()).toBeUndefined();
  });
});
