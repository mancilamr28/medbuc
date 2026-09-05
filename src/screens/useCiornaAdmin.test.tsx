import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { esteLucruAdmin, useCiornaAdmin } from './useCiornaAdmin';

describe('recuperarea formularului', () => {
  it('separă conturile și recuperează și întrebările incomplete', () => {
    const { result, rerender } = renderHook(({ id }) => useCiornaAdmin(id), { initialProps: { id: 'autor-1' } });
    act(() => result.current.setCiorna((c) => ({ ...c, text: 'Doar enunțul' })));
    rerender({ id: 'autor-2' });
    expect(result.current.ciorna.text).toBe('');
    rerender({ id: 'autor-1' });
    expect(result.current.ciorna.text).toBe('Doar enunțul');
    expect(result.current.raspunsAles).toBe(false);
  });
  it('respinge stocarea stricată în loc să blocheze administrarea', () => {
    expect(esteLucruAdmin({ ciorna: { opts: null } })).toBe(false);
    localStorage.setItem('medbuc.admin.ciorna.v1.autor', '{"ciorna":null}');
    const { result } = renderHook(() => useCiornaAdmin('autor'));
    expect(result.current.ciorna.text).toBe('');
  });
});
