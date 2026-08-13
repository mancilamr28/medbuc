import { EXAMEN_ROWS } from '../data/profile';
import { initialeDin } from '../lib/text';
import { SANS, SERIF, pageLead, pageTitle } from '../lib/ui';
import { useApp } from '../state/AppState';
import { useAuth } from '../state/AuthContext';

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
  const { theme, toggleTheme } = useApp();
  const { user, profile, signOut } = useAuth();

  const nume = profile?.fullName || 'Fără nume completat';
  const email = user?.email ?? '';
  const initiale = initialeDin(profile?.fullName ?? null, email || '?');

  const contRows: { label: string; value: string }[] = [
    { label: 'Nume', value: profile?.fullName || '—' },
    { label: 'E-mail', value: email },
  ];

  return (
    <div className="screen" style={{ maxWidth: 840 }}>
      <h1 style={pageTitle}>Profil și setări</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        Datele contului și examenul pentru care te pregătești.
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
              {initiale}
            </div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ font: `400 21px/1.2 ${SERIF}` }}>{nume}</div>
              <div style={{ marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>{email}</div>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void signOut()}
              style={{ padding: '10px 15px', font: `500 13px ${SANS}` }}
            >
              Deconectare
            </button>
          </div>
          <Rows rows={contRows} />
        </div>

        <div className="card" style={{ padding: 22 }}>
          <div style={{ font: `600 15px ${SANS}` }}>Examenul meu</div>
          <div style={{ marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>
            Datele examenului pentru care te pregătești.
          </div>
          <div style={{ marginTop: 14 }}>
            <Rows rows={EXAMEN_ROWS} />
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
              Alegerea ta se ține minte pe acest dispozitiv.
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
