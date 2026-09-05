import { useState } from 'react';
import { celuleDin, scrieCelule } from './importTabel';
import { numar } from '../lib/text';

/** Edităm celulele originale, nu o grilă validată care ar pierde rândurile cu erori. */
export function EditorTabelImport({ text, onChange, probleme = [] }: {
  text: string;
  onChange: (text: string) => void;
  probleme?: { pozitie: number; probleme: string[] }[];
}) {
  const [pagina, setPagina] = useState(0);
  const [doarProbleme, setDoarProbleme] = useState(false);
  const [antet = [], ...randuri] = celuleDin(text);
  const vizibile = randuri.map((celule, i) => ({ celule, i }))
    .filter(({ i }) => !doarProbleme || probleme.some((p) => p.pozitie === i + 1));
  const pag = Math.min(pagina, Math.max(0, Math.ceil(vizibile.length / 10) - 1));
  return <section aria-label="Corectarea tabelului">
    <h3>Corectează direct aici</h3>
    <p className="admin-ajutor">Deschide un rând și modifică celulele. Verificările se actualizează automat. Codurile interne se păstrează și nu trebuie editate.</p>
    <label><input type="checkbox" checked={doarProbleme} onChange={(e) => { setDoarProbleme(e.target.checked); setPagina(0); }} /> Arată numai rândurile cu probleme</label>
    <p>{numar(vizibile.length, 'rând afișat', 'rânduri afișate')}</p>
    {vizibile.slice(pag * 10, pag * 10 + 10).map(({ celule, i }) => {
      const erori = probleme.find((p) => p.pozitie === i + 1)?.probleme ?? [];
      return <details className="admin-detalii" key={i} open={randuri.length === 1 ? true : undefined}>
        <summary>Rândul {i + 1}{erori.length ? ' — de corectat' : ''}: {celule[0]?.slice(0, 90)}</summary>
        {erori.length > 0 && <ul style={{ color: 'var(--bad)' }}>{erori.map((e) => <li key={e}>{e}</li>)}</ul>}
        {antet.map((nume, j) => nume.trim().toLowerCase() === 'cod intern' ? null : <label key={j} style={{ display: 'block', marginTop: 10 }}>
          {nume}<textarea className="field" aria-label={`Rândul ${i + 1}: ${nume}`} value={celule[j] ?? ''}
            onChange={(e) => {
              const noi = randuri.map((r, k) => k === i ? antet.map((_, col) => col === j ? e.target.value : r[col] ?? '') : r);
              onChange(scrieCelule([antet, ...noi]));
            }} />
        </label>)}
      </details>;
    })}
    <div className="admin-butoane" style={{ marginTop: 12 }}>
      <button type="button" className="btn-quiet" disabled={pag === 0} onClick={() => setPagina(pag - 1)}>Rândurile anterioare</button>
      <button type="button" className="btn-quiet" disabled={(pag + 1) * 10 >= vizibile.length} onClick={() => setPagina(pag + 1)}>Rândurile următoare</button>
    </div>
  </section>;
}
