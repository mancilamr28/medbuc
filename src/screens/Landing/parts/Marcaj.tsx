/**
 * Marcajul de secțiune: cifră cu serif, eticheta, o linie care se stinge.
 *
 * Serif-ul e `Newsreader`, fontul de titlu al aplicației — singurul loc din
 * pagină unde apare. Leagă prezentarea de produsul de dincolo de login fără să
 * ducă întreaga compoziție într-un registru editorial.
 */
export function Marcaj({ nr, children }: { nr: string; children: string }) {
  return (
    <div className="lp-marcaj">
      <span className="lp-marcaj__nr">{nr}</span>
      {children}
      <span className="lp-marcaj__linie" />
    </div>
  );
}
