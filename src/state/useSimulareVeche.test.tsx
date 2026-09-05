import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSimulareVeche } from './useSimulareVeche';

const run = {
  startedAt: 1000, endsAt: 11000, finishedAt: null,
  config: { model: 'Examen vechi', nr: '2', durata: '10 minute', ordine: 'Amestecate' },
  order: ['grila-noua', 'grila-retrasa'], qi: 1, answers: { 0: 'A' }, marks: { 1: true },
};

describe('recuperarea instantaneului vechi fără motorul de simulare', () => {
  it('completează identitatea o singură dată și păstrează răspunsurile la remontare', async () => {
    localStorage.setItem('medbuc.sim.run', JSON.stringify(run));
    const prima = renderHook(() => useSimulareVeche());
    await waitFor(() => expect(prima.result.current.run?.id).toBeTruthy());
    const id = prima.result.current.run!.id;
    expect(prima.result.current.run).toMatchObject(run);
    prima.unmount();
    const aDoua = renderHook(() => useSimulareVeche());
    expect(aDoua.result.current.run).toEqual({ ...run, id });
    act(() => aDoua.result.current.sterge());
    expect(localStorage.getItem('medbuc.sim.run')).toBeNull();
  });
  it('nu pornește și nu scrie o simulare nouă în lipsa unui instantaneu', () => {
    const { result } = renderHook(() => useSimulareVeche());
    expect(result.current.run).toBeNull();
    expect(localStorage.getItem('medbuc.sim.run')).toBeNull();
    expect(localStorage.getItem('medbuc.sim.config')).toBeNull();
  });
  it('tolerează o valoare veche coruptă fără să blocheze aplicația', () => {
    localStorage.setItem('medbuc.sim.run', JSON.stringify({ order: null }));
    const { result } = renderHook(() => useSimulareVeche());
    expect(result.current.run).toBeNull();
  });
});
