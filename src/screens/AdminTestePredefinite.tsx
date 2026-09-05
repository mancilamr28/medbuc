import { AlegeGrileTest } from './AlegeGrileTest';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChapterId, MaterieId } from '../data/chapters';
import type { Colectii } from '../lib/colectii';
import { reportError } from '../lib/sentry';
import {
  citesteTestePredefiniteAdmin,
  salveazaTestPredefinit,
  type ModSelectieTest,
  type NivelAcces,
  type TestPredefinitAdmin,
} from '../lib/testePredefinite';
import type { Taxonomie } from '../lib/taxonomie';
import { numar } from '../lib/text';
import { SANS, autoGrid, eyebrow, label, pageLead, statusChip } from '../lib/ui';
import { useToast } from '../state/toastState';

interface CiornaTest {
  id: string;
  nume: string;
  descriere: string;
  mod: ModSelectieTest;
  colectieId: string;
  durata: string;
  acces: NivelAcces;
  publicat: boolean;
  grile: string;
  cote: Record<string, string>;
  capitole: ChapterId[];
  amestecaGrile: boolean;
  amestecaOptiuni: boolean;
}

const goala = (): CiornaTest => ({
  id: `test-${crypto.randomUUID()}`,
  nume: '',
  descriere: '',
  mod: 'fix',
  colectieId: '',
  durata: '',
  acces: 'liber',
  publicat: false,
  grile: '',
  cote: {},
  capitole: [],
  amestecaGrile: true,
  amestecaOptiuni: false,
});

const idsDin = (text: string): string[] =>
  text
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

const dinTest = (t: TestPredefinitAdmin): CiornaTest => {
  const cote = Object.fromEntries((t.regula.cote ?? []).map((c) => [c.materie_id, String(c.nr)]));
  return {
    id: t.id,
    nume: t.nume,
    descriere: t.descriere,
    mod: t.mod_selectie,
    colectieId: t.colectie_id ?? '',
    durata: t.durata_minute === null ? '' : String(t.durata_minute),
    acces: t.acces,
    publicat: t.publicat,
    grile: t.grile.join('\n'),
    cote,
    capitole: (t.regula.filtre?.capitole ?? []) as ChapterId[],
    amestecaGrile: t.regula.amesteca_grile ?? true,
    amestecaOptiuni: t.regula.amesteca_optiuni ?? false,
  };
};

