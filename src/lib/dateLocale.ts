/**
 * Ștergerea a tot ce ține aplicația în `localStorage`.
 *
 * Stătea doar în `ErrorBoundary`, ca buton de recuperare dintr-o stare stricată.
 * A doua chemare, de la ștergerea contului, e ce a scos-o aici: cheile `medbuc.*`
 * sunt indexate pe conținut (`medbuc.note.${capId}`, `medbuc.sim.run`), nu pe
 * utilizator, deci fără curățare rămân pe dispozitiv după ce contul a dispărut
 * din bază — iar următorul cont făcut pe același browser le citește ca pe ale
 * lui. Pe un laptop de familie asta înseamnă notițele și lucrarea altcuiva.
 *
 * Înghite erorile: în mod privat, sau cu depozitul blocat, ștergerea contului nu
 * are voie să pice din cauza asta — partea din bază s-a făcut deja.
 */
export function stergeDateleLocale(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('medbuc.'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* depozit indisponibil — nu e nimic de curățat oricum */
  }
}
