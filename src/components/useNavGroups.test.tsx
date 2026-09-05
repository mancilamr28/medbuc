import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavGroups } from './useNavGroups';

const simulareVeche = { run: null as unknown };
vi.mock('../state/appContextValue', () => ({ useApp: () => ({ simulareVeche }) }));
vi.mock('../state/authState', () => ({ useAuth: () => ({ role: 'elev' }) }));
beforeEach(() => { simulareVeche.run = null; });

describe('navigarea după retragerea motoarelor vechi', () => {
  it('oferă numai drumul nou când nu există nimic de recuperat', () => {
    const { result } = renderHook(() => useNavGroups());
    expect(result.current.main.map((e) => e.id)).toEqual(['acasa', 'test-nou', 'recapitulare', 'statistici']);
  });
  it('păstrează accesul inclusiv la o simulare veche deja predată', () => {
    simulareVeche.run = { finishedAt: 1000 };
    const { result } = renderHook(() => useNavGroups());
    expect(result.current.main.find((e) => e.id === 'simulari')).toBeDefined();
  });
});
