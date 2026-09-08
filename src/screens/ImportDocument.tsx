import { useEffect, useState } from 'react';
import type { TipGrila } from '../lib/tipuriGrile';
import { documentCatreTabel, EXEMPLU_DOCUMENT } from './citesteDocument';

/** Textul sursă rămâne disponibil dacă recunoașterea cere o corectură. */
export function ImportDocument({ tip, onPregatit, onModificat }: { tip: TipGrila | undefined; onPregatit: (text: string) => void; onModificat: (modificat: boolean) => void }) {
  const [text, setText] = useState('');
  const [eroare, setEroare] = useState('');
  useEffect(() => {
    if (!text.trim()) return;
    const avertizeaza = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avertizeaza);
    return () => window.removeEventListener('beforeunload', avertizeaza);
  }, [text]);
  return <section aria-label="Întrebări din document">
    <p className="admin-ajutor">Copiază întrebările din Word sau dintr-un PDF cu text selectabil. Fiecare întrebare începe cu „1.”, „2.” etc., iar variantele cu „A.”, „B.” etc., pe rânduri separate. Pentru formatul grupat, scrie „Afirmația 1:” până la „Afirmația 4:”.</p>
    <p className="admin-ajutor">Adaugă „Corect: A” și „Explicație: …” după fiecare întrebare. Dacă lipsesc, le poți completa la verificare. Fotografiile și PDF-urile scanate trebuie transcrise înainte.</p>
    <details className="admin-detalii"><summary>Vezi un exemplu complet</summary><pre style={{ whiteSpace: 'pre-wrap' }}>{EXEMPLU_DOCUMENT}</pre></details>
    <label>Textul întrebărilor<textarea className="field" rows={12} value={text} onChange={(e) => { setText(e.target.value); setEroare(''); onModificat(!!e.target.value.trim()); }} /></label>
    {eroare && <p role="alert" style={{ color: 'var(--bad)' }}>{eroare}</p>}
    <button type="button" className="btn-ghost" disabled={!tip || !text.trim()} onClick={() => {
      try { onPregatit(documentCatreTabel(text, tip!)); setEroare(''); }
      catch (e) { setEroare(e instanceof Error ? e.message : 'Nu am putut citi întrebările.'); }
    }}>Pregătește întrebările pentru verificare</button>
  </section>;
}
