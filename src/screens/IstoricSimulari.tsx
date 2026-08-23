import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Progress } from '../components/Progress';
import { RecitireGrile, type GrilaRecitita } from '../components/RecitireGrile';
import type { QuestionId } from '../data/questions';
import {
  citesteRaspunsurileLucrarii,
  reconstituieLucrarea,
  rezumaLucrari,
  type LucrareIstoric,
  type SimRunRow,
} from '../lib/istoricSimulari';
import { reportError } from '../lib/sentry';
import { formatClock } from '../lib/time';
import { SANS, SERIF, autoGrid, eyebrow } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useProgressOptional } from '../state/progressState';
import { frazaCorecte } from './grileText';

const CAND = new Intl.DateTimeFormat('ro-RO', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/** Culoarea punctajului, aceeași convenție ca pe panourile de rezultat. */
const culoarePct = (pct: number): string =>
  pct >= 80 ? 'var(--ok)' : pct >= 65 ? 'var(--brand)' : 'var(--bad)';

/**
 * Lucrările predate până acum, în bara laterală a configurării.
 *
 * Panoul exista de la început, dar ca listă fixă de trei lucrări care nu
 * fuseseră date niciodată; de când e derivat, a stat gol, fiindcă simulările nu
 * se salvau deloc. Acum se umple din `sim_runs` plus `attempts`.
 */
export function PanouIstoric({ onDeschide }: { onDeschide: (id: string) => void }) {
  const progres = useProgressOptional();
  const lucrari = useMemo(
    () => rezumaLucrari(progres?.simRuns ?? [], progres?.attempts ?? []),
    [progres?.simRuns, progres?.attempts],
  );

  return (
    <div className="card-flat" style={{ padding: 20 }}>
      <div style={eyebrow(undefined, 11)}>Simulările tale</div>

      {progres?.loading && lucrari.length === 0 ? (
        <EmptyState
          title="Se încarcă lucrările…"
          hint="Citirea nu blochează pornirea unei simulări noi."
          padding="22px 4px 6px"
        />
      ) : lucrari.length === 0 ? (
        <EmptyState
          title="Nicio simulare dată încă"
          hint="Lucrările predate apar aici, cu punctajul și timpul în care le-ai terminat."
          padding="22px 4px 6px"
        />
      ) : (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lucrari.map((lucrare) => (
            <RandLucrare key={lucrare.id} lucrare={lucrare} onDeschide={onDeschide} />
          ))}
        </div>
      )}
    </div>
  );
}

