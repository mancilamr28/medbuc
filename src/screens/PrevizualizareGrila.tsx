import { useEffect, useId, useState } from 'react';
import { citesteGrilaAdmin, type GrilaCuStare } from '../lib/continut';

/** Citire la cerere, independentă de formularul nesalvat al administratorului. */
export function PrevizualizareGrila({ id }: { id: string }) {
  const [deschis, setDeschis] = useState(false);
  const panouId = useId();
  return <div>
    <button type="button" className="btn-ghost" aria-expanded={deschis} aria-controls={panouId}
      onClick={() => setDeschis(!deschis)}>{deschis ? 'Închide previzualizarea' : 'Previzualizează'}</button>
    <div id={panouId}>{deschis && <ContinutPrevizualizare key={id} id={id} />}</div>
  </div>;
}

function ContinutPrevizualizare({ id }: { id: string }) {
  const [grila, setGrila] = useState<GrilaCuStare | null>(null);
  const [eroare, setEroare] = useState(false);
  const [incercare, setIncercare] = useState(0);
  useEffect(() => {
    let anulat = false;
    setEroare(false);
    void citesteGrilaAdmin(id).then((g) => {
      if (!anulat) setGrila(g);
    }).catch(() => { if (!anulat) setEroare(true); });
    return () => { anulat = true; };
  }, [id, incercare]);
  if (eroare) return <div role="alert">
    <p>Nu am putut deschide grila. Biblioteca și formularul tău nu s-au schimbat.</p>
    <button type="button" className="btn-quiet" onClick={() => setIncercare((i) => i + 1)}>Reîncearcă previzualizarea</button>
  </div>;
  if (!grila) return <p role="status">Se încarcă previzualizarea…</p>;
  return <article aria-label="Previzualizarea grilei" className="admin-previzualizare" style={{ marginTop: 12, overflowWrap: 'anywhere' }}>
    <p style={{ whiteSpace: 'pre-wrap' }}>{grila.text}</p>
    {grila.enunturi && <ol>{grila.enunturi.map((e, i) => <li key={i} style={{ whiteSpace: 'pre-wrap' }}>{e}</li>)}</ol>}
    <ul style={{ listStyle: 'none', padding: 0 }}>{grila.opts.map(([litera, text]) => <li key={litera} style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
      <strong>{litera}.</strong> {text}
      {litera === grila.correct && <strong style={{ display: 'block', color: 'var(--ok)' }}>Răspuns corect</strong>}
      {grila.why[litera] && <p className="admin-ajutor">{grila.why[litera]}</p>}
    </li>)}</ul>
    <h4>Explicație</h4>
    <p style={{ whiteSpace: 'pre-wrap' }}>{grila.expl || 'Fără explicație.'}</p>
    {grila.src && <p className="admin-ajutor" style={{ whiteSpace: 'pre-wrap' }}>Referință: {grila.src}</p>}
    <p className="admin-ajutor">Doar previzualizare — nu modifică și nu publică grila.</p>
  </article>;
}
