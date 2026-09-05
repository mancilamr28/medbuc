import { useState } from 'react';
import { FILTRE_GOALE } from '../lib/continut';
import type { Taxonomie } from '../lib/taxonomie';
import type { Colectii } from '../lib/colectii';
import { numar } from '../lib/text';
import { useBibliotecaAdmin } from './adminBiblioteca';

/** Se caută o pagină pe server; nu se descarcă întregul conținut al bibliotecii. */
export function AlegeGrileTest({ alese, onChange, taxonomie, colectii }: {
  alese: string[]; onChange: (ids: string[]) => void; taxonomie: Taxonomie; colectii: Colectii;
}) {
  const [filtre, setFiltre] = useState({ ...FILTRE_GOALE, status: 'publicata' as const });
  const [titluri, setTitluri] = useState<Record<string, string>>({});
  const biblioteca = useBibliotecaAdmin(filtre);
  const muta = (i: number, j: number) => {
    if (j < 0 || j >= alese.length) return;
    const next = [...alese]; [next[i], next[j]] = [next[j]!, next[i]!]; onChange(next);
  };
  return <section>
    <h3>Alege întrebările din bibliotecă</h3>
    <p className="admin-ajutor">Caută după enunț, apoi adaugă întrebările în ordinea dorită. Sunt afișate doar grilele publicate.</p>
    <input className="field" aria-label="Caută grile pentru test" placeholder="Caută după enunț sau cod…" value={filtre.cautare} onChange={(e) => setFiltre({ ...filtre, cautare: e.target.value })} />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
      <select className="field" aria-label="Capitol pentru alegerea grilelor" value={filtre.capitole[0] ?? ''} onChange={(e) => setFiltre({ ...filtre, capitole: e.target.value ? [e.target.value] : [] })}>
        <option value="">Toate capitolele</option>{taxonomie.materii.map((m) => <optgroup key={m.id} label={m.name}>{m.list.map((c) => <option key={c.id} value={c.id}>{c.nr}. {c.name}</option>)}</optgroup>)}
      </select>
      <select className="field" aria-label="Colecție pentru alegerea grilelor" value={filtre.colectieId} onChange={(e) => setFiltre({ ...filtre, colectieId: e.target.value })}>
        <option value="">Toate colecțiile</option>{colectii.lista.map((c) => <option key={c.id} value={c.id}>{c.nume}</option>)}
      </select>
    </div>
    {biblioteca.eroare ? <p role="alert">{biblioteca.eroare} <button className="btn-ghost" onClick={biblioteca.reincarca}>Reîncearcă lista</button></p> : <>
      <p className="admin-ajutor" role="status">{biblioteca.seIncarca ? 'Se caută…' : numar(biblioteca.total, 'grilă găsită', 'grile găsite')}</p>
      <div className="admin-lista-compacta">{biblioteca.randuri.map((g) => <div key={g.id} className="list-row" style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
        <p style={{ margin: '0 0 8px' }}>{g.text}</p>
        <button className="btn-ghost" disabled={alese.includes(g.id) || biblioteca.seIncarca} onClick={() => {
          setTitluri((t) => ({ ...t, [g.id]: g.text })); onChange([...alese, g.id]);
        }}>{alese.includes(g.id) ? 'Adăugată' : 'Adaugă în test'} <span className="tabular">{g.id}</span></button>
      </div>)}</div>
      {biblioteca.pagini > 1 && <div className="admin-butoane">
        <button className="btn-ghost" disabled={biblioteca.pagina === 0 || biblioteca.seIncarca} onClick={() => biblioteca.mergiLaPagina(biblioteca.pagina - 1)}>Pagina anterioară</button>
        <span>{biblioteca.pagina + 1} / {biblioteca.pagini}</span>
        <button className="btn-ghost" disabled={biblioteca.pagina + 1 >= biblioteca.pagini || biblioteca.seIncarca} onClick={() => biblioteca.mergiLaPagina(biblioteca.pagina + 1)}>Pagina următoare</button>
      </div>}
    </>}
    <h3>Ordinea în test · {numar(alese.length, 'grilă aleasă', 'grile alese')}</h3>
    <ol className="admin-lista-compacta">{alese.map((id, i) => <li key={`${id}-${i}`} style={{ padding: 10 }}>
      <p>{titluri[id] ?? biblioteca.randuri.find((g) => g.id === id)?.text ?? id}</p>
      <div className="admin-butoane">
        <button className="btn-ghost" aria-label={`Mută în sus ${id}`} disabled={i === 0} onClick={() => muta(i, i - 1)}>↑ Sus</button>
        <button className="btn-ghost" aria-label={`Mută în jos ${id}`} disabled={i === alese.length - 1} onClick={() => muta(i, i + 1)}>↓ Jos</button>
        <button className="btn-quiet" aria-label={`Scoate din test ${id}`} onClick={() => onChange(alese.filter((_, j) => j !== i))}>Scoate din test</button>
      </div>
    </li>)}</ol>
  </section>;
}
