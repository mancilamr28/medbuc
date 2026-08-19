/**
 * Fereastra vizibilă a navigatorului de grile: cel mult 24 deodată, urmărind
 * grila curentă.
 *
 * Fără ea, un navigator afișa toate grilele sesiunii într-un grid elastic —
 * o singură grilă se întindea pe tot lățimea cardului (`auto-fit` + `1fr` cu
 * un singur element nu are cu ce împărți spațiul), iar o sesiune de zeci de
 * grile devenea o listă nesfârșită de pătrate mici înainte de notițe și
 * statistici. Fereastra de mărime fixă rezolvă amândouă: un singur element
 * stă pe o coloană dintr-un grid cu coloane fixe, nu se întinde, iar restul
 * rămân în afara ecranului până ajungi la ele.
 *
 * Extrasă din `Simulari.tsx`, ca `Grile.tsx` să folosească aceeași mărime de
 * fereastră — cele două navigatoare arătau diferit tocmai fiindcă fiecare
 * avea propria soluție (sau, la Grile, deloc).
 *
 * Presupune `total > 0`: apelantul randează navigatorul doar cât timp există
 * o grilă curentă.
 */
export function navWindow(qi: number, total: number, marime = 24): { start: number; end: number } {
  const size = Math.min(marime, total);
  const start = Math.min(Math.floor(qi / size) * size, Math.max(0, total - size));
  return { start, end: Math.min(start + size, total) };
}
