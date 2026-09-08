import { useState } from 'react';
import { OPTION_KEYS } from '../data/questions';
import type { Taxonomie } from '../lib/taxonomie';
import type { TipuriGrile } from '../lib/tipuriGrile';
import { scrieJsonPregatit, type JsonPregatit } from './importJson';

const sir = (v: unknown) => typeof v === 'string' ? v : '';
const obiect = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Formulare peste obiectele originale: proveniența și câmpurile avansate rămân intacte. */
export function EditorJsonImport({ pregatit, onChange, taxonomie, tipuri, probleme }: {
  pregatit: JsonPregatit; onChange: (text: string) => void; taxonomie: Taxonomie; tipuri: TipuriGrile;
  probleme: { pozitie: number; probleme: string[] }[];
}) {
  const [pagina, setPagina] = useState(0);
  const [doarProbleme, setDoarProbleme] = useState(false);
  const [randActiv, setRandActiv] = useState<number | null>(null);
  const vizibile = pregatit.grile.map((g, i) => ({ g, i })).filter(({ i }) => !doarProbleme || i === randActiv || probleme.some((p) => p.pozitie === i + 1));
  const pag = Math.min(pagina, Math.max(0, Math.ceil(vizibile.length / 10) - 1));
  const modifica = (index: number, camp: string, valoare: unknown) => onChange(scrieJsonPregatit({ ...pregatit,
    grile: pregatit.grile.map((g, i) => i === index ? { ...g, [camp]: valoare } : g),
  }));
  return <section aria-label="Corectarea grilelor JSON">
    <p className="admin-ajutor">Corectează întrebările în formular. Modificările se păstrează în fișierul pregătit; nu trebuie să editezi cod.</p>
    <label><input type="checkbox" checked={doarProbleme} onChange={(e) => { setDoarProbleme(e.target.checked); setPagina(0); setRandActiv(null); }} /> Arată numai grilele cu probleme</label>
    {vizibile.slice(pag * 10, pag * 10 + 10).map(({ g, i }) => {
      const erori = probleme.find((p) => p.pozitie === i + 1)?.probleme ?? [];
      const optiuni = OPTION_KEYS.map((key) => {
        const brut = g['opts'];
        const v: unknown = Array.isArray(brut) ? brut.find((o: unknown) => Array.isArray(o) ? sir(o[0]).trim().toUpperCase() === key : obiect(o) && sir(o['key']).trim().toUpperCase() === key) : obiect(brut) ? brut[key] : undefined;
        return { key, text: Array.isArray(v) ? sir(v[1]) : obiect(v) ? sir(v['text']) : sir(v),
          why: (Array.isArray(v) ? sir(v[2]) : obiect(v) ? sir(v['why']) : '') || (obiect(g['why']) ? sir(g['why'][key]) : '') };
      });
      const tip = tipuri.tip(sir(g['tip']));
      return <details className="admin-detalii" key={`${sir(g['id'])}-${i}`} onFocusCapture={() => setRandActiv(i)} open={pregatit.grile.length === 1 ? true : undefined}>
        <summary>Grila {i + 1}{erori.length ? ' — de corectat' : ''}: {sir(g['text']).slice(0, 90) || 'Fără enunț'}</summary>
        {erori.length > 0 && <ul style={{ color: 'var(--bad)' }}>{erori.map((e) => <li key={e}>{e}</li>)}</ul>}
        <label>Capitol<select className="field" aria-label={`Grila ${i + 1}: Capitol`} value={sir(g['capId'])} onChange={(e) => modifica(i, 'capId', e.target.value)}>
          <option value="">Alege capitolul…</option>{taxonomie.materii.map((m) => <optgroup key={m.id} label={m.name}>{m.list.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}
        </select></label>
        <label>Format<select className="field" aria-label={`Grila ${i + 1}: Format`} value={sir(g['tip'])} onChange={(e) => modifica(i, 'tip', e.target.value)}>
          <option value="">Alege formatul…</option>{tipuri.lista.map((t) => <option key={t.id} value={t.id}>{t.nume}</option>)}
        </select></label>
        {(['text', 'expl', 'src'] as const).map((camp) => <label key={camp} style={{ display: 'block', marginTop: 10 }}>{({ text: 'Enunț', expl: 'Explicație', src: 'Referință' })[camp]}
          <textarea className="field" aria-label={`Grila ${i + 1}: ${({ text: 'Enunț', expl: 'Explicație', src: 'Referință' })[camp]}`} value={sir(g[camp])} onChange={(e) => modifica(i, camp, e.target.value)} />
        </label>)}
        {tip?.cereEnunturi && Array.from({ length: tip.nrEnunturi ?? 0 }, (_, j) => <label key={j}>Afirmația {j + 1}<textarea className="field" aria-label={`Grila ${i + 1}: Afirmația ${j + 1}`} value={Array.isArray(g['enunturi']) ? sir(g['enunturi'][j]) : ''} onChange={(e) => modifica(i, 'enunturi', Array.from({ length: tip.nrEnunturi ?? 0 }, (_, k) => k === j ? e.target.value : Array.isArray(g['enunturi']) ? sir(g['enunturi'][k]) : ''))} /></label>)}
        {optiuni.map((o, j) => <label key={o.key} style={{ display: 'block', marginTop: 10 }}>Varianta {o.key}<textarea className="field" aria-label={`Grila ${i + 1}: Varianta ${o.key}`} value={o.text} onChange={(e) => modifica(i, 'opts', optiuni.map((v, k) => k === j ? { ...v, text: e.target.value } : v).filter((v) => v.text.trim() || v.why.trim()))} /></label>)}
        <label>Răspuns corect<select className="field" aria-label={`Grila ${i + 1}: Răspuns corect`} value={sir(g['correct']).toUpperCase()} onChange={(e) => modifica(i, 'correct', e.target.value)}>
          <option value="">Alege răspunsul…</option>{OPTION_KEYS.map((k) => <option key={k}>{k}</option>)}
        </select></label>
      </details>;
    })}
    <div className="admin-butoane">
      <button type="button" className="btn-quiet" disabled={pag === 0} onClick={() => setPagina(pag - 1)}>Grilele anterioare</button>
      <span>Pagina {pag + 1} din {Math.max(1, Math.ceil(vizibile.length / 10))}</span>
      <button type="button" className="btn-quiet" disabled={(pag + 1) * 10 >= vizibile.length} onClick={() => setPagina(pag + 1)}>Grilele următoare</button>
    </div>
  </section>;
}
