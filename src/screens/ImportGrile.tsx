import { useEffect, useMemo, useState } from 'react';
import { Segmented } from '../components/Segmented';
import {
  exportaGrileAdmin,
  salveazaGrila,
  type GrilaCatalog,
  type QuestionStatus,
} from '../lib/continut';
import { descarcaText, ziua } from '../lib/exportDate';
import { numar } from '../lib/text';
import { MONO, SANS, label } from '../lib/ui';
import { useToast } from '../state/toastState';
import { catreJson, citesteImport, frazaRescrieri, importa, type BilantImport } from './importLot';
import { type QuestionSursa } from '../data/questions';
import type { Taxonomie } from '../lib/taxonomie';
import type { TipuriGrile } from '../lib/tipuriGrile';
import { OrigineGrile } from './OrigineGrile';
import { antetTabel, tabelCatreJson, tabelCuIdentitati, randuriRepetate } from './importTabel';
import type { Colectii } from '../lib/colectii';
import { EditorTabelImport } from './EditorTabelImport';

/** Exemplul din interfață: forma canonică, cu tot ce contează într-o grilă bună. */
const EXEMPLU = `[
  {
    "id": "bio-nervos-07",
    "capId": "bio-nervos",
    "tip": "simplu",
    "text": "Enunțul grilei, exact cum apare la examen:",
    "opts": [["A", "prima variantă"], ["B", "a doua variantă"]],
    "correct": "B",
    "why": { "A": "De ce cade.", "B": "De ce ține." },
    "expl": "Ideea de fond, în două-trei fraze.",
    "src": "Manual clasa a XI-a, cap. Sistemul nervos, p. 84"
  }
]`;

const cifra = (n: number, culoare: string) => (
  <span style={{ font: `600 13px ${SANS}`, color: culoare }}>{n}</span>
);

/**
 * Importul în masă, ca panou.
 *
 * Formularul de alături e bun pentru o grilă și nepractic pentru două sute, iar
 * două sute e ce cere Faza 5 ca să aibă din ce calcula un progres. Toată logica
 * stă în `importLot.ts`, pură și testată; aici rămâne doar interfața — același
 * tipar ca `Admin.tsx` cu `adminCiorna.ts`, din care vine și separarea numelor.
 */
