import { SANS } from '../lib/ui';

export interface RandTabel {
  id: string;
  /** Ce identifică rândul: ziua, capitolul. Devine antet de rând. */
  antet: string;
  /** Valorile, în ordinea coloanelor rămase. */
  valori: readonly string[];
}

/**
 * Perechea tabelară a unui grafic — aceleași date, fără culoare și fără hover.
 *
 * Un grafic ține valorile în geometrie: cine nu vede desenul, nu poate ajunge la
 * ele, iar un tooltip nu ajută dacă nu poți ținti. Tabelul e varianta la care se
 * ajunge oricum, cu tastatura sau cu un cititor de ecran, fără nicio
 * interacțiune cu desenul.
 *
 * `<details>` e ales intenționat în locul unui comutator grafic/tabel: tabelul e
 * *în plus*, nu *în loc* — nu trebuie să pierzi graficul ca să citești un număr.
 * Fiind element nativ, vine cu deschidere din tastatură și cu stare anunțată,
 * fără niciun `aria-*` scris de mână.
 */
export function TabelGrafic({
  rezumat,
  coloane,
  randuri,
}: {
  rezumat: string;
  coloane: readonly string[];
  randuri: readonly RandTabel[];
}) {
  if (randuri.length === 0) return null;

  const [primaColoana, ...restColoane] = coloane;

  return (
    <details style={{ marginTop: 4 }}>
      <summary
        className="tinta-tactila"
        style={{ cursor: 'pointer', padding: '7px 0', font: `500 12px ${SANS}`, color: 'var(--fg2)' }}
      >
        Datele în tabel
      </summary>

      <div style={{ overflowX: 'auto', paddingBottom: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: `400 12.5px ${SANS}` }}>
          <caption style={{ captionSide: 'top', textAlign: 'left', padding: '2px 0 8px', font: `400 11.5px ${SANS}`, color: 'var(--fg2)' }}>
            {rezumat}
          </caption>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: 'left', padding: '7px 10px 7px 0', borderBottom: '1px solid var(--line)', font: `600 11.5px ${SANS}`, color: 'var(--fg2)' }}>
                {primaColoana}
              </th>
              {restColoane.map((coloana) => (
                <th
                  key={coloana}
                  scope="col"
                  style={{ textAlign: 'right', padding: '7px 0 7px 10px', borderBottom: '1px solid var(--line)', font: `600 11.5px ${SANS}`, color: 'var(--fg2)' }}
                >
                  {coloana}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {randuri.map((rand) => (
              <tr key={rand.id}>
                <th
                  scope="row"
                  style={{ textAlign: 'left', padding: '7px 10px 7px 0', borderBottom: '1px solid var(--line)', font: `400 12.5px ${SANS}`, color: 'var(--fg2)' }}
                >
                  {rand.antet}
                </th>
                {rand.valori.map((valoare, index) => (
                  <td
                    key={`${rand.id}-${restColoane[index] ?? index}`}
                    className="tabular"
                    style={{ textAlign: 'right', padding: '7px 0 7px 10px', borderBottom: '1px solid var(--line)', color: 'var(--fg)' }}
                  >
                    {valoare}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
