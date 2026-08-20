import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useNavGroups } from './useNavGroups';

const sesiune = { hasStarted: false, finished: false, total: 0, revealed: {} as Record<number, boolean> };

vi.mock('../state/appContextValue', () => ({ useApp: () => ({ session: sesiune }) }));
vi.mock('../state/authState', () => ({ useAuth: () => ({ role: 'elev' }) }));

const badgeGrile = () => renderHook(() => useNavGroups()).result.current.main.find((e) => e.id === 'grile')?.badge;

describe('useNavGroups', () => {
  /**
   * Regresia: `ramase` se calcula din `session.total` necondiționat. Fără nicio
   * sesiune pornită, scopul e gol, iar scopul gol înseamnă „toată biblioteca" —
   * deci un elev care nu începuse niciodată nimic vedea lângă „Grile" un număr
   * egal cu întreaga bibliotecă, ca și cum ar fi avut o sesiune în așteptare.
   */
  it('nu pune insignă pe „Grile" cât timp nicio sesiune n-a fost pornită', () => {
    Object.assign(sesiune, { hasStarted: false, finished: false, total: 181, revealed: {} });

    expect(badgeGrile()).toBeUndefined();
  });

  it('pune insigna cu câte au rămas în sesiunea pornită', () => {
    Object.assign(sesiune, { hasStarted: true, finished: false, total: 10, revealed: { 0: true, 1: true } });

    expect(badgeGrile()).toBe('8');
  });

  /** O sesiune încheiată n-are „rămase": panoul de rezultat e ce urmează, nu grile. */
  it('scoate insigna după ce sesiunea s-a încheiat', () => {
    Object.assign(sesiune, { hasStarted: true, finished: true, total: 10, revealed: { 0: true } });

    expect(badgeGrile()).toBeUndefined();
  });
});
