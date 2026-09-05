import { useState } from 'react';
import { salveazaColectie } from '../lib/continut';
import type { Colectie, Colectii } from '../lib/colectii';
import { reportError } from '../lib/sentry';
import { SANS, autoGrid, eyebrow, label, pageLead, statusChip } from '../lib/ui';
import { useToast } from '../state/toastState';

/**
 * Colecțiile — loturile din care vin grilele.
 *
 * Erau text liber pe fiecare grilă până la migrarea 0011, deci nu se puteau
 * renumi, filtra sau descrie. Ecranul ăsta e capătul acelei mutări: aici se
 * scriu lucrările de admitere, simulările oficiale și culegerile.
 *
 * `sursaBibliografica` nu e decor. Vânzarea accesului la culegeri digitizate e
 * un risc de drepturi de autor, iar subiectele oficiale sunt teren mult mai
 * sigur — câmpul ăsta e locul unde diferența se înregistrează, înainte să fie
 * nevoie de ea.
 */
const FELURI: { id: string; eticheta: string }[] = [
  { id: 'subiect_oficial', eticheta: 'Subiect oficial' },
  { id: 'simulare_oficiala', eticheta: 'Simulare oficială' },
  { id: 'culegere', eticheta: 'Culegere' },
  { id: 'autor', eticheta: 'Scrisă de noi' },
];

const etichetaFelului = (id: string) => FELURI.find((f) => f.id === id)?.eticheta ?? id;

