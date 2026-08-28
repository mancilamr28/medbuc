import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { genereazaTest } from '../lib/lucrari';
import { INTERVALE_RECAPITULARE_ZILE, urmatoareaScadenta } from '../lib/recapitulare';
import { goLucrare, goTestNou } from '../lib/router';
import { reportError } from '../lib/sentry';
import { numar } from '../lib/text';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useContentOptional } from '../state/contentState';
import { useProgressOptional } from '../state/progressState';
import { useToast } from '../state/toastState';

const DATA = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'long' });

/**
 * Coada de repetare, fără o a doua mini-aplicație de rezolvare în browser.
 *
 * Programarea rămâne calculată din jurnalul de răspunsuri. Când elevul începe,
 * id-urile scadente sunt trimise motorului, care creează aceeași lucrare
 * persistentă ca asistentul de test. Așa enunțurile și răspunsurile sosesc doar
 * pentru lucrarea deschisă, la momentul potrivit.
 */
export function Recapitulare() {
  const { recapitulare, taxonomie } = useApp();
  const continut = useContentOptional();
  const progress = useProgressOptional();
  const { notify } = useToast();
  const [sePorneste, setSePorneste] = useState(false);

  const urmatoarea = urmatoareaScadenta(recapitulare.items);
  const indisponibil = (continut?.loading ?? false) || (progress?.loading ?? false);

  const porneste = async () => {
    if (sePorneste || recapitulare.scadente.length === 0) return;
    setSePorneste(true);
    try {
      const ids = recapitulare.scadente.map((item) => item.question.id);
      const rezultat = await genereazaTest({
        mod: 'recapitulare',
        filtre: { ids },
        nr: ids.length,
        amesteca_grile: false,
        amesteca_optiuni: false,
      });
      goLucrare(rezultat.run_id);
    } catch (error: unknown) {
      reportError(error, 'Recapitulare: generare');
      notify('eroare', 'Nu am putut porni recapitularea. Încearcă din nou.');
      setSePorneste(false);
    }
  };

  return (
    <div className="screen">
      <h1 style={pageTitle}>Repetare inteligentă</h1>
      <p style={pageLead}>
        Grilele greșite revin la momentul potrivit. Rezolvarea se salvează în cont și poate fi reluată.
      </p>

      <div style={{ ...autoGrid(190), marginTop: 20 }}>
        <Cifra
          eticheta="De repetat acum"
          valoare={indisponibil ? '—' : String(recapitulare.scadente.length)}
          unitate={!indisponibil && recapitulare.scadente.length === 1 ? 'grilă' : 'grile'}
        />
        <Cifra
          eticheta="În program"
          valoare={indisponibil ? '—' : String(recapitulare.items.length)}
          unitate={!indisponibil && recapitulare.items.length === 1 ? 'grilă' : 'grile'}
        />
        <Cifra
          eticheta="Următoarea revenire"
          valoare={indisponibil || urmatoarea === null ? '—' : DATA.format(new Date(urmatoarea))}
        />
      </div>

      <div style={{ ...autoGrid(300), marginTop: 18, alignItems: 'start' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ font: `600 15px ${SANS}` }}>Coada de azi</div>
            <div style={{ marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>
              Cea mai veche scadență apare prima.
            </div>
          </div>

          {indisponibil ? (
            <EmptyState title="Se încarcă recapitularea…" padding="54px 22px" />
          ) : progress?.error ? (
            <EmptyState
              title={progress.error}
              hint="Nu presupunem că lista este goală cât timp istoricul nu poate fi citit."
              action={
                <button type="button" className="btn-ghost" onClick={() => void progress.reload()}>
                  Reîncearcă
                </button>
              }
            />
          ) : recapitulare.items.length === 0 ? (
            <EmptyState
              title="Construiește prima recapitulare"
              hint="După prima greșeală, grila intră automat în programul de repetare."
              action={
                <button type="button" className="btn-primary tinta-tactila" onClick={() => goTestNou('exersare')}>
                  Exersează din capitole
                </button>
              }
            />
          ) : recapitulare.scadente.length === 0 ? (
            <EmptyState
              title="Nimic de recapitulat azi"
              hint={urmatoarea === null ? undefined : `Următoarea repetare: ${DATA.format(new Date(urmatoarea))}.`}
            />
          ) : (
            <>
              <div>
                {recapitulare.scadente.slice(0, 8).map((item) => (
                  <div
                    key={item.question.id}
                    className="list-row"
                    style={{ padding: '13px 20px', borderBottom: '1px solid var(--line)' }}
                  >
                    <div style={{ font: `500 13.5px ${SANS}` }}>
                      {taxonomie.numeMaterie(item.question.capId)} · {taxonomie.eticheta(item.question.capId)}
                    </div>
                    <div style={{ marginTop: 4, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                      {item.question.id} · scadentă din {DATA.format(new Date(item.scadentaLa))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 18, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-primary tinta-tactila"
                  onClick={() => void porneste()}
                  disabled={sePorneste}
                  style={{ padding: '12px 18px', font: `600 14px ${SANS}` }}
                >
                  {sePorneste
                    ? 'Se pregătește…'
                    : `Începe recapitularea · ${numar(recapitulare.scadente.length, 'grilă', 'grile')}`}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={eyebrow(undefined, 11)}>Ritmul repetării</div>
          <div style={{ marginTop: 12, font: `400 14px/1.65 ${SANS}`, color: 'var(--fg2)' }}>
            După o greșeală, grila revine imediat. Răspunsurile corecte o mută treptat la{' '}
            {INTERVALE_RECAPITULARE_ZILE.join(', ')} de zile.
          </div>
          <div style={{ marginTop: 12, font: `400 12px/1.55 ${SANS}`, color: 'var(--fg3)' }}>
            Nu salvăm o listă paralelă. Programul este recalculat din răspunsurile reale din cont.
          </div>
        </div>
      </div>
    </div>
  );
}

function Cifra({ eticheta, valoare, unitate }: { eticheta: string; valoare: string; unitate?: string }) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={eyebrow(undefined, 10.5)}>{eticheta}</div>
      <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="tabular" style={{ font: `500 27px/1 ${SERIF}` }}>{valoare}</span>
        {unitate && <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>{unitate}</span>}
      </div>
    </div>
  );
}
