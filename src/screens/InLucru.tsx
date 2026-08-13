import { SCREEN_TITLES, type Screen } from '../lib/router';
import { SANS, SERIF } from '../lib/ui';
import { useApp } from '../state/AppState';

/** Ecranele planificate pentru runda următoare. */
export function InLucru({ screen }: { screen: Screen }) {
  const { go } = useApp();
  const title = SCREEN_TITLES[screen] ?? 'În lucru';

  return (
    <div className="screen" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
      <div
        style={{
          width: 54,
          height: 54,
          margin: '0 auto',
          borderRadius: 16,
          background: 'var(--brandS)',
          color: 'var(--brand)',
          display: 'grid',
          placeItems: 'center',
          font: `400 24px ${SERIF}`,
        }}
      >
        {screen.charAt(0).toUpperCase()}
      </div>
      <h1 style={{ margin: '20px 0 0', font: `400 27px/1.2 ${SERIF}` }}>{title}</h1>
      <p style={{ margin: '10px 0 22px', font: `400 14px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
        Ecran planificat pentru runda următoare. Deocamdată sunt gata pagina principală, materiile, rezolvarea de
        grile și simularea de examen.
      </p>
      <button
        type="button"
        className="btn-primary"
        onClick={() => go('acasa')}
        style={{ padding: '12px 18px', font: `600 13.5px ${SANS}` }}
      >
        Înapoi la pagina principală
      </button>
    </div>
  );
}
