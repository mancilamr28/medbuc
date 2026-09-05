import { useState } from 'react';
import { SURSE, type QuestionSursa } from '../data/questions';
import { salveazaColectie } from '../lib/continut';
import type { Colectii } from '../lib/colectii';
import { useContent } from '../state/contentState';
import { useToast } from '../state/toastState';
import { FormularColectie } from './AdminColectii';

/** Aceleași alegeri și aceeași creare de sursă la scriere și la import. */
export function OrigineGrile({ sursa, colectie, colectii, onChange }: {
  sursa: QuestionSursa; colectie: string; colectii: Colectii;
  onChange: (sursa: QuestionSursa, colectie: string, an?: number | null) => void;
}) {
  const { reloadStructura } = useContent();
  const { notify } = useToast();
  const [creez, setCreez] = useState(false);
  const [inLucru, setInLucru] = useState(false);
  return <section>
    <h3>De unde vine conținutul?</h3>
    <p className="admin-ajutor">Tipul este categoria generală. Colecția este cartea sau examenul concret, de exemplu „Corint – Sistemul nervos” sau „Simulare 2026 UMFCD”.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
      <label>Tip de conținut<select className="field" aria-label="Tip de conținut" value={sursa} onChange={(e) => onChange(e.target.value as QuestionSursa, colectie)}>
        {SURSE.map((s) => <option key={s.id} value={s.id}>{s.eticheta}</option>)}
      </select></label>
      <label>Origine / colecție<select className="field" aria-label="Origine / colecție" value={colectie} onChange={(e) => {
        const c = colectii.colectie(e.target.value);
        const tip = c ? (c.tip === 'culegere' ? 'culegere' : c.tip === 'autor' ? 'materie' : 'subiect_oficial') : sursa;
        onChange(tip, e.target.value, c?.an);
      }}>
        <option value="">Fără colecție</option>
        {colectii.lista.map((c) => <option key={c.id} value={c.id}>{c.nume}</option>)}
      </select></label>
    </div>
    <button type="button" className="btn-quiet" style={{ marginTop: 12 }} aria-expanded={creez} onClick={() => setCreez(!creez)}>Creează o colecție aici</button>
    {creez && <FormularColectie inLucru={inLucru} onSalveaza={async (c) => {
      setInLucru(true);
      try {
        await salveazaColectie(c);
        await reloadStructura();
        onChange(c.tip === 'culegere' ? 'culegere' : c.tip === 'autor' ? 'materie' : 'subiect_oficial', c.id, c.an);
        setCreez(false);
        notify('succes', 'Colecția a fost creată și selectată.');
        return true;
      } catch (e) {
        notify('eroare', e instanceof Error ? e.message : 'Colecția nu a fost salvată. Datele au rămas în formular.');
        return false;
      } finally { setInLucru(false); }
    }} />}
  </section>;
}
