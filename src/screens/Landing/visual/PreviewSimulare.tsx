/**
 * Macheta ecranului de simulare.
 *
 * Formatul e cel real din `Simulari.tsx`: modelul UMFCD Medicină generală,
 * 100 de grile, 180 de minute. Navigatorul arată aceleași patru stări pe care
 * le are lucrarea adevărată — fără răspuns, cu răspuns, marcată, curentă.
 */

/** 24 de căsuțe, cât fereastra de navigare din aplicație. */
const CASUTE = [
  'raspuns', 'raspuns', 'raspuns', 'marcat', 'raspuns', 'raspuns',
  'raspuns', 'raspuns', 'marcat', 'raspuns', 'raspuns', 'curent',
  '', '', '', '', '', '',
  '', '', '', '', '', '',
] as const;

export function PreviewSimulare() {
  return (
    <div className="lp-preview">
      <div className="lp-preview__bara">
        <span className="lp-preview__bec" />
        <span>Simulare · Medicină generală · 100 de grile</span>
      </div>

      <div className="lp-preview__corp">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="lp-preview__sursa" style={{ marginTop: 0 }}>
              Timp rămas
            </div>
            <div className="lp-cronometru">
              2:41:08 <span className="lp-cronometru__unitate">din 3:00:00</span>
            </div>
          </div>
          <span className="lp-chip lp-chip--cyan">12 / 100</span>
        </div>

        <div className="lp-navigator">
          {CASUTE.map((stare, i) => (
            <span key={i} data-stare={stare || undefined} />
          ))}
        </div>

        <p className="lp-preview__sursa" style={{ marginTop: 14 }}>
          Cronometrul curge din ora de final, nu dintr-un contor: închizi fila, timpul merge mai departe.
        </p>
      </div>
    </div>
  );
}
