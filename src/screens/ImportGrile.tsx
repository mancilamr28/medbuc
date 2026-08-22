import { useMemo, useState } from 'react';
import { Segmented } from '../components/Segmented';
import { salveazaGrila, type GrilaCuStare, type QuestionStatus } from '../lib/continut';
import { descarcaText, ziua } from '../lib/exportDate';
import { numar } from '../lib/text';
import { MONO, SANS, autoGrid, label } from '../lib/ui';
import { useToast } from '../state/toastState';
import { catreJson, citesteImport, frazaRescrieri, importa, type BilantImport } from './importLot';
import { SURSE, type QuestionSursa } from '../data/questions';
import type { Taxonomie } from '../lib/taxonomie';

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
  grile,
  taxonomie,
  reload,
}: {
  grile: GrilaCuStare[];
  taxonomie: Taxonomie;
  reload: () => Promise<void>;
}) {
  const { notify } = useToast();

  const [brut, setBrut] = useState('');
  const [implicit, setImplicit] = useState<QuestionStatus>('ciorna');
  // Proveniența lotului: se scrie o dată, nu pe fiecare din cele cincizeci de rânduri.
  const [sursa, setSursa] = useState<QuestionSursa>('materie');
  const [colectie, setColectie] = useState('');
  const [progres, setProgres] = useState<{ facut: number; total: number } | null>(null);
  const [bilant, setBilant] = useState<BilantImport | null>(null);

  const citire = useMemo(
    () => citesteImport(brut, { status: implicit, sursa, colectie }, grile, taxonomie),
    [brut, implicit, sursa, colectie, grile, taxonomie],
  );

  const valide = citire.randuri.filter((r) => r.grila !== null);
  const cuProbleme = citire.randuri.filter((r) => r.grila === null);
  const rescrise = valide.filter((r) => r.suprascrie);

  const ruleaza = async () => {
    if (progres !== null || valide.length === 0) return;

    setBilant(null);
    setProgres({ facut: 0, total: valide.length });
    const rezultat = await importa(citire.randuri, salveazaGrila, (facut, total) =>
      setProgres({ facut, total }),
    );
    setProgres(null);
    setBilant(rezultat);
    await reload();

    if (rezultat.esecuri.length === 0) {
      notify('succes', `${numar(rezultat.reusite, 'grilă importată', 'grile importate')}.`);
      // Golit doar la reușită deplină: dacă ceva a picat, textul trebuie să
      // rămână ca să poată fi corectat rândul vinovat și lotul reluat.
      setBrut('');
    } else {
      notify('eroare', `${numar(rezultat.esecuri.length, 'grilă n-a intrat', 'grile n-au intrat')}.`);
    }
  };

  const exporta = () => {
    if (grile.length === 0) {
      notify('info', 'Biblioteca e goală, nu e ce exporta.');
      return;
    }
    descarcaText(catreJson(grile), `medbuc-grile-${ziua(new Date())}.json`);
    notify('succes', `${numar(grile.length, 'grilă exportată', 'grile exportate')}.`);
  };

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ font: `600 15px ${SANS}` }}>Import în masă</div>
        <button
          type="button"
          className="btn-ghost"
          onClick={exporta}
          style={{ marginLeft: 'auto', padding: '7px 12px', font: `500 12px ${SANS}` }}
        >
          Exportă biblioteca
        </button>
      </div>

      <p style={{ margin: '8px 0 0', font: `400 12.5px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
        Lipește o listă de grile în JSON. Fiecare trece prin aceleași verificări ca formularul, iar cele cu
        probleme sunt lăsate deoparte — restul lotului intră.
      </p>

      <details style={{ marginTop: 14 }}>
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

      <label style={{ display: 'block', marginTop: 16 }}>
        <span style={label}>Grilele, în JSON</span>
        <textarea
          className="field"
          value={brut}
          onChange={(e) => setBrut(e.target.value)}
          spellCheck={false}
          placeholder={'[\n  { "id": "bio-nervos-07", … }\n]'}
          aria-label="Grilele, în JSON"
          style={{ minHeight: 260, resize: 'vertical', padding: 12, font: `400 12.5px/1.6 ${MONO}` }}
        />
      </label>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          border: '1px solid var(--line)',
          borderRadius: 11,
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ font: `600 12.5px ${SANS}` }}>De unde vine lotul</div>

        <div style={autoGrid(220, 12)}>
          <label style={{ display: 'block' }}>
            <span style={label}>Sursă</span>
            <select
              className="field"
              value={sursa}
              onChange={(e) => setSursa(e.target.value as QuestionSursa)}
              style={{ padding: '11px 12px', font: `400 13.5px ${SANS}`, cursor: 'pointer' }}
            >
              {SURSE.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.eticheta}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'block' }}>
            <span style={label}>Colecția</span>
            <input
              className="field"
              value={colectie}
              onChange={(e) => setColectie(e.target.value)}
              placeholder="ex. Simulare 2026 UMFCD"
              style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
            />
          </label>
        </div>

        <div style={{ font: `400 11.5px/1.6 ${SANS}`, color: 'var(--fg3)' }}>
          Se aplică tuturor grilelor din lot. O grilă care își scrie propria{' '}
          <code>sursa</code> sau <code>colectie</code> și-o păstrează, deci un export al bibliotecii
          se poate relipi întreg fără să fie uniformizat de câmpurile de aici.
        </div>
      </div>

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
          disabled={progres !== null || valide.length === 0}
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
    </div>
  );
}
