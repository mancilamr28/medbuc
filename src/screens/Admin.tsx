import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Segmented } from '../components/Segmented';
import { chapterLabel, type ChapterId } from '../data/chapters';
import { OPTION_KEYS, type OptionKey, type QuestionType } from '../data/questions';
import {
  FILTRE_GOALE,
  atribuieColectia,
  citesteGrilaAdmin,
  schimbaStareaGrilelor,
  salveazaGrila,
  stergeGrila,
  type FiltreGrile,
  type RezumatGrila,
  type QuestionStatus,
} from '../lib/continut';
import { PE_PAGINA, useBibliotecaAdmin } from './adminBiblioteca';
import { AcoperireCapitole } from './AcoperireCapitole';
import { AdminColectii } from './AdminColectii';
import { AdminTaxonomie } from './AdminTaxonomie';
import { AdminTestePredefinite } from './AdminTestePredefinite';
import { useSectiuneAdmin } from '../lib/router';
import { reportError } from '../lib/sentry';
import { numar } from '../lib/text';
import { SANS, SERIF, autoGrid, eyebrow, label, pageLead, pageTitle, sideStack, statusChip } from '../lib/ui';
import { useAuth } from '../state/authState';
import { useContent } from '../state/contentState';
import { useToast } from '../state/toastState';
import {
  catreSalvare,
  ciornaGoala,
  dinGrila,
  valideaza,
  variantScrise,
  type Ciorna,
} from './adminCiorna';
import { OrigineGrile } from './OrigineGrile';
import { ImportGrile } from './ImportGrile';
import { useCiornaAdmin } from './useCiornaAdmin';
import { PrevizualizareGrila } from './PrevizualizareGrila';

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
  const { role, user } = useAuth();
  return role === 'admin' && user ? <AdminPanel key={user.id} userId={user.id} /> : <AdminBlocat />;
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
 * Formularul incomplet se recuperează local, separat pe cont. Salvarea explicită
 * în bibliotecă rămâne validată de server; recuperarea nu publică nimic.
 */
