import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Segmented } from '../components/Segmented';
import { MATERII, chapterLabel, chapterLabelById, materieNameOf, type ChapterId } from '../data/chapters';
import { OPTION_KEYS, tipLabel, type OptionKey, type QuestionType } from '../data/questions';
import { salveazaGrila, stergeGrila, type GrilaCuStare, type QuestionStatus } from '../lib/continut';
import { useIsDesktop } from '../lib/hooks';
import { numar } from '../lib/text';
import { SANS, SERIF, autoGrid, eyebrow, label, pageLead, pageTitle, sideStack, statusChip, twoCol } from '../lib/ui';
import { useAuth } from '../state/authState';
import { useContent } from '../state/contentState';
import { useToast } from '../state/toastState';
import {
  catreSalvare,
  ciornaGoala,
  dinGrila,
  idSugerat,
  valideaza,
  variantScrise,
  type Ciorna,
} from './adminCiorna';
import { ImportGrile } from './ImportGrile';

/** Ce vede un cont fără drepturi de administrare. */
export function AdminBlocat() {
  return (
    <div className="screen" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
      <div
        style={{
          width: 52,
          height: 52,
          margin: '0 auto',
          borderRadius: 15,
          background: 'var(--badS)',
          color: 'var(--bad)',
          display: 'grid',
          placeItems: 'center',
          font: `600 20px ${SANS}`,
        }}
      >
        !
      </div>
      <h1 style={{ margin: '20px 0 0', font: `400 26px/1.2 ${SERIF}` }}>Nu ai acces la această zonă</h1>
      <p style={{ margin: '10px 0 22px', font: `400 14px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
        Panoul de administrare este disponibil doar conturilor cu rol de administrator sau redactor de conținut.
      </p>
    </div>
  );
}

export function Admin() {
  const { role } = useAuth();
  return role === 'admin' ? <AdminPanel /> : <AdminBlocat />;
}

const STARI: { id: QuestionStatus; eticheta: string; culoare: [string, string] }[] = [
  { id: 'ciorna', eticheta: 'Ciornă', culoare: ['var(--surf3)', 'var(--fg3)'] },
  { id: 'publicata', eticheta: 'Publicată', culoare: ['var(--okS)', 'var(--ok)'] },
  { id: 'retrasa', eticheta: 'Retrasă', culoare: ['var(--badS)', 'var(--bad)'] },
];

const stareaLui = (s: QuestionStatus) => STARI.find((x) => x.id === s) ?? STARI[0]!;

/**
 * Administrarea conținutului.
 *
 * Era o machetă: nouă câmpuri necontrolate, o ciornă în `useState` neserializat
 * și două butoane fără handler, sub un mesaj care promitea că „fiecare modificare
 * este înregistrată pe contul tău". Acum scrie în bază, prin `salveaza_grila`.
 *
 * Ciorna nu se ține în `localStorage`: schema are `status = 'ciorna'`, deci locul
 * ei e în bibliotecă, vizibilă doar administratorilor, nu pe un singur dispozitiv.
 */
function AdminPanel() {
  const { grile, loading, error, reload } = useContent();
  const { notify } = useToast();
  const isDesktop = useIsDesktop();

  const [mod, setMod] = useState<'formular' | 'import'>('formular');
  const [ciorna, setCiorna] = useState<Ciorna>(() => ciornaGoala());
  const [editez, setEditez] = useState<string | null>(null);
  const [cautare, setCautare] = useState('');
  const [filtru, setFiltru] = useState<'toate' | QuestionStatus>('toate');
  const [seSalveaza, setSeSalveaza] = useState(false);
  const [deSters, setDeSters] = useState<string | null>(null);
  const [aratatProbleme, setAratatProbleme] = useState(false);

  const probleme = valideaza(ciorna);
  const scrise = variantScrise(ciorna);

  const lista = useMemo(() => {
    const q = cautare.trim().toLowerCase();
    return grile.filter((g) => {
      if (filtru !== 'toate' && g.status !== filtru) return false;
      if (q === '') return true;
      return (
        g.id.toLowerCase().includes(q) ||
        g.text.toLowerCase().includes(q) ||
        chapterLabelById(g.capId).toLowerCase().includes(q)
      );
    });
  }, [cautare, filtru, grile]);

  const camp = <K extends keyof Ciorna>(key: K, value: Ciorna[K]) =>
    setCiorna((prev) => ({ ...prev, [key]: value }));

  const setVarianta = (k: OptionKey, parte: 'text' | 'why', value: string) =>
    setCiorna((prev) => ({ ...prev, opts: { ...prev.opts, [k]: { ...prev.opts[k], [parte]: value } } }));

  const reseteaza = () => {
    setCiorna(ciornaGoala(ciorna.capId));
    setEditez(null);
    setAratatProbleme(false);
  };

  // Lista rămâne vizibilă și în modul de import, deci „Editează" trebuie să
  // aducă înapoi formularul — altfel deschide o ciornă pe care n-o vede nimeni.
  const incarcaPentruEditare = (g: GrilaCuStare) => {
    setCiorna(dinGrila(g));
    setEditez(g.id);
    setAratatProbleme(false);
    setMod('formular');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const salveaza = async (status: QuestionStatus) => {
    if (seSalveaza) return;
    if (probleme.length > 0) {
      setAratatProbleme(true);
      notify('eroare', probleme[0]!);
      return;
    }

    setSeSalveaza(true);
    try {
      await salveazaGrila(catreSalvare(ciorna, status));
      await reload();
      notify('succes', status === 'publicata' ? 'Grila e publicată.' : 'Ciorna a fost salvată.');
      reseteaza();
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut salva grila.');
    } finally {
      setSeSalveaza(false);
    }
  };

  /**
   * Schimbă doar starea unei grile din listă, fără să treacă prin formular.
   *
   * Retragerea e alternativa la ștergere pentru o grilă la care s-a răspuns deja:
   * iese din fața elevilor, dar `attempts` rămâne întreg — pe el se sprijină tot
   * progresul, iar o ștergere ar rescrie retroactiv istoricul cuiva.
   */
  const schimbaStarea = async (g: GrilaCuStare, status: QuestionStatus) => {
    try {
      await salveazaGrila(catreSalvare(dinGrila(g), status));
      await reload();
      notify('info', status === 'retrasa' ? 'Grila a fost retrasă din fața elevilor.' : 'Grila e publicată.');
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut schimba starea grilei.');
    }
  };

  const sterge = async (id: string) => {
    try {
      await stergeGrila(id);
      await reload();
      notify('succes', 'Grila a fost ștearsă.');
      if (editez === id) reseteaza();
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut șterge grila.');
    } finally {
      setDeSters(null);
    }
  };

  return (
    <div className="screen">
      <div
        style={{
          marginBottom: 18,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={pageTitle}>Administrare conținut</h1>
          <p style={pageLead}>Adaugi grile în bibliotecă și decizi ce se publică pentru elevi.</p>
        </div>
        <Segmented
          items={[
            { id: 'formular' as const, label: 'O grilă' },
            { id: 'import' as const, label: 'Import în masă' },
          ]}
          value={mod}
          onChange={setMod}
          ariaLabel="Felul în care scrii grile"
        />
      </div>

      <div style={twoCol(isDesktop)}>
        {mod === 'import' ? (
          <ImportGrile grile={grile} reload={reload} />
        ) : (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ font: `600 15px ${SANS}` }}>{editez ? 'Editezi o grilă' : 'Adaugă o grilă'}</div>
            {editez && (
              <>
                <span className="tabular" style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
                  {editez}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={reseteaza}
                  style={{ marginLeft: 'auto', padding: '7px 12px', font: `500 12px ${SANS}` }}
                >
                  Renunță la editare
                </button>
              </>
            )}
          </div>

          <div style={{ marginTop: 18, ...autoGrid(200, 14) }}>
            <label style={{ display: 'block' }}>
              <span style={label}>Capitol</span>
              <select
                className="field"
                value={ciorna.capId}
                onChange={(e) => camp('capId', e.target.value as ChapterId)}
                style={{ padding: '11px 12px', font: `400 13.5px ${SANS}`, cursor: 'pointer' }}
              >
                {Object.values(MATERII).map((m) => (
                  <optgroup key={m.id} label={m.name}>
                    {m.list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {chapterLabel(c)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>

            <label style={{ display: 'block' }}>
              <span style={label}>Tipul întrebării</span>
              <select
                className="field"
                value={ciorna.tip}
                onChange={(e) => camp('tip', e.target.value as QuestionType)}
                style={{ padding: '11px 12px', font: `400 13.5px ${SANS}`, cursor: 'pointer' }}
              >
                {(['simplu', 'grupat'] as QuestionType[]).map((t) => (
                  <option key={t} value={t}>
                    {tipLabel(t)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block' }}>
              <span style={label}>Identificator</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="field"
                  value={ciorna.id}
                  onChange={(e) => camp('id', e.target.value)}
                  placeholder="bio-nervos-07"
                  disabled={editez !== null}
                  style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
                />
                {editez === null && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => camp('id', idSugerat(ciorna.capId, grile))}
                    style={{ flex: '0 0 auto', padding: '0 12px', font: `500 12px ${SANS}` }}
                  >
                    Sugerează
                  </button>
                )}
              </div>
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 18 }}>
            <span style={label}>Enunțul grilei</span>
            <textarea
              className="field"
              value={ciorna.text}
              onChange={(e) => camp('text', e.target.value)}
              placeholder="Scrie enunțul exact cum apare la examen…"
              style={{ minHeight: 84, resize: 'vertical', padding: 12, font: `400 14px/1.5 ${SANS}` }}
            />
          </label>

          {ciorna.tip === 'grupat' && (
            <div style={{ marginTop: 18 }}>
              <span style={label}>Cele patru afirmații</span>
              <div style={{ display: 'grid', gap: 8 }}>
                {ciorna.enunturi.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      aria-hidden="true"
                      style={{ width: 18, font: `500 12.5px ${SANS}`, color: 'var(--fg3)' }}
                    >
                      {i + 1}.
                    </span>
                    <input
                      className="field"
                      value={e}
                      aria-label={`Afirmația ${i + 1}`}
                      onChange={(ev) => {
                        const next = [...ciorna.enunturi];
                        next[i] = ev.target.value;
                        camp('enunturi', next);
                      }}
                      style={{ padding: '10px 12px', font: `400 13.5px ${SANS}` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <span style={label}>Variantele și explicațiile lor</span>
            <div style={{ display: 'grid', gap: 12 }}>
              {OPTION_KEYS.map((k) => {
                const activa = ciorna.correct === k;
                const completata = ciorna.opts[k].text.trim() !== '';
                return (
                  <div
                    key={k}
                    style={{
                      display: 'grid',
                      gap: 8,
                      padding: 12,
                      border: `1px solid ${activa ? 'var(--ok)' : 'var(--line)'}`,
                      borderRadius: 11,
                      background: activa ? 'var(--okS)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => camp('correct', k)}
                        aria-pressed={activa}
                        aria-label={`Varianta ${k} e răspunsul corect`}
                        disabled={!completata}
                        title={completata ? 'Marchează ca răspuns corect' : 'Scrie întâi varianta'}
                        style={{
                          flex: '0 0 auto',
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          border: `1px solid ${activa ? 'var(--ok)' : 'var(--line)'}`,
                          background: activa ? 'var(--ok)' : 'var(--surf)',
                          color: activa ? 'var(--onBrand)' : 'var(--fg3)',
                          font: `600 13px ${SANS}`,
                          cursor: completata ? 'pointer' : 'not-allowed',
                          opacity: completata ? 1 : 0.5,
                        }}
                      >
                        {k}
                      </button>
                      <input
                        className="field"
                        value={ciorna.opts[k].text}
                        aria-label={`Varianta ${k}`}
                        onChange={(e) => setVarianta(k, 'text', e.target.value)}
                        placeholder={k === 'A' || k === 'B' ? 'Textul variantei' : 'Textul variantei (opțional)'}
                        style={{ padding: '10px 12px', font: `400 13.5px ${SANS}` }}
                      />
                    </div>
                    {completata && (
                      <textarea
                        className="field"
                        value={ciorna.opts[k].why}
                        aria-label={`De ce ${activa ? 'ține' : 'cade'} varianta ${k}`}
                        onChange={(e) => setVarianta(k, 'why', e.target.value)}
                        placeholder={activa ? 'De ce e corectă…' : 'De ce cade varianta asta…'}
                        style={{ minHeight: 52, resize: 'vertical', padding: 10, font: `400 13px/1.5 ${SANS}` }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 8, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
              {/* Explicația per variantă e ce deosebește o bancă de grile de o
                  listă de răspunsuri — cele șase grile scrise au toate treizeci. */}
              Explicația fiecărei variante e opțională tehnic, dar e ce face grila utilă.
            </div>
          </div>

          <label style={{ display: 'block', marginTop: 18 }}>
            <span style={label}>Explicația generală</span>
            <textarea
              className="field"
              value={ciorna.expl}
              onChange={(e) => camp('expl', e.target.value)}
              placeholder="Ideea de fond a grilei, în două-trei fraze…"
              style={{ minHeight: 84, resize: 'vertical', padding: 12, font: `400 14px/1.5 ${SANS}` }}
            />
          </label>

          <label style={{ display: 'block', marginTop: 14 }}>
            <span style={label}>Referință bibliografică</span>
            <input
              className="field"
              value={ciorna.src}
              onChange={(e) => camp('src', e.target.value)}
              placeholder="ex. Biologie, manual clasa a XI-a, cap. Glandele endocrine, p. 84"
              style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
            />
          </label>

          {aratatProbleme && probleme.length > 0 && (
            <ul
              style={{
                margin: '16px 0 0',
                padding: '12px 16px 12px 30px',
                border: '1px solid var(--bad)',
                background: 'var(--badS)',
                borderRadius: 11,
                font: `400 12.5px/1.7 ${SANS}`,
                color: 'var(--fg)',
              }}
            >
              {probleme.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
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
            <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
              {numar(scrise.length, 'variantă scrisă', 'variante scrise')}
            </span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void salveaza('ciorna')}
              disabled={seSalveaza}
              style={{ marginLeft: 'auto', padding: '11px 16px', font: `500 13.5px ${SANS}` }}
            >
              Salvează ca ciornă
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void salveaza('publicata')}
              disabled={seSalveaza}
              style={{ padding: '11px 18px', font: `600 13.5px ${SANS}` }}
            >
              {seSalveaza ? 'Se salvează…' : editez ? 'Salvează și publică' : 'Publică grila'}
            </button>
          </div>
        </div>
        )}

        <div style={sideStack}>
          <div className="card-flat" style={{ padding: 20 }}>
            <div style={eyebrow(undefined, 11)}>Biblioteca de grile</div>
            <div style={{ marginTop: 14, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {STARI.map((s) => (
                <div key={s.id}>
                  <div style={{ font: `500 22px/1 ${SERIF}` }}>
                    {loading ? '—' : grile.filter((g) => g.status === s.id).length}
                  </div>
                  <div style={{ marginTop: 5, font: `400 11.5px/1.4 ${SANS}`, color: 'var(--fg3)' }}>
                    {s.eticheta.toLowerCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)', display: 'grid', gap: 10 }}>
              <input
                className="field"
                value={cautare}
                onChange={(e) => setCautare(e.target.value)}
                placeholder="Caută după enunț, capitol sau id…"
                aria-label="Caută în bibliotecă"
                style={{ padding: '10px 12px', font: `400 13px ${SANS}` }}
              />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['toate', ...STARI.map((s) => s.id)] as const).map((f) => {
                  const activ = filtru === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFiltru(f)}
                      aria-pressed={activ}
                      style={{
                        padding: '6px 11px',
                        border: `1px solid ${activ ? 'var(--brand)' : 'var(--line)'}`,
                        borderRadius: 8,
                        background: activ ? 'var(--brand)' : 'transparent',
                        color: activ ? 'var(--onBrand)' : 'var(--fg2)',
                        font: `500 12px ${SANS}`,
                        cursor: 'pointer',
                      }}
                    >
                      {f === 'toate' ? 'Toate' : stareaLui(f).eticheta}
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <EmptyState
                title={error}
                action={
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => void reload()}
                    style={{ padding: '9px 14px', font: `500 12.5px ${SANS}` }}
                  >
                    Încearcă din nou
                  </button>
                }
              />
            ) : loading ? (
              <div style={{ padding: 22, font: `400 13px ${SANS}`, color: 'var(--fg3)' }}>
                Se încarcă biblioteca…
              </div>
            ) : lista.length === 0 ? (
              <EmptyState
                title={grile.length === 0 ? 'Biblioteca e goală' : 'Nimic pe filtrul ăsta'}
                hint={
                  grile.length === 0
                    ? 'Prima grilă scrisă din formularul de alături apare aici.'
                    : 'Schimbă filtrul sau șterge căutarea.'
                }
              />
            ) : (
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                {lista.map((g) => {
                  const stare = stareaLui(g.status);
                  return (
                    <div
                      key={g.id}
                      className="list-row"
                      style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'grid', gap: 7 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={statusChip(stare.culoare[0], stare.culoare[1])}>{stare.eticheta}</span>
                        <span className="tabular" style={{ font: `400 11px ${SANS}`, color: 'var(--fg3)' }}>
                          {g.id}
                        </span>
                      </div>
                      <div style={{ font: `400 13px/1.45 ${SANS}`, color: 'var(--fg)' }}>
                        {g.text.length > 110 ? `${g.text.slice(0, 110)}…` : g.text}
                      </div>
                      <div style={{ font: `400 11px ${SANS}`, color: 'var(--fg3)' }}>
                        {materieNameOf(g.capId)} · {chapterLabelById(g.capId)}
                      </div>

                      {deSters === g.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ font: `500 12px ${SANS}`, color: 'var(--bad)' }}>Ștergi definitiv?</span>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setDeSters(null)}
                            style={{ padding: '6px 11px', font: `500 12px ${SANS}` }}
                          >
                            Nu
                          </button>
                          <button
                            type="button"
                            onClick={() => void sterge(g.id)}
                            style={{
                              padding: '6px 11px',
                              border: 0,
                              borderRadius: 8,
                              background: 'var(--bad)',
                              color: 'var(--onBrand)',
                              font: `600 12px ${SANS}`,
                              cursor: 'pointer',
                            }}
                          >
                            Da, șterge
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => incarcaPentruEditare(g)}
                            style={{ padding: '6px 11px', font: `500 12px ${SANS}` }}
                          >
                            Editează
                          </button>
                          {g.status !== 'retrasa' && (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => void schimbaStarea(g, 'retrasa')}
                              style={{ padding: '6px 11px', font: `500 12px ${SANS}` }}
                            >
                              Retrage
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeSters(g.id)}
                            style={{
                              padding: '6px 11px',
                              border: '1px solid var(--line)',
                              borderRadius: 8,
                              background: 'transparent',
                              color: 'var(--bad)',
                              font: `500 12px ${SANS}`,
                              cursor: 'pointer',
                            }}
                          >
                            Șterge
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
