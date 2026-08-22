/**
 * Citirea unei tabele întregi, pe pagini.
 *
 * PostgREST taie tăcut răspunsul la `db-max-rows` — nu întoarce o eroare, doar
 * mai puține rânduri. Interogările noastre de bibliotecă și de jurnal n-aveau
 * nici `range`, nici `limit`, deci la prima depășire a pragului progresul unui
 * elev ar fi început să scadă singur, fără nimic în consolă.
 *
 * Bucla se oprește după **numărul total raportat de server**, nu după „pagina a
 * venit mai scurtă decât am cerut". Diferența contează: dacă `db-max-rows` e mai
 * mic decât `PAGINA`, fiecare pagină vine scurtă și o oprire pe lungime ar
 * reintroduce exact trunchierea tăcută pe care fișierul ăsta o repară. Decalajul
 * se ia din câte rânduri avem deja, deci o pagină scurtată de server nu sare
 * peste nimic.
 *
 * Nu rezolvă problema de volum — biblioteca tot ajunge întreagă în browser. Aia
 * se rezolvă la generarea testelor pe server; asta e doar corectitudinea.
 */
export const PAGINA = 500;

export interface Pagina<T> {
  data: T[] | null;
  error: { message: string } | null;
  count: number | null;
}

export async function citesteTot<T>(
  cerePagina: (de: number, la: number) => PromiseLike<Pagina<T>>,
): Promise<T[]> {
  const tot: T[] = [];

  for (;;) {
    const { data, error, count } = await cerePagina(tot.length, tot.length + PAGINA - 1);
    if (error) throw new Error(error.message);

    const lot = data ?? [];
    tot.push(...lot);

    // O pagină goală înseamnă că am ajuns la capăt, oricât ar spune `count`:
    // fără ieșirea asta, un `count` prea mare ar învârti bucla la nesfârșit.
    if (lot.length === 0) return tot;
    // Fără `count` (server care nu-l cere sau nu-l dă) ne oprim după prima
    // pagină, ca înainte — mai bine la fel ca acum decât într-o buclă infinită.
    if (count === null || tot.length >= count) return tot;
  }
}
