import { useState } from 'react';
import { chapterLabel, type Chapter, type Materie } from '../data/chapters';
import { salveazaCapitol, salveazaMaterie } from '../lib/continut';
import { reportError } from '../lib/sentry';
import type { Taxonomie } from '../lib/taxonomie';
import { SANS, autoGrid, eyebrow, label, pageLead } from '../lib/ui';
import { useToast } from '../state/toastState';

/**
 * Materiile și capitolele, editabile din aplicație.
 *
 * Până acum se adăugau prin migrare — adică prin editorul SQL, de către cineva
 * care știe SQL. E chiar bariera pe care faza 1 a scos-o din runtime: taxonomia
 * trăiește în bază, deci trebuie și scrisă de acolo.
 *
 * **Nu există ștergere**, și nu din uitare. Un capitol depublicat iese din fața
 * elevului fără să atingă nimic din ce s-a scris deja — aceeași alegere ca
 * retragerea unei grile față de ștergerea ei, și din același motiv: `attempts` e
 * jurnal, iar id-ul capitolului e scris și în cheia notițelor.
 */
export function AdminTaxonomie({
  taxonomie,
  dupaSalvare,
}: {
  taxonomie: Taxonomie;
  dupaSalvare: () => void;
}) {
  const { notify } = useToast();
  const [inLucru, setInLucru] = useState(false);

  const cu = async (ce: () => Promise<void>, reusit: string) => {
    if (inLucru) return;
    setInLucru(true);
    try {
      await ce();
      dupaSalvare();
      notify('succes', reusit);
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut salva.');
      reportError(e, 'Administrare: taxonomie');
    } finally {
      setInLucru(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <p style={pageLead}>
        Materiile și capitolele pe care le văd elevii. Un capitol depublicat dispare din alegerea
        sesiunii, dar grilele și notițele lui rămân neatinse.
      </p>

      <FormularMaterie
        inLucru={inLucru}
        pozitieUrmatoare={taxonomie.materii.length}
        onSalveaza={(m) => cu(() => salveazaMaterie(m), 'Materia a fost salvată.')}
      />

      {taxonomie.materii.map((m) => (
        <CardMaterie
          key={m.id}
          materie={m}
          inLucru={inLucru}
          onSalveazaMaterie={(x) => cu(() => salveazaMaterie(x), 'Materia a fost salvată.')}
          onSalveazaCapitol={(c) => cu(() => salveazaCapitol(c), 'Capitolul a fost salvat.')}
        />
      ))}

      {taxonomie.materii.length === 0 && (
        <div className="card" style={{ padding: 20, font: `400 13px ${SANS}`, color: 'var(--fg3)' }}>
          Se încarcă taxonomia…
        </div>
      )}
    </div>
  );
}

/** Adăugarea unei materii noi. Id-ul se scrie o dată și nu se mai schimbă. */
function FormularMaterie({
  inLucru,
  pozitieUrmatoare,
  onSalveaza,
}: {
  inLucru: boolean;
  pozitieUrmatoare: number;
  onSalveaza: (m: { id: string; nume: string; position: number; publicat: boolean }) => void;
}) {
  const [id, setId] = useState('');
  const [nume, setNume] = useState('');

  const poate = id.trim() !== '' && nume.trim() !== '';

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={eyebrow(undefined, 11)}>Materie nouă</div>
      <div style={{ marginTop: 12, ...autoGrid(180, 12) }}>
        <label style={{ display: 'block' }}>
          <span style={label}>Identificator</span>
          <input
            className="field"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="fiz"
            style={{ padding: '9px 11px', font: `400 13px ${SANS}` }}
          />
        </label>
        <label style={{ display: 'block' }}>
          <span style={label}>Nume</span>
          <input
            className="field"
            value={nume}
            onChange={(e) => setNume(e.target.value)}
            placeholder="Fizică"
            style={{ padding: '9px 11px', font: `400 13px ${SANS}` }}
          />
        </label>
      </div>
      <div style={{ marginTop: 6, font: `400 11.5px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
        Identificatorul intră în id-ul fiecărui capitol și al fiecărei grile, deci se alege o dată.
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={!poate || inLucru}
        onClick={() => {
          onSalveaza({ id: id.trim(), nume: nume.trim(), position: pozitieUrmatoare, publicat: true });
          setId('');
          setNume('');
        }}
        style={{ marginTop: 12, padding: '9px 15px', font: `600 13px ${SANS}`, opacity: poate ? 1 : 0.5 }}
      >
        Adaugă materia
      </button>
    </div>
  );
}

function CardMaterie({
  materie,
  inLucru,
  onSalveazaMaterie,
  onSalveazaCapitol,
}: {
  materie: Materie;
  inLucru: boolean;
  onSalveazaMaterie: (m: { id: string; nume: string; position: number; publicat: boolean }) => void;
  onSalveazaCapitol: (c: {
    id: string;
    materieId: string;
    nr: string;
    nume: string;
    position: number;
    publicat: boolean;
  }) => void;
}) {
  const [nume, setNume] = useState(materie.name);
  const [capNou, setCapNou] = useState({ id: '', nr: '', nume: '' });

  const poateCapitol = capNou.id.trim() !== '' && capNou.nume.trim() !== '';

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <input
          className="field"
          value={nume}
          onChange={(e) => setNume(e.target.value)}
          aria-label={`Numele materiei ${materie.id}`}
          style={{ flex: 1, minWidth: 160, padding: '8px 11px', font: `500 13.5px ${SANS}` }}
        />
        <span className="tabular" style={{ font: `400 11px ${SANS}`, color: 'var(--fg3)' }}>
          {materie.id}
        </span>
        <button
          type="button"
          className="btn-ghost"
          aria-label={`Salvează numele materiei ${materie.name}`}
          disabled={inLucru || nume.trim() === '' || nume === materie.name}
          onClick={() =>
            onSalveazaMaterie({ id: materie.id, nume: nume.trim(), position: 0, publicat: true })
          }
          style={{ padding: '6px 11px', font: `500 12px ${SANS}` }}
        >
          Salvează
        </button>
      </div>

      {materie.list.map((c) => (
        <RandCapitol key={c.id} capitol={c} inLucru={inLucru} onSalveaza={onSalveazaCapitol} />
      ))}

      <div style={{ padding: '12px 18px', background: 'var(--surf2)', ...autoGrid(120, 8) }}>
        <input
          className="field"
          value={capNou.nr}
          onChange={(e) => setCapNou((p) => ({ ...p, nr: e.target.value }))}
          placeholder="13"
          aria-label={`Numărul capitolului nou din ${materie.name}`}
          style={{ padding: '8px 10px', font: `400 12.5px ${SANS}` }}
        />
        <input
          className="field"
          value={capNou.id}
          onChange={(e) => setCapNou((p) => ({ ...p, id: e.target.value }))}
          placeholder={`${materie.id}-nou`}
          aria-label={`Identificatorul capitolului nou din ${materie.name}`}
          style={{ padding: '8px 10px', font: `400 12.5px ${SANS}` }}
        />
        <input
          className="field"
          value={capNou.nume}
          onChange={(e) => setCapNou((p) => ({ ...p, nume: e.target.value }))}
          placeholder="Numele capitolului"
          aria-label={`Numele capitolului nou din ${materie.name}`}
          style={{ padding: '8px 10px', font: `400 12.5px ${SANS}` }}
        />
        <button
          type="button"
          className="btn-ghost"
          aria-label={`Adaugă un capitol în ${materie.name}`}
          disabled={!poateCapitol || inLucru}
          onClick={() => {
            onSalveazaCapitol({
              id: capNou.id.trim(),
              materieId: materie.id,
              nr: capNou.nr.trim(),
              nume: capNou.nume.trim(),
              position: materie.list.length,
              publicat: true,
            });
            setCapNou({ id: '', nr: '', nume: '' });
          }}
          style={{ padding: '8px 12px', font: `500 12px ${SANS}`, opacity: poateCapitol ? 1 : 0.5 }}
        >
          Adaugă capitolul
        </button>
      </div>
    </div>
  );
}

function RandCapitol({
  capitol,
  inLucru,
  onSalveaza,
}: {
  capitol: Chapter;
  inLucru: boolean;
  onSalveaza: (c: {
    id: string;
    materieId: string;
    nr: string;
    nume: string;
    position: number;
    publicat: boolean;
  }) => void;
}) {
  const [editez, setEditez] = useState(false);
  const [nume, setNume] = useState(capitol.name);
  const [nr, setNr] = useState(capitol.nr);

  if (!editez) {
    return (
      <div
        className="list-row"
        style={{
          padding: '9px 18px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, font: `400 12.5px ${SANS}` }} className="truncate">
          {chapterLabel(capitol)}
        </span>
        <span className="tabular" style={{ font: `400 10.5px ${SANS}`, color: 'var(--fg3)' }}>
          {capitol.id}
        </span>
        <button
          type="button"
          className="btn-quiet"
          onClick={() => setEditez(true)}
          aria-label={`Redenumește ${chapterLabel(capitol)}`}
          style={{ font: `500 12px ${SANS}` }}
        >
          Redenumește
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '9px 18px', borderBottom: '1px solid var(--line)', ...autoGrid(110, 8) }}>
      <input
        className="field"
        value={nr}
        onChange={(e) => setNr(e.target.value)}
        aria-label={`Numărul capitolului ${capitol.id}`}
        style={{ padding: '7px 10px', font: `400 12.5px ${SANS}` }}
      />
      <input
        className="field"
        value={nume}
        onChange={(e) => setNume(e.target.value)}
        aria-label={`Numele capitolului ${capitol.id}`}
        style={{ padding: '7px 10px', font: `400 12.5px ${SANS}` }}
      />
      <button
        type="button"
        className="btn-ghost"
        aria-label={`Salvează capitolul ${capitol.id}`}
        disabled={inLucru || nume.trim() === ''}
        onClick={() => {
          onSalveaza({
            id: capitol.id,
            materieId: capitol.materie,
            nr: nr.trim(),
            nume: nume.trim(),
            position: 0,
            publicat: true,
          });
          setEditez(false);
        }}
        style={{ padding: '7px 11px', font: `500 12px ${SANS}` }}
      >
        Salvează
      </button>
    </div>
  );
}