export function AdminColectii({
  colectii,
  dupaSalvare,
}: {
  colectii: Colectii;
  dupaSalvare: () => void;
}) {
  const { notify } = useToast();
  const [cautare, setCautare] = useState('');
  const [inLucru, setInLucru] = useState(false);

  const salveaza = async (c: Parameters<typeof salveazaColectie>[0], reusit: string) => {
    if (inLucru) return;
    setInLucru(true);
    try {
      await salveazaColectie(c);
      dupaSalvare();
      notify('succes', reusit);
      return true;
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut salva colecția.');
      reportError(e, 'Administrare: colecții');
      return false;
    } finally {
      setInLucru(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <p style={pageLead}>
        O colecție grupează grilele din aceeași carte, admitere sau simulare. Creeaz-o o singură dată,
        apoi alege-o când adaugi grile sau imporți un lot. Capitolul spune ce se învață; colecția spune de unde vine conținutul.
      </p>

      <details className="admin-detalii">
        <summary>Adaugă o sursă / colecție</summary>
        <FormularColectie inLucru={inLucru} onSalveaza={(c) => salveaza(c, 'Colecția a fost creată.')} />
      </details>
      <input className="field" aria-label="Caută o colecție" placeholder="Caută după nume sau an…" value={cautare} onChange={(e) => setCautare(e.target.value)} />

      <div className="card" style={{ overflow: 'hidden' }}>
        {colectii.lista.length === 0 ? (
          <div style={{ padding: 20, font: `400 13px ${SANS}`, color: 'var(--fg3)' }}>
            Nicio colecție încă. Prima scrisă mai sus apare aici.
          </div>
        ) : (
          colectii.lista.filter((c) => `${c.nume} ${c.an ?? ''}`.toLocaleLowerCase('ro').includes(cautare.toLocaleLowerCase('ro'))).map((c) => (
            <RandColectie
              key={c.id}
              colectie={c}
              inLucru={inLucru}
              onSalveaza={(x) => salveaza(x, 'Colecția a fost salvată.')}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function FormularColectie({
  inLucru,
  onSalveaza,
}: {
  inLucru: boolean;
  onSalveaza: (c: Parameters<typeof salveazaColectie>[0]) => Promise<boolean | undefined>;
}) {
  const gol: {
    id: string;
    nume: string;
    tip: string;
    an: string;
    sursa: string;
    acces: 'liber' | 'premium';
  } = { id: `colectie-${crypto.randomUUID()}`, nume: '', tip: 'subiect_oficial', an: '', sursa: '', acces: 'liber' };
  const [c, setC] = useState(gol);

  const poate = c.id.trim() !== '' && c.nume.trim() !== '';
  const eCulegere = c.tip === 'culegere';

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={eyebrow(undefined, 11)}>Colecție nouă</div>

      <div style={{ marginTop: 12, ...autoGrid(170, 12) }}>
        <details className="admin-detalii"><summary>Cod intern (automat)</summary><label style={{ display: 'block' }}>
          <span style={label}>Identificator</span>
          <input
            className="field"
            value={c.id}
            onChange={(e) => setC((p) => ({ ...p, id: e.target.value }))}
            placeholder="umfcd-2027-mg"
            style={{ padding: '9px 11px', font: `400 13px ${SANS}` }}
          />
        </label></details>
        <label style={{ display: 'block' }}>
          <span style={label}>Nume</span>
          <input
            className="field"
            value={c.nume}
            onChange={(e) => setC((p) => ({ ...p, nume: e.target.value }))}
            placeholder="Admitere UMFCD · Medicină · 2027"
            style={{ padding: '9px 11px', font: `400 13px ${SANS}` }}
          />
        </label>
        <label style={{ display: 'block' }}>
          <span style={label}>Fel</span>
          <select
            className="field"
            value={c.tip}
            onChange={(e) => setC((p) => ({ ...p, tip: e.target.value }))}
            style={{ padding: '9px 11px', font: `400 13px ${SANS}`, cursor: 'pointer' }}
          >
            {FELURI.map((f) => (
              <option key={f.id} value={f.id}>
                {f.eticheta}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'block' }}>
          <span style={label}>Anul</span>
          <input
            className="field"
            value={c.an}
            onChange={(e) => setC((p) => ({ ...p, an: e.target.value }))}
            placeholder="2027"
            inputMode="numeric"
            style={{ padding: '9px 11px', font: `400 13px ${SANS}` }}
          />
        </label>
        <label style={{ display: 'block' }}>
          <span style={label}>Acces</span>
          <select
            className="field"
            value={c.acces}
            onChange={(e) => setC((p) => ({ ...p, acces: e.target.value as 'liber' | 'premium' }))}
            aria-label="Accesul colecției"
            style={{ padding: '9px 11px', font: `400 13px ${SANS}`, cursor: 'pointer' }}
          >
            <option value="liber">Liber</option>
            <option value="premium">Premium</option>
          </select>
        </label>
      </div>

      <label style={{ display: 'block', marginTop: 12 }}>
        <span style={label}>Sursa bibliografică</span>
        <input
          className="field"
          value={c.sursa}
          onChange={(e) => setC((p) => ({ ...p, sursa: e.target.value }))}
          placeholder="Corint, ediția 2024"
          aria-label="Sursa bibliografică"
          style={{ padding: '9px 11px', font: `400 13px ${SANS}` }}
        />
        <span style={{ display: 'block', marginTop: 6, font: `400 11.5px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
          Cartea și ediția, pentru colecțiile digitizate. E singura evidență a provenienței, iar
          întrebarea de drepturi vine înaintea oricărei plăți.
        </span>
      </label>

      <button
        type="button"
        className="btn-primary"
        disabled={!poate || inLucru}
        onClick={async () => {
          const reusit = await onSalveaza({
            id: c.id.trim(),
            nume: c.nume.trim(),
            tip: c.tip,
            // O culegere nu ține de un centru de admitere; o lucrare, da.
            centruId: eCulegere ? null : 'umfcd',
            an: c.an.trim() === '' ? null : Number(c.an.trim()),
            sursaBibliografica: c.sursa.trim(),
            acces: c.acces,
          });
          if (reusit) setC(gol);
        }}
        style={{ marginTop: 14, padding: '9px 15px', font: `600 13px ${SANS}`, opacity: poate ? 1 : 0.5 }}
      >
        Adaugă colecția
      </button>
    </div>
  );
}

function RandColectie({
  colectie,
  inLucru,
  onSalveaza,
}: {
  colectie: Colectie;
  inLucru: boolean;
  onSalveaza: (c: Parameters<typeof salveazaColectie>[0]) => Promise<boolean | undefined>;
}) {
  const [nume, setNume] = useState(colectie.nume);
  const [editez, setEditez] = useState(false);

  return (
    <div
      className="list-row"
      style={{
        padding: '11px 18px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}
    >
      {editez ? (
        <input
          className="field"
          value={nume}
          onChange={(e) => setNume(e.target.value)}
          aria-label={`Numele colecției ${colectie.id}`}
          style={{ flex: 1, minWidth: 160, padding: '7px 10px', font: `400 13px ${SANS}` }}
        />
      ) : (
        <span style={{ flex: 1, minWidth: 0, font: `400 13px ${SANS}` }} className="truncate">
          {colectie.nume}
        </span>
      )}

      <span style={statusChip('var(--surf3)', 'var(--fg3)')}>{etichetaFelului(colectie.tip)}</span>
      <span
        style={
          colectie.acces === 'premium'
            ? statusChip('var(--accS)', 'var(--acc)')
            : statusChip('var(--okS)', 'var(--ok)')
        }
      >
        {colectie.acces === 'premium' ? 'Premium' : 'Liber'}
      </span>
      {colectie.an !== null && (
        <span className="tabular" style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
          {colectie.an}
        </span>
      )}

      {editez ? (
        <button
          type="button"
          className="btn-ghost"
          disabled={inLucru || nume.trim() === ''}
          onClick={async () => {
            // Doar numele. Anul, cartea, centrul și poziția rămân ce erau —
            // formularul ăsta nu le arată, deci n-are ce să spună despre ele.
            const reusit = await onSalveaza({
              id: colectie.id,
              nume: nume.trim(),
              tip: colectie.tip,
              acces: colectie.acces,
            });
            if (reusit) setEditez(false);
          }}
          style={{ padding: '6px 11px', font: `500 12px ${SANS}` }}
        >
          Salvează
        </button>
      ) : (
        <>
          <button
            type="button"
            className="btn-quiet"
            disabled={inLucru}
            onClick={() =>
              onSalveaza({
                id: colectie.id,
                nume: colectie.nume,
                tip: colectie.tip,
                acces: colectie.acces === 'premium' ? 'liber' : 'premium',
              })
            }
            style={{ font: `500 12px ${SANS}` }}
          >
            {colectie.acces === 'premium' ? 'Fă liberă' : 'Fă premium'}
          </button>
          <button
            type="button"
            className="btn-quiet"
            onClick={() => setEditez(true)}
            style={{ font: `500 12px ${SANS}` }}
          >
            Redenumește
          </button>
        </>
      )}
    </div>
  );
}