export function AdminTestePredefinite({
  taxonomie,
  colectii,
}: {
  taxonomie: Taxonomie;
  colectii: Colectii;
}) {
  const { notify } = useToast();
  const [teste, setTeste] = useState<TestPredefinitAdmin[]>([]);
  const [ciorna, setCiorna] = useState<CiornaTest>(goala);
  const [seIncarca, setSeIncarca] = useState(true);
  const [seSalveaza, setSeSalveaza] = useState(false);
  const [deschis, setDeschis] = useState(false);
  const [editez, setEditez] = useState<string | null>(null);

  const reincarca = useCallback(async () => {
    setSeIncarca(true);
    try {
      setTeste(await citesteTestePredefiniteAdmin());
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut încărca testele.');
      reportError(e, 'Administrare: testele predefinite');
    } finally {
      setSeIncarca(false);
    }
  }, [notify]);

  useEffect(() => {
    void reincarca();
  }, [reincarca]);

  const centre = useMemo(
    () => [...new Set(colectii.lista.map((c) => c.centruId).filter((x): x is string => x !== null))],
    [colectii.lista],
  );
  const centruId =
    colectii.colectie(ciorna.colectieId)?.centruId ?? centre[0] ?? '';

  const grile = idsDin(ciorna.grile);
  const cote = taxonomie.materii
    .map((m) => ({ materie_id: m.id as MaterieId, nr: Number(ciorna.cote[m.id] ?? 0) }))
    .filter((c) => Number.isInteger(c.nr) && c.nr > 0);
  const poate =
    ciorna.id.trim() !== '' &&
    ciorna.nume.trim() !== '' &&
    centruId !== '' &&
    (ciorna.mod === 'fix' ? grile.length > 0 : cote.length > 0);

  const camp = <K extends keyof CiornaTest>(key: K, value: CiornaTest[K]) =>
    setCiorna((c) => ({ ...c, [key]: value }));

  const reseteaza = () => {
    setCiorna(goala());
    setEditez(null);
    setDeschis(false);
  };

  const salveaza = async () => {
    if (!poate || seSalveaza) return;
    setSeSalveaza(true);
    try {
      await salveazaTestPredefinit({
        id: ciorna.id.trim(),
        centru_id: centruId,
        colectie_id: ciorna.colectieId || null,
        nume: ciorna.nume.trim(),
        descriere: ciorna.descriere.trim(),
        mod_selectie: ciorna.mod,
        grile: ciorna.mod === 'fix' ? grile : undefined,
        regula:
          ciorna.mod === 'dupa_regula'
            ? {
                cote,
                filtre: { materii: [], capitole: ciorna.capitole },
                amesteca_grile: ciorna.amestecaGrile,
                amesteca_optiuni: ciorna.amestecaOptiuni,
                strict: true,
              }
            : undefined,
        durata_minute: ciorna.durata === '' ? null : Number(ciorna.durata),
        acces: ciorna.acces,
        publicat: ciorna.publicat,
      });
      await reincarca();
      notify('succes', editez ? 'Testul a fost actualizat.' : 'Testul a fost creat.');
      reseteaza();
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut salva testul.');
      reportError(e, 'Administrare: salvarea testului predefinit');
    } finally {
      setSeSalveaza(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <p style={pageLead}>
        Creezi lucrări oficiale cu ordine fixă sau simulări care trag o variantă nouă după reguli.
        O colecție arată proveniența grilelor; un test stabilește întrebările, ordinea și timpul de rezolvare.
      </p>

      <button className="btn-primary" style={{ justifySelf: 'start', padding: '11px 16px' }} onClick={() => setDeschis(!deschis)} aria-expanded={deschis}>{deschis ? 'Ascunde formularul' : 'Creează un test'}</button>
      <div hidden={!deschis} className="card" style={{ padding: 18 }}>
        <fieldset disabled={seSalveaza} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div style={eyebrow(undefined, 11)}>{editez ? 'Editezi testul' : 'Test nou'}</div>
          {editez && (
            <button type="button" className="btn-quiet" onClick={reseteaza} style={{ marginLeft: 'auto' }}>
              Renunță la editare
            </button>
          )}
        </div>

        <div style={{ marginTop: 12, ...autoGrid(180, 12) }}>
          <details className="admin-detalii"><summary>Cod intern al testului (automat)</summary><Camp eticheta="Identificator">
            <input
              className="field"
              aria-label="Identificatorul testului"
              value={ciorna.id}
              disabled={editez !== null}
              onChange={(e) => camp('id', e.target.value)}
              placeholder="admitere-umfcd-2027"
            />
          </Camp></details>
          <Camp eticheta="Nume">
            <input
              className="field"
              aria-label="Numele testului"
              value={ciorna.nume}
              onChange={(e) => camp('nume', e.target.value)}
              placeholder="Admitere UMFCD 2027"
            />
          </Camp>
          <Camp eticheta="Cum se aleg grilele">
            <select
              className="field"
              aria-label="Cum se aleg grilele"
              value={ciorna.mod}
              onChange={(e) => camp('mod', e.target.value as ModSelectieTest)}
            >
              <option value="fix">Listă fixă, în ordinea oficială</option>
              <option value="dupa_regula">Variantă nouă după reguli</option>
            </select>
          </Camp>
          <Camp eticheta="Colecție">
            <select
              className="field"
              aria-label="Colecția testului"
              value={ciorna.colectieId}
              onChange={(e) => camp('colectieId', e.target.value)}
            >
              <option value="">Fără colecție</option>
              {colectii.lista.map((c) => (
                <option key={c.id} value={c.id}>{c.nume}</option>
              ))}
            </select>
          </Camp>
          <Camp eticheta="Durată în minute">
            <input
              className="field"
              aria-label="Durata testului"
              type="number"
              min={1}
              value={ciorna.durata}
              onChange={(e) => camp('durata', e.target.value)}
              placeholder="Fără limită"
            />
          </Camp>
          <Camp eticheta="Acces">
            <select
              className="field"
              aria-label="Accesul la test"
              value={ciorna.acces}
              onChange={(e) => camp('acces', e.target.value as NivelAcces)}
            >
              <option value="liber">Liber</option>
              <option value="premium">Premium</option>
            </select>
          </Camp>
        </div>

        <Camp eticheta="Descriere" sus>
          <textarea
            className="field"
            aria-label="Descrierea testului"
            value={ciorna.descriere}
            onChange={(e) => camp('descriere', e.target.value)}
            style={{ minHeight: 64, resize: 'vertical' }}
          />
        </Camp>

        {ciorna.mod === 'fix' ? (
          <>
          <AlegeGrileTest alese={grile} onChange={(ids) => camp('grile', ids.join('\n'))} taxonomie={taxonomie} colectii={colectii} />
          <details className="admin-detalii"><summary>Introdu codurile manual (avansat)</summary>
          <Camp eticheta="Grilele în ordinea testului" sus>
            <textarea
              className="field tabular"
              aria-label="Grilele în ordinea testului"
              value={ciorna.grile}
              onChange={(e) => camp('grile', e.target.value)}
              placeholder={'bio-nervos-01\nchim-alcooli-01'}
              style={{ minHeight: 150, resize: 'vertical' }}
            />
            <Ajutor>{numar(grile.length, 'grilă în listă', 'grile în listă')}. Un id pe rând; ordinea se păstrează.</Ajutor>
          </Camp></details>
          </>
        ) : (
          <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
            <div>
              <div style={label}>Câte grile din fiecare materie</div>
              <div style={{ marginTop: 8, ...autoGrid(170, 10) }}>
                {taxonomie.materii.map((m) => (
                  <Camp key={m.id} eticheta={m.name}>
                    <input
                      className="field"
                      type="number"
                      min={0}
                      aria-label={`Număr pentru ${m.name}`}
                      value={ciorna.cote[m.id] ?? ''}
                      onChange={(e) => camp('cote', { ...ciorna.cote, [m.id]: e.target.value })}
                      placeholder="0"
                    />
                  </Camp>
                ))}
              </div>
            </div>

            <div>
              <div style={label}>Capitole opționale</div>
              <Ajutor>Dacă nu bifezi nimic, simularea folosește toate capitolele materiilor de mai sus.</Ajutor>
              <div style={{ marginTop: 8, maxHeight: 220, overflow: 'auto', display: 'grid', gap: 5 }}>
                {taxonomie.capitole.map((c) => {
                  const ales = ciorna.capitole.includes(c.id);
                  return (
                    <label key={c.id} className="row-btn" style={{ padding: '7px 9px', borderRadius: 8 }}>
                      <input
                        type="checkbox"
                        checked={ales}
                        onChange={() => camp('capitole', ales ? ciorna.capitole.filter((x) => x !== c.id) : [...ciorna.capitole, c.id])}
                      />{' '}
                      <span style={{ font: `400 12.5px ${SANS}` }}>{taxonomie.numeMaterie(c.id)} · {taxonomie.eticheta(c.id)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Bifa eticheta="Amestecă ordinea grilelor" valoare={ciorna.amestecaGrile} onSchimba={(v) => camp('amestecaGrile', v)} />
            <Bifa eticheta="Amestecă variantele când formatul permite" valoare={ciorna.amestecaOptiuni} onSchimba={(v) => camp('amestecaOptiuni', v)} />
          </div>
        )}

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Bifa eticheta="Publicat pentru elevi" valoare={ciorna.publicat} onSchimba={(v) => camp('publicat', v)} />
          <button
            type="button"
            className="btn-primary"
            disabled={!poate || seSalveaza}
            onClick={() => void salveaza()}
            style={{ marginLeft: 'auto', padding: '10px 16px', opacity: poate ? 1 : 0.5 }}
          >
            {seSalveaza ? 'Se salvează…' : 'Salvează testul'}
          </button>
        </div>
        {centruId === '' && <Ajutor>Adaugă întâi o colecție legată de un centru de admitere.</Ajutor>}
        </fieldset>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {seIncarca ? (
          <div style={{ padding: 18, color: 'var(--fg3)' }}>Se încarcă…</div>
        ) : teste.length === 0 ? (
          <div style={{ padding: 18, color: 'var(--fg3)' }}>Niciun test definit încă.</div>
        ) : (
          teste.map((t) => (
            <div key={t.id} className="list-row" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ font: `600 13.5px ${SANS}` }}>{t.nume}</div>
                <div className="tabular" style={{ marginTop: 3, font: `400 11px ${SANS}`, color: 'var(--fg3)' }}>{t.id}</div>
              </div>
              <span style={statusChip('var(--surf3)', 'var(--fg3)')}>{numar(t.nr_grile, 'grilă', 'grile')}</span>
              <span style={statusChip(t.publicat ? 'var(--okS)' : 'var(--surf3)', t.publicat ? 'var(--ok)' : 'var(--fg3)')}>
                {t.publicat ? 'Publicat' : 'Ciornă'}
              </span>
              <button type="button" className="btn-quiet" onClick={() => { setCiorna(dinTest(t)); setEditez(t.id); setDeschis(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                Editează
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Camp({ eticheta, sus = false, children }: { eticheta: string; sus?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginTop: sus ? 14 : 0 }}>
      <span style={label}>{eticheta}</span>
      {children}
    </label>
  );
}

function Ajutor({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'block', marginTop: 6, font: `400 11.5px/1.5 ${SANS}`, color: 'var(--fg3)' }}>{children}</span>;
}

function Bifa({ eticheta, valoare, onSchimba }: { eticheta: string; valoare: boolean; onSchimba: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: `500 12.5px ${SANS}`, cursor: 'pointer' }}>
      <input type="checkbox" checked={valoare} onChange={(e) => onSchimba(e.target.checked)} />
      {eticheta}
    </label>
  );
}
