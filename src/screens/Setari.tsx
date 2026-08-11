import { Switch } from '../components/Switch';
import { CONT_ROWS, EXAMEN_ROWS, STUDENT } from '../data/profile';
import { SANS, SERIF, pageLead, pageTitle } from '../lib/ui';
import { useApp, type SetareId } from '../state/AppState';

const TOGGLES: { id: SetareId; label: string; meta: string }[] = [
  { id: 'remindere', label: 'Reminder zilnic de studiu', meta: 'În fiecare zi la 18:30' },
  { id: 'recap', label: 'Anunță-mă când am recapitulări', meta: 'Dimineața, o singură notificare' },
  { id: 'simulari', label: 'Simulări programate', meta: 'Cu 24 de ore înainte' },
  { id: 'email', label: 'Rezumat săptămânal pe e-mail', meta: 'Duminică seara' },
];

function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <>
      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '13px 0',
            borderTop: '1px solid var(--line)',
          }}
        >
          <span style={{ flex: '0 0 auto', width: 150, font: `500 13px ${SANS}`, color: 'var(--fg3)' }}>
            {r.label}
          </span>
          <span style={{ flex: 1, font: `400 13.5px ${SANS}` }}>{r.value}</span>
          <button
            type="button"
            className="btn-ghost"
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              borderColor: 'var(--line)',
              font: `500 12px ${SANS}`,
              color: 'var(--fg2)',
            }}
          >
            Modifică
          </button>
        </div>
      ))}
    </>
  );
}

export function Setari() {
  const { theme, toggleTheme, setari, toggleSetare } = useApp();

  return (
    <div className="screen" style={{ maxWidth: 840 }}>
      <h1 style={pageTitle}>Profil și setări</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        Datele contului, examenul pentru care te pregătești și felul în care te anunțăm.
      </p>

      <div style={{ display: 'grid', gap: 18 }}>
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--brandS)',
                color: 'var(--brand)',
                display: 'grid',
                placeItems: 'center',
                font: `600 20px ${SANS}`,
              }}
            >
              {STUDENT.initials}
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ font: `400 21px/1.2 ${SERIF}` }}>{STUDENT.name}</div>
              <div style={{ marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>
                Cont creat în septembrie 2025 · {STUDENT.grileRezolvate} grile rezolvate
              </div>
            </div>
            <button type="button" className="btn-ghost" style={{ padding: '10px 15px', font: `500 13px ${SANS}` }}>
              Schimbă fotografia
            </button>
          </div>
          <Rows rows={CONT_ROWS} />
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div style={{ font: `600 15px ${SANS}` }}>Examenul meu</div>
          <div style={{ marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>
            Din aceste date se generează planul de învățare și estimarea punctajului.
          </div>
          <div style={{ marginTop: 14 }}>
            <Rows rows={EXAMEN_ROWS} />
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div style={{ font: `600 15px ${SANS}` }}>Notificări și remindere</div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {TOGGLES.map((t) => (
              <Switch key={t.id} on={setari[t.id]} onToggle={() => toggleSetare(t.id)}>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', font: `500 13.5px/1.3 ${SANS}`, color: 'var(--fg)' }}>
                    {t.label}
                  </span>
                  <span style={{ display: 'block', marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                    {t.meta}
                  </span>
                </span>
              </Switch>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div style={{ font: `600 15px ${SANS}` }}>Aspect</div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={toggleTheme}
              style={{ padding: '11px 16px', font: `500 13.5px ${SANS}` }}
            >
              {theme === 'dark' ? 'Mod luminos' : 'Mod întunecat'}
            </button>
            <span style={{ font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>
              Tema întunecată se aplică automat seara, dacă o preferi.
            </span>
          </div>
        </div>

        <div style={{ border: '1px solid var(--bad)', borderRadius: 14, padding: 22, background: 'var(--badS)' }}>
          <div style={{ font: `600 15px ${SANS}`, color: 'var(--fg)' }}>Datele mele</div>
          <p style={{ margin: '8px 0 14px', font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
            Poți descărca tot istoricul de grile și statistici, sau poți șterge definitiv contul.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: '10px 15px', borderRadius: 9, background: 'var(--surf)', font: `500 13px ${SANS}` }}
            >
              Descarcă datele
            </button>
            <button
              type="button"
              style={{
                padding: '10px 15px',
                border: '1px solid var(--bad)',
                borderRadius: 9,
                background: 'transparent',
                color: 'var(--bad)',
                font: `600 13px ${SANS}`,
                cursor: 'pointer',
              }}
            >
              Șterge contul
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
