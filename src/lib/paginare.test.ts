import { describe, expect, it, vi } from 'vitest';
import { PAGINA, citesteTot, type Pagina } from './paginare';

/** Un server fals cu N rânduri, care taie fiecare pagină la `maxRows`. */
const server = (total: number, maxRows = PAGINA) => {
  const randuri = Array.from({ length: total }, (_, i) => ({ id: i }));
  const cereri: [number, number][] = [];

  const cerePagina = vi.fn(async (de: number, la: number): Promise<Pagina<{ id: number }>> => {
    cereri.push([de, la]);
    const cerute = la - de + 1;
    return {
      data: randuri.slice(de, de + Math.min(cerute, maxRows)),
      error: null,
      count: total,
    };
  });

  return { cerePagina, cereri, randuri };
};

describe('citesteTot', () => {
  it('întoarce tot dintr-o singură pagină când încape', async () => {
    const { cerePagina, cereri } = server(10);
    const tot = await citesteTot(cerePagina);

    expect(tot).toHaveLength(10);
    expect(cereri).toEqual([[0, PAGINA - 1]]);
  });

  it('adună paginile până la numărul raportat de server', async () => {
    const { cerePagina, cereri } = server(PAGINA * 2 + 7);
    const tot = await citesteTot(cerePagina);

    expect(tot).toHaveLength(PAGINA * 2 + 7);
    expect(tot.map((r) => r.id)).toEqual([...Array(PAGINA * 2 + 7).keys()]);
    expect(cereri).toHaveLength(3);
  });

  /**
   * Cazul pentru care există fișierul. Cu `db-max-rows` sub `PAGINA`, fiecare
   * pagină vine mai scurtă decât am cerut; o oprire pe „pagina e scurtă" ar
   * întoarce doar primele 40 de rânduri din 130 și nimic n-ar semnala.
   */
  it('nu se oprește când serverul taie paginile sub cât s-a cerut', async () => {
    const { cerePagina, cereri } = server(130, 40);
    const tot = await citesteTot(cerePagina);

    expect(tot).toHaveLength(130);
    expect(cereri[1]![0]).toBe(40);
    expect(cereri[2]![0]).toBe(80);
  });

  it('se oprește pe o pagină goală, chiar dacă serverul cere mai mult', async () => {
    const cerePagina = vi.fn(async (de: number): Promise<Pagina<{ id: number }>> => ({
      data: de === 0 ? [{ id: 0 }] : [],
      error: null,
      count: 9999,
    }));

    await expect(citesteTot(cerePagina)).resolves.toHaveLength(1);
    expect(cerePagina).toHaveBeenCalledTimes(2);
  });

  it('se oprește după prima pagină când serverul nu dă un total', async () => {
    const cerePagina = vi.fn(async (): Promise<Pagina<{ id: number }>> => ({
      data: [{ id: 0 }],
      error: null,
      count: null,
    }));

    await expect(citesteTot(cerePagina)).resolves.toHaveLength(1);
    expect(cerePagina).toHaveBeenCalledOnce();
  });

  it('ridică eroarea serverului în loc să întoarcă o listă parțială', async () => {
    const cerePagina = async (): Promise<Pagina<{ id: number }>> => ({
      data: null,
      error: { message: 'JWT expirat' },
      count: null,
    });

    await expect(citesteTot(cerePagina)).rejects.toThrow('JWT expirat');
  });
});
