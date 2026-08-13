import { Segmented } from '../components/Segmented';
import { Switch } from '../components/Switch';
import { EmptyState } from '../components/EmptyState';
import { MATERII, MATERIE_BY_NAME, chapterLabel } from '../data/chapters';
import { OPTION_KEYS, QUESTIONS, type OptionKey } from '../data/questions';
import { useIsDesktop } from '../lib/hooks';
import { SANS, SERIF, autoGrid, eyebrow, label, pageLead, pageTitle, sideStack, twoCol } from '../lib/ui';
import { useApp, type AdminDraft, type Role } from '../state/AppState';

const ROLE_TABS: { id: Role; label: string }[] = [
  { id: 'elev', label: 'Elev' },
  { id: 'admin', label: 'Administrator' },
];

function RoleSwitcher() {
  const { role, setRole } = useApp();
  return <Segmented items={ROLE_TABS} value={role} onChange={setRole} ariaLabel="Rolul cu care vizualizezi" />;
}

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
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <RoleSwitcher />
      </div>
    </div>
  );
}

export function Admin() {
  const { role } = useApp();
  return role === 'admin' ? <AdminPanel /> : <AdminBlocat />;
}

function AdminPanel() {
  const { admin, setAdmin } = useApp();
  const isDesktop = useIsDesktop();

  const materieId = MATERIE_BY_NAME[admin.materie] ?? 'bio';

  const fields: { key: keyof AdminDraft; label: string; options: string[] }[] = [
    { key: 'materie', label: 'Materie', options: ['Biologie', 'Chimie organică', 'Subiecte anterioare'] },
    { key: 'capitol', label: 'Capitol', options: MATERII[materieId].list.map(chapterLabel) },
    { key: 'tip', label: 'Tipul întrebării', options: ['Complement simplu', 'Complement grupat', 'Flashcard'] },
    { key: 'dificultate', label: 'Dificultate', options: ['Ușoară', 'Medie', 'Dificilă'] },
    {
      key: 'sursa',
      label: 'Sursa grilei',
      options: ['Redactată intern', 'Admitere UMFCD', 'Simulare oficială', 'Manual clasa a XI-a', 'Manual clasa a X-a'],
    },
    { key: 'an', label: 'An bibliografie', options: ['2027', '2026', '2025', '2024', '2023'] },
  ];

  return (
    <div className="screen">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 8,
        }}
      >
        <div>
          <h1 style={pageTitle}>Administrare conținut</h1>
          <p style={pageLead}>Adaugi grile în bibliotecă și decizi ce se publică pentru elevi.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>Vizualizezi ca</span>
          <RoleSwitcher />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          border: '1px solid var(--acc)',
          background: 'var(--accS)',
          borderRadius: 11,
          margin: '14px 0 20px',
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--acc)', flex: '0 0 auto' }}
        />
        <span style={{ font: `500 13px/1.4 ${SANS}`, color: 'var(--fg)' }}>
          Zonă restricționată. Formularul nu salvează încă nimic — grilele se scriu deocamdată direct în cod.
        </span>
      </div>

      <div style={twoCol(isDesktop)}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ font: `600 15px ${SANS}` }}>Adaugă o grilă</div>

          <div style={{ marginTop: 18, ...autoGrid(200, 14) }}>
            {fields.map((f) => (
              <label key={f.key} style={{ display: 'block' }}>
                <span style={label}>{f.label}</span>
                <select
                  className="field"
                  value={String(admin[f.key])}
                  onChange={(e) => setAdmin(f.key, e.target.value as never)}
                  style={{ padding: '11px 12px', font: `400 13.5px ${SANS}`, cursor: 'pointer' }}
                >
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <label style={{ display: 'block', marginTop: 18 }}>
            <span style={label}>Enunțul grilei</span>
            <textarea
              className="field"
              placeholder="Scrie enunțul exact cum apare la examen…"
              style={{ minHeight: 84, resize: 'vertical', padding: 12, font: `400 14px/1.5 ${SANS}` }}
            />
          </label>

          {admin.tip === 'Complement grupat' && <Grupat />}
          {admin.tip === 'Complement simplu' && <Simplu />}
          {admin.tip === 'Flashcard' && <Flashcard />}

          <label style={{ display: 'block', marginTop: 18 }}>
            <span style={label}>Explicația generală</span>
            <textarea
              className="field"
              placeholder="Ideea de fond a grilei, în două-trei fraze…"
              style={{ minHeight: 84, resize: 'vertical', padding: 12, font: `400 14px/1.5 ${SANS}` }}
            />
          </label>

          <label style={{ display: 'block', marginTop: 14 }}>
            <span style={label}>Referință bibliografică</span>
            <input
              className="field"
              placeholder="ex. Biologie, manual clasa a XI-a, cap. Glandele endocrine, p. 84"
              style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
            />
          </label>

          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ width: 'auto' }}>
              <Switch on={admin.publica} onToggle={() => setAdmin('publica', !admin.publica)}>
                <span style={{ font: `400 13px ${SANS}`, color: 'var(--fg2)', whiteSpace: 'nowrap' }}>
                  Publică imediat, fără verificare
                </span>
              </Switch>
            </div>
            <button
              type="button"
              className="btn-ghost"
              style={{ marginLeft: 'auto', padding: '11px 16px', font: `500 13.5px ${SANS}` }}
            >
              Salvează ca ciornă
            </button>
            <button type="button" className="btn-primary" style={{ padding: '11px 18px', font: `600 13.5px ${SANS}` }}>
              Adaugă grila
            </button>
          </div>
        </div>

        <div style={sideStack}>
          {/* Statisticile arătau „2 220 publicate, 37 în așteptare, 6 raportate".
              Singura cifră care se poate demonstra e câte grile există. */}
          <div className="card-flat" style={{ padding: 20 }}>
            <div style={eyebrow(undefined, 11)}>Biblioteca de grile</div>
            <div style={{ marginTop: 14 }}>
              <div style={{ font: `500 22px/1 ${SERIF}` }}>{QUESTIONS.length}</div>
              <div style={{ marginTop: 5, font: `400 11.5px/1.4 ${SANS}`, color: 'var(--fg3)' }}>
                grile scrise în bibliotecă
              </div>
            </div>
          </div>

          <div className="card-flat" style={{ padding: 20 }}>
            <span style={eyebrow(undefined, 11)}>Coada de verificare</span>
            <EmptyState
              title="Nimic de verificat"
              hint="Grilele trimise spre verificare apar aici. Deocamdată nu există un flux de trimitere."
              padding="20px 4px 4px"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Alegerea variantei corecte — literele A–E. */
function LetterPicker({ size = 44 }: { size?: number }) {
  const { admin, setAdmin } = useApp();
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="radiogroup" aria-label="Varianta corectă">
      {OPTION_KEYS.map((k: OptionKey) => {
        const active = admin.corect === k;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setAdmin('corect', k)}
            style={{
              width: size,
              height: size,
              borderRadius: 10,
              border: `1.5px solid ${active ? 'var(--ok)' : 'var(--line2)'}`,
              background: active ? 'var(--okS)' : 'var(--surf)',
              color: active ? 'var(--ok)' : 'var(--fg2)',
              font: `600 14px ${SANS}`,
              cursor: 'pointer',
            }}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

function Grupat() {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ ...label, letterSpacing: '.1em', marginBottom: 10 }}>Cele patru afirmații</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span
              style={{
                flex: '0 0 auto',
                width: 30,
                height: 30,
                borderRadius: 9,
                display: 'grid',
                placeItems: 'center',
                font: `600 13px ${SANS}`,
                background: 'var(--surf2)',
                color: 'var(--fg2)',
              }}
            >
              {n}
            </span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <input
                className="field"
                placeholder={`Afirmația ${n}`}
                style={{ padding: '10px 12px', font: `400 13.5px ${SANS}` }}
              />
              <textarea
                className="field-dashed"
                placeholder={`De ce este adevărată sau falsă afirmația ${n}…`}
                style={{ minHeight: 52, resize: 'vertical', padding: '9px 12px', font: `400 12.5px/1.5 ${SANS}` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...label, letterSpacing: '.1em', marginTop: 16, marginBottom: 10 }}>Varianta corectă</div>
      <LetterPicker />
      <div style={{ marginTop: 10, font: `400 11.5px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
        Corespondența este fixă și nu se afișează elevului: A → 1, 2, 3 · B → 1, 3 · C → 2, 4 · D → 4 · E → toate.
      </div>
    </div>
  );
}

function Simplu() {
  const { admin, setAdmin } = useApp();

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ ...label, letterSpacing: '.1em', marginBottom: 10 }}>
        Variantele de răspuns și explicațiile lor · apasă litera pentru cea corectă
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {OPTION_KEYS.map((k: OptionKey) => {
          const active = admin.corect === k;
          return (
            <div key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <button
                type="button"
                onClick={() => setAdmin('corect', k)}
                aria-pressed={active}
                aria-label={`Marchează varianta ${k} drept corectă`}
                style={{
                  flex: '0 0 auto',
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  display: 'grid',
                  placeItems: 'center',
                  font: `600 13px ${SANS}`,
                  cursor: 'pointer',
                  border: `1.5px solid ${active ? 'var(--ok)' : 'var(--line2)'}`,
                  background: active ? 'var(--ok)' : 'transparent',
                  color: active ? 'var(--onBrand)' : 'var(--fg2)',
                }}
              >
                {k}
              </button>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input
                  className="field"
                  placeholder={`Varianta ${k}`}
                  style={{ padding: '10px 12px', font: `400 13.5px ${SANS}` }}
                />
                <textarea
                  className="field-dashed"
                  placeholder={active ? `De ce este corectă varianta ${k}…` : `De ce cade varianta ${k}…`}
                  style={{ minHeight: 52, resize: 'vertical', padding: '9px 12px', font: `400 12.5px/1.5 ${SANS}` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, font: `400 11.5px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
        Explicația fiecărei variante apare elevului după verificarea răspunsului, sub explicația generală.
      </div>
    </div>
  );
}

function Flashcard() {
  return (
    <div style={{ marginTop: 18, ...autoGrid(220, 14) }}>
      <label style={{ display: 'block' }}>
        <span style={label}>Fața cardului</span>
        <textarea
          className="field"
          placeholder="Noțiunea sau întrebarea…"
          style={{ minHeight: 70, resize: 'vertical', padding: '11px 12px', font: `400 13.5px/1.5 ${SANS}` }}
        />
      </label>
      <label style={{ display: 'block' }}>
        <span style={label}>Versoul cardului</span>
        <textarea
          className="field"
          placeholder="Răspunsul scurt, cum vrei să-l rețină elevul…"
          style={{ minHeight: 70, resize: 'vertical', padding: '11px 12px', font: `400 13.5px/1.5 ${SANS}` }}
        />
      </label>
    </div>
  );
}