function AdminPanel({ userId }: { userId: string }) {
  const { catalog, taxonomie, tipuri, colectii, reload, reloadStructura } = useContent();
  const { notify } = useToast();

  const [sectiune, mergiLa] = useSectiuneAdmin();
  const { ciorna, setCiorna, pas, setPas, raspunsAles, setRaspunsAles,
    modificata, setModificata, editez, setEditez } = useCiornaAdmin(userId);
  useEffect(() => {
    if (!modificata) return;
    const avertizeaza = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avertizeaza);
    return () => window.removeEventListener('beforeunload', avertizeaza);
  }, [modificata]);
  const [filtre, setFiltre] = useState<FiltreGrile>(FILTRE_GOALE);
  const biblioteca = useBibliotecaAdmin(filtre);
  const filtruCamp = <K extends keyof FiltreGrile>(key: K, value: FiltreGrile[K]) =>
    setFiltre((prev) => ({ ...prev, [key]: value }));
  const areFiltru = JSON.stringify(filtre) !== JSON.stringify(FILTRE_GOALE);
  const [seSalveaza, setSeSalveaza] = useState(false);
  const [deSters, setDeSters] = useState<string | null>(null);
  const [alese, setAlese] = useState<Set<string>>(() => new Set());
  const [inLucru, setInLucru] = useState(false);
  const [aratatProbleme, setAratatProbleme] = useState(false);
  const [materieFiltrata, setMaterieFiltrata] = useState('');

  const probleme = [...valideaza(ciorna, taxonomie, tipuri), ...(!raspunsAles ? ['Alege explicit răspunsul corect.'] : [])];
  const scrise = variantScrise(ciorna);

  const camp = <K extends keyof Ciorna>(key: K, value: Ciorna[K]) => {
    setModificata(true);
    setCiorna((prev) => ({ ...prev, [key]: value }));
  };

  const setVarianta = (k: OptionKey, parte: 'text' | 'why', value: string) => {
    setModificata(true);
    setCiorna((prev) => ({ ...prev, opts: { ...prev.opts, [k]: { ...prev.opts[k], [parte]: value } } }));
  };

  const reseteaza = () => {
    const tip = tipuri.tip(ciorna.tip);
    setCiorna({ ...ciornaGoala(ciorna.capId), id: `grila-${crypto.randomUUID()}`, sursa: ciorna.sursa, colectie: ciorna.colectie, an: ciorna.an,
      tip: ciorna.tip, enunturi: Array.from({ length: tip?.nrEnunturi ?? 0 }, () => ''),
      opts: Object.fromEntries(OPTION_KEYS.map((k, i) => [k, { text: tip?.sablonOptiuni?.[i] ?? '', why: '' }])) as Ciorna['opts'],
    });
    setPas(0);
    setRaspunsAles(false);
    setModificata(false);
    setEditez(null);
    setAratatProbleme(false);
  };

  // Lista rămâne vizibilă și în modul de import, deci „Editează" trebuie să
  // aducă înapoi formularul — altfel deschide o ciornă pe care n-o vede nimeni.
  const comutaAlegerea = (id: string) =>
    setAlese((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /**
   * Operațiile în masă, pe ce e bifat.
   *
   * Cifra întoarsă e câte rânduri a atins chiar baza, nu câte s-au trimis: dacă
   * o grilă a fost ștearsă între timp, mesajul trebuie să spună adevărul.
   */
  const inMasa = async (ce: () => Promise<number>, frazaReusita: (n: number) => string) => {
    if (inLucru || alese.size === 0) return;
    setInLucru(true);
    try {
      const atinse = await ce();
      await reload();
      biblioteca.reincarca();
      setAlese(new Set());
      notify('succes', frazaReusita(atinse));
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Operația nu a reușit.');
      reportError(e, 'Administrare: operație în masă');
    } finally {
      setInLucru(false);
    }
  };

  const incarcaPentruEditare = async (g: RezumatGrila) => {
    if (seSalveaza) return;
    if (modificata && !window.confirm('Ai o grilă nesalvată. Renunți la ea și deschizi grila aleasă?')) return;
    try {
      const completa = await citesteGrilaAdmin(g.id);
      setCiorna(dinGrila(completa));
      setMaterieFiltrata('');
      setEditez(g.id);
      setPas(1);
      setRaspunsAles(true);
      setModificata(false);
      setAratatProbleme(false);
      mergiLa('adauga');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut deschide grila.');
    }
  };

  const salveaza = async (status: QuestionStatus, continua = false) => {
    if (seSalveaza) return;
    if (probleme.length > 0) {
      setAratatProbleme(true);
      notify('eroare', probleme[0]!);
      return;
    }

    if (!editez && catalog.some((g) => g.id === ciorna.id.trim())) {
      notify('eroare', 'Codul aparține deja unei grile. Deschide grila din bibliotecă pentru editare sau folosește un cod nou.');
      return;
    }
    setSeSalveaza(true);
    try {
      await salveazaGrila(catreSalvare(ciorna, status, tipuri));
      await reload();
      biblioteca.reincarca();
      notify('succes', status === 'publicata' ? 'Grila e publicată.' : 'Ciorna a fost salvată.');
      reseteaza();
      mergiLa(continua ? 'adauga' : 'grile');
      if (continua) setPas(1);
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
  const schimbaStarea = async (g: RezumatGrila, status: QuestionStatus) => {
    try {
      await schimbaStareaGrilelor([g.id], status);
      await reload();
      biblioteca.reincarca();
      notify('info', status === 'retrasa' ? 'Grila a fost retrasă din fața elevilor.' : 'Grila e publicată.');
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut schimba starea grilei.');
    }
  };

  const sterge = async (id: string) => {
    try {
      await stergeGrila(id);
      await reload();
      biblioteca.reincarca();
      notify('succes', 'Grila a fost ștearsă.');
      if (editez === id) reseteaza();
    } catch (e: unknown) {
      notify('eroare', e instanceof Error ? e.message : 'Nu am putut șterge grila.');
    } finally {
      setDeSters(null);
    }
  };

  return (
    <div className="screen admin-panou">
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
            { id: 'grile' as const, label: 'Bibliotecă' },
            { id: 'acoperire' as const, label: 'Acoperirea programei' },
            { id: 'taxonomie' as const, label: 'Materii și capitole' },
            { id: 'colectii' as const, label: 'Surse și colecții' },
            { id: 'teste' as const, label: 'Teste' },
          ]}
          value={sectiune === 'adauga' || sectiune === 'import' ? 'grile' : sectiune}
          onChange={mergiLa}
          ariaLabel="Ce faci în administrare"
        />
      </div>

      <div className="admin-actiuni">
        <div>
          <h2>{sectiune === 'adauga' ? (editez ? 'Editează grila' : 'Adaugă o grilă') : sectiune === 'import' ? 'Importă un lot' : sectiune === 'grile' ? 'Biblioteca ta' : 'Organizează conținutul'}</h2>
          <p>{sectiune === 'grile' ? 'Găsește și editează grilele existente sau adaugă conținut nou.' : 'Modificările ajung la elevi numai după salvare și publicare.'}</p>
        </div>
        <div className="admin-butoane">
          {sectiune !== 'adauga' && <button className="btn-primary" onClick={() => mergiLa('adauga')}>{modificata ? 'Continuă grila nesalvată' : 'Adaugă o grilă'}</button>}
          {sectiune !== 'import' && <button className="btn-ghost" onClick={() => mergiLa('import')}>Importă un lot</button>}
          {(sectiune === 'adauga' || sectiune === 'import') && <button className="btn-quiet" onClick={() => mergiLa('grile')}>Înapoi la bibliotecă</button>}
        </div>
      </div>
      {/* Acoperirea e un ecran întreg, nu o coloană: e o hartă a programei, iar
          lângă ea lista de grile n-ar avea ce adăuga. */}
      {sectiune === 'acoperire' ? (
        <AcoperireCapitole taxonomie={taxonomie} onDeschide={(capitol) => {
          setFiltre({ ...FILTRE_GOALE, capitole: [capitol] });
          mergiLa('grile');
        }} />
      ) : sectiune === 'taxonomie' ? (
        <AdminTaxonomie taxonomie={taxonomie} dupaSalvare={() => void reloadStructura()} />
      ) : sectiune === 'colectii' ? (
        <AdminColectii colectii={colectii} dupaSalvare={() => void reloadStructura()} />
      ) : sectiune === 'teste' ? (
        <AdminTestePredefinite taxonomie={taxonomie} colectii={colectii} />
      ) : (
      <div>
        {sectiune === 'adauga' && (
        <div className="card admin-formular" style={{ padding: 22 }}>
          <fieldset disabled={seSalveaza} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ font: `600 15px ${SANS}` }}>{editez ? 'Editezi o grilă' : 'Adaugă o grilă'}</div>
            {(editez || modificata) && (
              <>
                <span className="tabular" style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
                  {editez}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => { if (!modificata || window.confirm('Renunți la modificările nesalvate ale grilei?')) reseteaza(); }}
                  style={{ marginLeft: 'auto', padding: '7px 12px', font: `500 12px ${SANS}` }}
                >
                  {editez ? 'Renunță la editare' : 'Golește formularul'}
                </button>
              </>
            )}
          </div>

          <nav className="admin-pasi" aria-label="Pașii grilei">
            {['Încadrare și sursă', 'Întrebare și răspuns', 'Verificare și salvare'].map((nume, i) =>
              <button key={nume} type="button" aria-current={pas === i ? 'step' : undefined} onClick={() => setPas(i)}>{i + 1}. {nume}</button>
            )}
          </nav>
          <p className="admin-ajutor">{modificata ? 'Formularul se recuperează în acest browser, pe contul tău, dacă stocarea locală este disponibilă. Nu este încă salvat în bibliotecă și nu apare pe alte dispozitive.' : 'Completează pe rând. La final verifici grila și alegi dacă rămâne ciornă sau devine publică.'}</p>
          {pas === 1 && <p className="admin-ajutor">Lucrezi în: {taxonomie.eticheta(ciorna.capId) || 'Alege capitolul'} · {tipuri.tip(ciorna.tip)?.nume} · {colectii.eticheta(ciorna.colectie) || 'Fără colecție'}. Schimbă încadrarea din pasul 1.</p>}
          <div hidden={pas !== 0}>
          <div style={{ marginTop: 18, ...autoGrid(200, 14) }}>
            <label><span style={label}>Materie</span>
              <select className="field" value={materieFiltrata} onChange={(e) => {
                setMaterieFiltrata(e.target.value);
                if (e.target.value && !taxonomie.materii.find((m) => m.id === e.target.value)?.list.some((c) => c.id === ciorna.capId)) camp('capId', '');
              }}>
                <option value="">Toate materiile</option>
                {taxonomie.materii.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label style={{ display: 'block' }}>
              <span style={label}>Capitol</span>
              <select
                className="field"
                value={ciorna.capId}
                aria-label="Capitol"
                onChange={(e) => camp('capId', e.target.value as ChapterId)}
                style={{ padding: '11px 12px', font: `400 13.5px ${SANS}`, cursor: 'pointer' }}
              >
                <option value="">Alege capitolul…</option>
                {taxonomie.materii.filter((m) => !materieFiltrata || m.id === materieFiltrata).map((m) => (
                  <optgroup key={m.id} label={m.name}>
                    {m.list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {chapterLabel(c)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {!ciorna.capId && <span className="admin-ajutor">Alege materia pentru o listă mai scurtă, apoi capitolul întrebării.</span>}
            </label>

            <label style={{ display: 'block' }}>
              <span style={label}>Tipul întrebării</span>
              <select
                className="field"
                value={ciorna.tip}
                onChange={(e) => {
                  const tip = tipuri.tip(e.target.value);
                  if (scrise.length > 0 && !window.confirm('Schimbarea formatului va reseta variantele și răspunsul corect. Continui?')) return;
                  setModificata(true);
                  setRaspunsAles(false);
                  setCiorna((c) => ({ ...c, tip: e.target.value as QuestionType,
                    enunturi: Array.from({ length: tip?.nrEnunturi ?? 0 }, (_, i) => c.enunturi[i] ?? ''),
                    opts: Object.fromEntries(OPTION_KEYS.map((k, i) => [k, { text: tip?.sablonOptiuni?.[i] ?? '', why: '' }])) as Ciorna['opts'],
                  }));
                }}
                style={{ padding: '11px 12px', font: `400 13.5px ${SANS}`, cursor: 'pointer' }}
              >
                {tipuri.lista.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nume}
                  </option>
                ))}
              </select>
            </label>

          </div>
          <OrigineGrile sursa={ciorna.sursa} colectie={ciorna.colectie} colectii={colectii} onChange={(sursa, colectie, an) => {
            setModificata(true);
            setCiorna((c) => ({ ...c, sursa, colectie, an: an === undefined ? c.an : an === null ? '' : String(an) }));
          }} />
          <div>
            {ciorna.sursa === 'subiect_oficial' && (
              <label style={{ display: 'block' }}>
                <span style={label}>Anul subiectului</span>
                <input
                  className="field"
                  value={ciorna.an}
                  onChange={(e) => camp('an', e.target.value)}
                  placeholder="2026"
                  inputMode="numeric"
                  style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
                />
              </label>
            )}
          </div>

          <label style={{ display: 'block', marginTop: 14 }}>
            <span style={label}>Referință / pagină (opțional)</span>
            <input
              className="field"
              value={ciorna.src}
              onChange={(e) => camp('src', e.target.value)}
              placeholder="ex. Biologie, manual clasa a XI-a, cap. Glandele endocrine, p. 84"
              style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
            />
          </label>

          <details className="admin-detalii">
            <summary>Cod intern (completat automat)</summary>
            <label><span style={label}>Identificator</span><input className="field" value={ciorna.id} disabled={editez !== null}
              placeholder="bio-nervos-07" onChange={(e) => camp('id', e.target.value)} /></label>
            <p className="admin-ajutor">Nu trebuie schimbat. Acest cod identifică grila, nu apare ca titlu pentru elevi.</p>
          </details>

          </div>
          <div hidden={pas !== 1}>
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

          {tipuri.tip(ciorna.tip)?.cereEnunturi && (
            <div style={{ marginTop: 18 }}>
              <span style={label}>Afirmațiile întrebării</span>
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
            <span style={label}>Variantele de răspuns</span>
            <p className="admin-ajutor">{tipuri.tip(ciorna.tip)?.sablonOptiuni ? 'Cheia de răspuns este completată automat și nu se editează. Apasă litera combinației corecte.' : 'Scrie variantele, apoi apasă litera răspunsului corect. Verde înseamnă corect.'}</p>
            <div style={{ display: 'grid', gap: 12 }}>
              {OPTION_KEYS.map((k) => {
                const activa = raspunsAles && ciorna.correct === k;
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
                        onClick={() => { camp('correct', k); setRaspunsAles(true); }}
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
                        readOnly={tipuri.tip(ciorna.tip)?.sablonOptiuni != null}
                        onChange={(e) => setVarianta(k, 'text', e.target.value)}
                        placeholder={k === 'A' || k === 'B' ? 'Textul variantei' : 'Textul variantei (opțional)'}
                        style={{ padding: '10px 12px', font: `400 13.5px ${SANS}` }}
                      />
                    </div>
                    {completata && (
                      <details className="admin-detalii"><summary>Explicația variantei {k} (opțional)</summary><textarea
                        className="field"
                        value={ciorna.opts[k].why}
                        aria-label={`De ce ${activa ? 'ține' : 'cade'} varianta ${k}`}
                        onChange={(e) => setVarianta(k, 'why', e.target.value)}
                        placeholder={activa ? 'De ce e corectă…' : 'De ce cade varianta asta…'}
                        style={{ minHeight: 52, resize: 'vertical', padding: 10, font: `400 13px/1.5 ${SANS}` }}
                      /></details>
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

          </div>
          <div hidden={pas !== 2}>
            <h3>Verifică înainte de salvare</h3>
            <p className="admin-ajutor">{taxonomie.eticheta(ciorna.capId)} · {tipuri.tip(ciorna.tip)?.nume} · {colectii.eticheta(ciorna.colectie) || 'Fără colecție'}</p>
            <p style={{ whiteSpace: 'pre-wrap' }}>{ciorna.text || 'Enunțul nu este încă scris.'}</p>
            {tipuri.tip(ciorna.tip)?.cereEnunturi && <ol>{ciorna.enunturi.map((e, i) => <li key={i}>{e}</li>)}</ol>}
            <ul className="admin-previzualizare">{scrise.map((k) => <li key={k}><strong>{k}.</strong> {ciorna.opts[k].text} {raspunsAles && ciorna.correct === k && <strong> — răspuns corect</strong>}{ciorna.opts[k].why && <p className="admin-ajutor">{ciorna.opts[k].why}</p>}</li>)}</ul>
            <p style={{ whiteSpace: 'pre-wrap' }}>{ciorna.expl}</p>
            {ciorna.src && <p className="admin-ajutor">Referință: {ciorna.src}</p>}
            <p className="admin-ajutor">Ciorna este vizibilă doar administratorilor. Publicarea face grila disponibilă elevilor eligibili.</p>
          {(aratatProbleme || pas === 2) && probleme.length > 0 && (
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
            <button type="button" className="btn-ghost" disabled={seSalveaza}
              onClick={() => void salveaza('ciorna', true)}>Salvează ciorna și adaugă alta</button>
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
          <div className="admin-butoane" style={{ marginTop: 18 }}>
            {pas > 0 && <button className="btn-ghost" onClick={() => setPas(pas - 1)}>Pasul anterior</button>}
            {pas < 2 && <button className="btn-primary" onClick={() => setPas(pas + 1)}>Continuă</button>}
          </div>
          </fieldset>
        </div>
        )}

        {sectiune === 'grile' && <div style={sideStack}>
          <div className="card-flat" style={{ padding: 20 }}>
            <div style={eyebrow(undefined, 11)}>Biblioteca de grile</div>
            <div style={{ marginTop: 14, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {STARI.map((s) => (
                <div key={s.id}>
                  <div style={{ font: `500 22px/1 ${SERIF}` }}>
                    {biblioteca.contoare ? biblioteca.contoare[s.id] : '—'}
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
                value={filtre.cautare}
                onChange={(e) => filtruCamp('cautare', e.target.value)}
                placeholder="Caută după enunț sau id…"
                aria-label="Caută în bibliotecă"
                style={{ padding: '10px 12px', font: `400 13px ${SANS}` }}
              />
              {/* Filtrele fine: capitol, colecție, tip. Se trimit toate în aceeași
                  interogare, deci nu costă un drum în plus. Materia n-are filtru
                  propriu — capitolele sunt deja grupate pe materie în listă. */}
              <div style={autoGrid(150, 8)}>
                <select
                  className="field"
                  value={filtre.capitole[0] ?? ''}
                  onChange={(e) => filtruCamp('capitole', e.target.value === '' ? [] : [e.target.value])}
                  aria-label="Filtrează după capitol"
                  style={{ padding: '8px 10px', font: `400 12px ${SANS}`, cursor: 'pointer' }}
                >
                  <option value="">Toate capitolele</option>
                  {taxonomie.materii.map((m) => (
                    <optgroup key={m.id} label={m.name}>
                      {m.list.map((c) => (
                        <option key={c.id} value={c.id}>
                          {chapterLabel(c)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <select
                  className="field"
                  value={filtre.colectieId}
                  onChange={(e) => filtruCamp('colectieId', e.target.value)}
                  aria-label="Filtrează după colecție"
                  style={{ padding: '8px 10px', font: `400 12px ${SANS}`, cursor: 'pointer' }}
                >
                  <option value="">Toate colecțiile</option>
                  {colectii.lista.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nume}
                    </option>
                  ))}
                </select>

                <select
                  className="field"
                  value={filtre.tipId}
                  onChange={(e) => filtruCamp('tipId', e.target.value)}
                  aria-label="Filtrează după tip"
                  style={{ padding: '8px 10px', font: `400 12px ${SANS}`, cursor: 'pointer' }}
                >
                  <option value="">Toate tipurile</option>
                  {tipuri.lista.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nume}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {(['toate', ...STARI.map((s) => s.id)] as const).map((f) => {
                  const activ = filtre.status === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => filtruCamp('status', f)}
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
                {areFiltru && (
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => setFiltre(FILTRE_GOALE)}
                    style={{ marginLeft: 'auto', font: `500 12px ${SANS}` }}
                  >
                    Șterge filtrele
                  </button>
                )}
              </div>
            </div>

            {alese.size > 0 && (
              <div
                style={{
                  padding: '10px 18px',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--brandS)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ font: `500 12px ${SANS}` }}>
                  {numar(alese.size, 'grilă aleasă', 'grile alese')}
                </span>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={inLucru}
                  onClick={() =>
                    void inMasa(
                      () => schimbaStareaGrilelor([...alese], 'publicata'),
                      (n) => `${numar(n, 'grilă publicată', 'grile publicate')}.`,
                    )
                  }
                  style={{ padding: '6px 11px', font: `500 12px ${SANS}` }}
                >
                  Publică
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={inLucru}
                  onClick={() =>
                    void inMasa(
                      () => schimbaStareaGrilelor([...alese], 'retrasa'),
                      (n) => `${numar(n, 'grilă retrasă', 'grile retrase')}.`,
                    )
                  }
                  style={{ padding: '6px 11px', font: `500 12px ${SANS}` }}
                >
                  Retrage
                </button>
                <select
                  className="field"
                  value=""
                  disabled={inLucru}
                  onChange={(e) => {
                    const ales = e.target.value;
                    if (ales === '') return;
                    void inMasa(
                      () => atribuieColectia([...alese], ales === 'fara' ? null : ales),
                      (n) => `${numar(n, 'grilă mutată', 'grile mutate')}.`,
                    );
                  }}
                  aria-label="Atribuie o colecție grilelor alese"
                  style={{ padding: '6px 9px', font: `400 12px ${SANS}`, cursor: 'pointer' }}
                >
                  <option value="">Atribuie o colecție…</option>
                  <option value="fara">— scoate colecția —</option>
                  {colectii.lista.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nume}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-quiet"
                  onClick={() => setAlese(new Set())}
                  style={{ marginLeft: 'auto', font: `500 12px ${SANS}` }}
                >
                  Deselectează
                </button>
              </div>
            )}

            {biblioteca.eroare ? (
              <EmptyState
                title={biblioteca.eroare}
                action={
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={biblioteca.reincarca}
                    style={{ padding: '9px 14px', font: `500 12.5px ${SANS}` }}
                  >
                    Încearcă din nou
                  </button>
                }
              />
            ) : biblioteca.seIncarca && biblioteca.randuri.length === 0 ? (
              <div style={{ padding: 22, font: `400 13px ${SANS}`, color: 'var(--fg3)' }}>
                Se caută în bibliotecă…
              </div>
            ) : biblioteca.total === 0 ? (
              <EmptyState
                title={areFiltru ? 'Nimic pe filtrul ăsta' : 'Biblioteca e goală'}
                hint={
                  areFiltru
                    ? 'Schimbă filtrul sau șterge căutarea.'
                    : 'Folosește „Adaugă o grilă” sau „Importă un lot” pentru a începe.'
                }
              />
            ) : (
              <div style={{ opacity: biblioteca.seIncarca ? 0.55 : 1, transition: 'opacity .12s' }}>
                {biblioteca.randuri.map((g) => {
                  const stare = stareaLui(g.status);
                  return (
                    <div
                      key={g.id}
                      className="list-row"
                      style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'grid', gap: 7 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          type="checkbox"
                          checked={alese.has(g.id)}
                          onChange={() => comutaAlegerea(g.id)}
                          aria-label={`Alege ${g.id}`}
                          style={{ width: 15, height: 15, accentColor: 'var(--brand)', cursor: 'pointer' }}
                        />
                        <span style={statusChip(stare.culoare[0], stare.culoare[1])}>{stare.eticheta}</span>
                        <span className="admin-ajutor">{tipuri.tip(g.tip)?.nume}</span>
                      </div>
                      <div style={{ font: `500 14px/1.55 ${SANS}`, color: 'var(--fg)', overflowWrap: 'anywhere' }}>
                        {g.text.length > 240 ? `${g.text.slice(0, 240)}…` : g.text}
                      </div>
                      <div style={{ font: `400 11px ${SANS}`, color: 'var(--fg3)' }}>
                        {taxonomie.numeMaterie(g.capId)} · {taxonomie.eticheta(g.capId)}
                        {g.colectieId !== '' && <> · {colectii.eticheta(g.colectieId)}</>}
                      </div>
                      <PrevizualizareGrila id={g.id} />
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
                            onClick={() => void incarcaPentruEditare(g)}
                            style={{ padding: '6px 11px', font: `500 12px ${SANS}` }}
                          >
                            Editează
                          </button>
                          <details className="admin-detalii" style={{ margin: 0 }}><summary>Mai multe acțiuni</summary>
                          <p className="admin-ajutor">Cod intern: <span className="tabular">{g.id}</span></p>
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
                          </details>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {biblioteca.total > PE_PAGINA && (
              <div
                style={{
                  padding: '12px 18px',
                  borderTop: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span className="tabular" style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
                  {biblioteca.pagina * PE_PAGINA + 1}–
                  {Math.min((biblioteca.pagina + 1) * PE_PAGINA, biblioteca.total)} din{' '}
                  {numar(biblioteca.total, 'grilă', 'grile')}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => biblioteca.mergiLaPagina(biblioteca.pagina - 1)}
                    disabled={biblioteca.pagina === 0}
                    style={{ padding: '6px 11px', font: `500 12px ${SANS}`, opacity: biblioteca.pagina === 0 ? 0.45 : 1 }}
                  >
                    ← Înapoi
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => biblioteca.mergiLaPagina(biblioteca.pagina + 1)}
                    disabled={biblioteca.pagina >= biblioteca.pagini - 1}
                    style={{
                      padding: '6px 11px',
                      font: `500 12px ${SANS}`,
                      opacity: biblioteca.pagina >= biblioteca.pagini - 1 ? 0.45 : 1,
                    }}
                  >
                    Înainte →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>}
      </div>
      )}
      <div hidden={sectiune !== 'import'}>
        <ImportGrile catalog={catalog} taxonomie={taxonomie} tipuri={tipuri} colectii={colectii} reload={reload} dupaImport={biblioteca.reincarca} />
      </div>
    </div>
  );
}