function RandLucrare({
  lucrare,
  onDeschide,
}: {
  lucrare: LucrareIstoric;
  onDeschide: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className="row-btn tinta-tactila"
      onClick={() => onDeschide(lucrare.id)}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: 14, borderRadius: 11, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span className="tabular" style={{ font: `600 18px/1 ${SANS}`, color: culoarePct(lucrare.pct) }}>
          {lucrare.pct}%
        </span>
        <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg2)' }}>
          {frazaCorecte(lucrare.corecte, lucrare.total)}
        </span>
      </div>
      <div style={{ marginTop: 6, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
        {CAND.format(new Date(lucrare.finishedAt))} · {lucrare.model}
      </div>
      <div style={{ marginTop: 8, font: `500 11.5px ${SANS}`, color: 'var(--brand)' }}>Vezi lucrarea →</div>
    </button>
  );
}

/**
 * O lucrare veche, redeschisă doar pentru citit.
 *
 * Răspunsurile se cer abia acum, nu odată cu istoricul: lista are nevoie doar de
 * câte grile au fost corecte, iar asta o dă jurnalul deja încărcat. O lucrare
 * are până la 100 de rânduri pe care nimeni nu le vrea până nu deschide una.
 */
export function LucrareRedeschisa({
  run,
  lucrare,
  onInchide,
}: {
  run: SimRunRow;
  lucrare: LucrareIstoric;
  onInchide: () => void;
}) {
  const { questions, tipuri } = useApp();
  const [grile, setGrile] = useState<GrilaRecitita[] | null>(null);
  const [eroare, setEroare] = useState(false);
  const [incercare, setIncercare] = useState(0);

  const byId = useMemo(() => new Map(questions.map((q) => [q.id as QuestionId, q])), [questions]);

  useEffect(() => {
    let renuntat = false;
    setEroare(false);
    setGrile(null);
    void citesteRaspunsurileLucrarii(run.id)
      .then((raspunsuri) => {
        if (!renuntat) setGrile(reconstituieLucrarea(run, raspunsuri, byId));
      })
      .catch((e: unknown) => {
        if (renuntat) return;
        setEroare(true);
        reportError(e, 'LucrareRedeschisa');
        console.warn('[medbuc] Nu am putut citi răspunsurile lucrării.', e);
      });
    return () => {
      renuntat = true;
    };
  }, [byId, incercare, run]);

  const reincearca = useCallback(() => setIncercare((n) => n + 1), []);

  const dale: [string, string, string][] = [
    ['Corecte', String(lucrare.corecte), 'var(--ok)'],
    ['Greșite', String(lucrare.gresite), 'var(--bad)'],
    ['Fără răspuns', String(lucrare.neraspunse), 'var(--fg3)'],
    ['Timp', formatClock(lucrare.durataMs / 1000), 'var(--fg)'],
  ];

  return (
    <div className="screen">
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <button
          type="button"
          className="btn-ghost tinta-tactila"
          onClick={onInchide}
          style={{ marginBottom: 18, padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
        >
          ← Înapoi la simulări
        </button>

        <div className="card" style={{ padding: 26 }}>
          <div style={eyebrow('var(--brand)')}>Lucrare predată</div>
          <h1 style={{ margin: '8px 0 0', font: `500 30px/1.15 ${SERIF}`, color: 'var(--fg)' }}>
            {CAND.format(new Date(lucrare.finishedAt))}
          </h1>
          <div style={{ marginTop: 6, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>{lucrare.model}</div>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span className="tabular" style={{ font: `600 46px/1 ${SERIF}`, color: culoarePct(lucrare.pct) }}>
              {lucrare.pct}%
            </span>
            <span style={{ font: `400 14px ${SANS}`, color: 'var(--fg2)' }}>
              {frazaCorecte(lucrare.corecte, lucrare.total)}
            </span>
          </div>

          <div style={{ marginTop: 14 }}>
            <Progress
              pct={lucrare.pct}
              height={8}
              color={culoarePct(lucrare.pct)}
              label={`Scor ${lucrare.pct}%`}
            />
          </div>

          <div style={{ ...autoGrid(140, 14), marginTop: 20 }}>
            {dale.map(([eticheta, valoare, color]) => (
              <div key={eticheta} className="card-flat" style={{ padding: 16 }}>
                <div style={eyebrow()}>{eticheta}</div>
                <div className="tabular" style={{ marginTop: 8, font: `600 24px/1 ${SANS}`, color }}>
                  {valoare}
                </div>
              </div>
            ))}
          </div>

          <p style={{ margin: '20px 0 0', font: `400 12.5px/1.6 ${SANS}`, color: 'var(--fg3)' }}>
            Lucrarea se citește, nu se mai răspunde: punctajul a rămas cel de la predare.
          </p>
        </div>

        {eroare ? (
          <div className="card" style={{ padding: 26, marginTop: 20 }}>
            <EmptyState
              title="Nu am putut citi răspunsurile lucrării"
              hint="Punctajul de mai sus e cel salvat la predare și rămâne valabil."
              action={
                <button
                  type="button"
                  className="btn-primary"
                  onClick={reincearca}
                  style={{ padding: '10px 16px', font: `600 13px ${SANS}` }}
                >
                  Reîncearcă
                </button>
              }
            />
          </div>
        ) : grile === null ? (
          <div className="card" style={{ padding: 26, marginTop: 20 }}>
            <EmptyState
              title="Se încarcă grilele lucrării…"
              hint="Punctajul e deja calculat, mai vin doar răspunsurile."
            />
          </div>
        ) : (
          <RecitireGrile grile={grile} tipuri={tipuri} />
        )}
      </div>
    </div>
  );
}