export function ImportGrile({
  catalog,
  taxonomie,
  tipuri,
  colectii,
  reload,
  dupaImport,
  capitolCerut,
}: {
  catalog: GrilaCatalog[];
  taxonomie: Taxonomie;
  tipuri: TipuriGrile;
  colectii: Colectii;
  reload: () => Promise<void>;
  /** Lista din Administrare e o interogare separată; are nevoie de un semnal. */
  dupaImport?: () => void;
  capitolCerut?: { id: string; cerere: number } | null;
}) {
  const { notify } = useToast();

  const [brut, setBrut] = useState('');
  const [format, setFormat] = useState<'tabel' | 'json'>('tabel');
  const [capitol, setCapitol] = useState('');
  const [tipId, setTipId] = useState('simplu');
  const [lotId, setLotId] = useState(() => `lot-${crypto.randomUUID()}`);
  const [confirmat, setConfirmat] = useState(false);
  const [revizuit, setRevizuit] = useState(false);
  const [editezTabel, setEditezTabel] = useState(false);
  const tip = tipuri.tip(tipId);
  const [implicit, setImplicit] = useState<QuestionStatus>('ciorna');
  // Proveniența lotului: se scrie o dată, nu pe fiecare din cele cincizeci de rânduri.
  const [sursa, setSursa] = useState<QuestionSursa>('materie');
  const [colectie, setColectie] = useState('');
  const [progres, setProgres] = useState<{ facut: number; total: number } | null>(null);
  const [bilant, setBilant] = useState<BilantImport | null>(null);
  const [cerereTratata, setCerereTratata] = useState(0);
  const capitolInAsteptare = capitolCerut && capitolCerut.cerere !== cerereTratata ? capitolCerut.id : null;
  useEffect(() => {
    if (!capitolInAsteptare || brut.trim() || progres !== null) return;
    setCapitol(capitolInAsteptare);
    setFormat('tabel');
    setCerereTratata(capitolCerut!.cerere);
  }, [capitolInAsteptare, capitolCerut, brut, progres]);

  useEffect(() => { setConfirmat(false); setRevizuit(false); }, [brut, format, capitol, tipId, sursa, colectie, implicit]);
  useEffect(() => {
    if (!brut.trim()) return;
    const avertizeaza = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avertizeaza);
    return () => window.removeEventListener('beforeunload', avertizeaza);
  }, [brut]);
  const citire = useMemo(
    () => {
      try {
        const json = format === 'json' ? brut : tip ? tabelCatreJson(brut, capitol, tip, lotId) : '';
        return citesteImport(json, { status: implicit, sursa, colectie }, catalog, taxonomie, tipuri);
      } catch (e) { return { randuri: [], eroare: e instanceof Error ? e.message : 'Tabelul nu poate fi citit.' }; }
    },
    [brut, format, capitol, tip, lotId, implicit, sursa, colectie, catalog, taxonomie, tipuri],
  );

  const valide = citire.randuri.filter((r) => r.grila !== null);
  const cuProbleme = citire.randuri.filter((r) => r.grila === null);
  const rescrise = valide.filter((r) => r.suprascrie);
  const repetate = useMemo(() => {
    try { return format === 'tabel' ? randuriRepetate(brut) : []; }
    catch { return []; }
  }, [format, brut]);

  const cereConfirmare = rescrise.length > 0 || cuProbleme.length > 0 || valide.some((r) => r.grila?.status === 'publicata');

  const ruleaza = async () => {
    if (progres !== null || valide.length === 0 || !revizuit || (cereConfirmare && !confirmat)) return;

    setBilant(null);
    setProgres({ facut: 0, total: valide.length });
    const rezultat = await importa(citire.randuri, salveazaGrila, (facut, total) =>
      setProgres({ facut, total }),
    );
    setBilant(rezultat);
    try { await reload(); dupaImport?.(); }
    catch { notify('eroare', 'Importul a fost procesat, dar lista nu s-a reîncărcat. Verifică biblioteca înainte să reîncerci.'); }
    finally { setProgres(null); }
    setRevizuit(false);
    setConfirmat(false);

    if (rezultat.esecuri.length === 0 && cuProbleme.length === 0) {
      notify('succes', `${numar(rezultat.reusite, 'grilă importată', 'grile importate')}.`);
      // Golit doar la reușită deplină: dacă ceva a picat, textul trebuie să
      // rămână ca să poată fi corectat rândul vinovat și lotul reluat.
      setBrut('');
      setEditezTabel(false);
      setLotId(`lot-${crypto.randomUUID()}`);
    } else {
      if (format === 'tabel') setBrut(tabelCuIdentitati(brut, lotId));
      notify('eroare', `${numar(rezultat.esecuri.length + cuProbleme.length, 'grilă n-a intrat', 'grile n-au intrat')}. Lotul a rămas pentru corectare. Păstrează codurile interne la reîncercare.`);
    }
  };

  const exporta = async () => {
    try {
      const grile = await exportaGrileAdmin();
      if (grile.length === 0) {
        notify('info', 'Biblioteca e goală, nu e ce exporta.');
        return;
      }
      descarcaText(catreJson(grile), `medbuc-grile-${ziua(new Date())}.json`);
      notify('succes', `${numar(grile.length, 'grilă exportată', 'grile exportate')}.`);
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut exporta biblioteca.');
    }
  };

  return (
    <div className="card admin-formular" style={{ padding: 22 }}>
      <fieldset disabled={progres !== null} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ font: `600 15px ${SANS}` }}>Import în masă</div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => void exporta()}
          style={{ marginLeft: 'auto', padding: '7px 12px', font: `500 12px ${SANS}` }}
        >
          Exportă biblioteca
        </button>
      </div>

      <p style={{ margin: '8px 0 0', font: `400 12.5px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
        Pregătește un tabel, verifică rezultatul și abia apoi salvează. Nimic nu intră în bibliotecă doar prin lipire.
      </p>

      <h3>1. Alege formatul și conținutul</h3>
      {capitolInAsteptare && brut.trim() && <div role="status" className="admin-previzualizare">
        <p>Ai deja un lot în lucru. Ai ales capitolul „{taxonomie.eticheta(capitolInAsteptare)}”. Textul nu a fost schimbat.</p>
        {format === 'tabel' && <button type="button" className="btn-ghost" onClick={() => {
          setCapitol(capitolInAsteptare); setCerereTratata(capitolCerut!.cerere);
        }}>Aplică acest capitol lotului</button>}
        {format === 'json' && <p>Lotul JSON păstrează capitolele scrise pe fiecare grilă. Pentru un lot nou pe capitol, schimbă formatul după terminarea celui curent.</p>}
        <button type="button" className="btn-quiet" onClick={() => setCerereTratata(capitolCerut!.cerere)}>Păstrează lotul curent</button>
      </div>}
      <Segmented items={[{ id: 'tabel' as const, label: 'Din tabel (Excel)' }, { id: 'json' as const, label: 'JSON (avansat)' }]} value={format} onChange={(f) => {
        if (brut.trim() && !window.confirm('Schimbarea formatului va goli textul lipit. Continui?')) return;
        setBrut(''); setEditezTabel(false); setFormat(f);
      }} ariaLabel="Formatul importului" />
      {format === 'tabel' && <>
        <p className="admin-ajutor">Copiază celulele din Excel sau Google Sheets, inclusiv primul rând cu numele coloanelor. Un lot are același capitol și format de întrebare.</p>
        <label>Capitolul lotului<select className="field" aria-label="Capitolul lotului" value={capitol} onChange={(e) => setCapitol(e.target.value)}>
          <option value="">Alege capitolul…</option>{taxonomie.materii.map((m) => <optgroup key={m.id} label={m.name}>{m.list.map((c) => <option key={c.id} value={c.id}>{c.nr}. {c.name}</option>)}</optgroup>)}
        </select></label>
        <label>Formatul întrebărilor<select className="field" aria-label="Formatul întrebărilor" value={tipId} onChange={(e) => setTipId(e.target.value)}>{tipuri.lista.map((t) => <option key={t.id} value={t.id}>{t.nume}</option>)}</select></label>
        <button className="btn-ghost" style={{ marginTop: 12 }} disabled={!tip} onClick={() => tip && descarcaText(antetTabel(tip) + '\n', 'model-grile.tsv')}>Descarcă modelul pentru tabel</button>
        <p className="admin-ajutor">Deschide modelul în aplicația de tabele. Completează răspunsul corect cu o literă (A–E); codurile interne se creează automat. Un lot nou creează grile noi: pentru corectarea celor deja importate, folosește biblioteca sau exportul JSON.</p>
      </>}
      <details hidden={format !== 'json'} style={{ marginTop: 14 }}>
        <summary style={{ font: `500 12.5px ${SANS}`, color: 'var(--fg2)', cursor: 'pointer' }}>
          Formatul așteptat
        </summary>
        <pre
          style={{
            margin: '10px 0 0',
            padding: 14,
            overflowX: 'auto',
            border: '1px solid var(--line)',
            borderRadius: 11,
            background: 'var(--surf2)',
            font: `400 11.5px/1.6 ${MONO}`,
            color: 'var(--fg2)',
          }}
        >
          {EXEMPLU}
        </pre>
        <ul
          style={{
            margin: '10px 0 0',
            padding: '0 0 0 18px',
            font: `400 12px/1.7 ${SANS}`,
            color: 'var(--fg3)',
          }}
        >
          <li>
            La <code>tip: "grupat"</code> se adaugă <code>enunturi</code> cu exact patru afirmații.
          </li>
          <li>
            Variantele merg și ca <code>{'{ "A": "text" }'}</code>. <code>status</code>, <code>sursa</code> și{' '}
            <code>colectie</code> scrise pe o grilă bat ce e ales mai jos pentru tot lotul.
          </li>
          <li>Un id care există deja rescrie grila, deci același lot se poate corecta și relipi.</li>
        </ul>
      </details>

      <label hidden={editezTabel} style={{ display: 'block', marginTop: 16 }}>
        <span style={label}>{format === 'json' ? 'Grilele, în JSON' : 'Lipește tabelul aici'}</span>
        <textarea
          className="field"
          value={brut}
          onChange={(e) => setBrut(e.target.value)}
          spellCheck={false}
          placeholder={format === 'tabel' && tip ? antetTabel(tip) : '[ … ]'}
          aria-label={format === 'json' ? 'Grilele, în JSON' : 'Lipește tabelul aici'}
          style={{ minHeight: 260, resize: 'vertical', padding: 12, font: `400 12.5px/1.6 ${MONO}` }}
        />
      </label>

      <OrigineGrile sursa={sursa} colectie={colectie} colectii={colectii} onChange={(s, c) => { setSursa(s); setColectie(c); }} />
      <p className="admin-ajutor">Aceste alegeri se aplică rândurilor fără proveniență proprie. În JSON, sursa și colecția scrise pe fiecare grilă se păstrează.</p>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>Grilele fără stare proprie intră ca</span>
        <Segmented
          items={[
            { id: 'ciorna' as QuestionStatus, label: 'Ciorne' },
            { id: 'publicata' as QuestionStatus, label: 'Publicate' },
          ]}
          value={implicit}
          onChange={setImplicit}
          ariaLabel="Starea grilelor importate"
        />
      </div>

      <h3>2. Verifică lotul</h3>
      <p className="admin-ajutor">Verificările apar mai jos. Grilele cu probleme nu se salvează.</p>
      {repetate.length > 0 && <div className="admin-ajutor" role="status">
        <strong>Verifică posibilele duplicate din acest lot.</strong>
        <ul>{repetate.map((r) => <li key={r[0]}>Rândurile {r.join(', ')} au același enunț.</li>)}</ul>
        Răspunsurile pot fi diferite. Nu ștergem nimic automat; această verificare nu caută în biblioteca existentă.
      </div>}
      {format === 'tabel' && !citire.eroare && citire.randuri.length > 0 && <>
        <button type="button" className="btn-ghost" onClick={() => {
          if (!editezTabel) setBrut(tabelCuIdentitati(brut, lotId));
          setEditezTabel(!editezTabel);
        }}>{editezTabel ? 'Înapoi la textul lipit' : 'Corectează tabelul aici'}</button>
        {editezTabel && <EditorTabelImport text={brut} onChange={setBrut} probleme={cuProbleme} />}
      </>}
      {citire.eroare && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding: '12px 14px',
            border: '1px solid var(--bad)',
            background: 'var(--badS)',
            borderRadius: 11,
            font: `400 12.5px/1.6 ${SANS}`,
          }}
        >
          {citire.eroare}
        </div>
      )}

      {citire.randuri.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            border: '1px solid var(--line)',
            borderRadius: 11,
            font: `400 12.5px/1.8 ${SANS}`,
            color: 'var(--fg2)',
          }}
        >
          {cifra(valide.length, 'var(--ok)')} gata de import
          <p>{numar(valide.filter((r) => r.grila?.status === 'publicata').length, 'grilă va fi publicată', 'grile vor fi publicate')} pentru elevi. Restul păstrează starea indicată în lot.</p>
          {cuProbleme.length > 0 && <> · {cifra(cuProbleme.length, 'var(--bad)')} cu probleme</>}
          {rescrise.length > 0 && (
            <> · {cifra(rescrise.length, 'var(--fg2)')} {frazaRescrieri(rescrise.length)}</>
          )}
        </div>
      )}

      {cuProbleme.length > 0 && (
        <div style={{ marginTop: 12, maxHeight: 260, overflowY: 'auto', display: 'grid', gap: 8 }}>
          {cuProbleme.map((r) => (
            <div
              key={r.pozitie}
              style={{
                padding: '10px 13px',
                border: '1px solid var(--bad)',
                background: 'var(--badS)',
                borderRadius: 10,
              }}
            >
              <div className="tabular" style={{ font: `600 11.5px ${SANS}`, color: 'var(--fg)' }}>
                {/* Poziția, nu doar id-ul: când id-ul lipsește sau e stricat,
                    e singurul fel în care autorul găsește rândul în text. */}
                Rândul {r.pozitie}
                {r.id !== '' && ` · ${r.id}`}
              </div>
              <ul style={{ margin: '5px 0 0', padding: '0 0 0 17px', font: `400 12px/1.6 ${SANS}` }}>
                {r.probleme.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {valide.length > 0 && <details className="admin-detalii">
        <summary>Previzualizează grilele pregătite ({valide.length})</summary>
        <div className="admin-lista-compacta">{valide.map((r) => <article key={r.pozitie} className="admin-previzualizare">
          <h4>Rândul {r.pozitie}: {r.grila!.text}</h4>
          <ol>{r.grila!.enunturi?.map((e, i) => <li key={i}>{e}</li>)}</ol>
          <ul>{r.grila!.opts.map((o) => <li key={o.key}>{o.key}. {o.text}{o.key === r.grila!.correct ? ' — corect' : ''}</li>)}</ul>
          <p>{r.grila!.expl}</p>
        </article>)}</div>
      </details>}
      <h3>3. Confirmă și salvează</h3>
      {valide.length > 0 && <label style={{ display: 'block', margin: '12px 0' }}><input type="checkbox" checked={revizuit} onChange={(e) => setRevizuit(e.target.checked)} /> Am verificat întrebările și răspunsurile corecte.</label>}
      {cereConfirmare && <label style={{ display: 'block', margin: '12px 0' }}><input type="checkbox" checked={confirmat} onChange={(e) => setConfirmat(e.target.checked)} /> Confirm modificarea grilelor existente, publicarea și omiterea rândurilor cu probleme, acolo unde sunt anunțate mai sus.</label>}
      {bilant && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            border: `1px solid ${bilant.esecuri.length === 0 ? 'var(--ok)' : 'var(--line)'}`,
            background: bilant.esecuri.length === 0 ? 'var(--okS)' : 'transparent',
            borderRadius: 11,
            font: `400 12.5px/1.7 ${SANS}`,
          }}
        >
          <div style={{ font: `600 12.5px ${SANS}` }}>
            {numar(bilant.reusite, 'grilă a intrat', 'grile au intrat')} în bibliotecă.
          </div>
          {bilant.esecuri.length > 0 && (
            <ul style={{ margin: '6px 0 0', padding: '0 0 0 17px', color: 'var(--fg2)' }}>
              {bilant.esecuri.map((e) => (
                <li key={e.id}>
                  <span className="tabular">{e.id}</span> — {e.mesaj}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          paddingTop: 18,
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {progres && (
          <span className="tabular" style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
            {progres.facut} / {progres.total}
          </span>
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={() => void ruleaza()}
          disabled={progres !== null || valide.length === 0 || !revizuit || (cereConfirmare && !confirmat)}
          style={{
            marginLeft: 'auto',
            padding: '11px 18px',
            font: `600 13.5px ${SANS}`,
            opacity: progres !== null || valide.length === 0 ? 0.5 : 1,
            cursor: progres !== null || valide.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {progres
            ? 'Se importă…'
            : valide.length === 0
              ? 'Importă'
              : `Importă ${numar(valide.length, 'grilă', 'grile')}`}
        </button>
      </div>
      </fieldset>
    </div>
  );
}
