import { useState, type FormEvent } from 'react';
import { SANS, SERIF, label } from '../lib/ui';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

/** Arătat când sesiunea vine dintr-un link de resetare — singurul lucru posibil e o parolă nouă. */
export function ResetareParolaFinalizare() {
  const [parola, setParola] = useState('');
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { updatePassword } = useAuth();
  const { notify } = useToast();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEroare(null);
    setPending(true);
    try {
      const { error } = await updatePassword(parola);
      if (error) setEroare(error);
      else notify('succes', 'Parola a fost schimbată.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 30 }}>
        <h1 style={{ margin: 0, font: `400 24px/1.2 ${SERIF}` }}>Alege o parolă nouă</h1>
        <p style={{ margin: '7px 0 22px', font: `400 13.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
          Odată salvată, te poți autentifica cu ea de acum înainte.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'block' }}>
            <span style={label}>Parolă nouă</span>
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={parola}
              onChange={(e) => setParola(e.target.value)}
              style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
            />
          </label>

          {eroare && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                borderRadius: 9,
                background: 'var(--badS)',
                color: 'var(--bad)',
                font: `500 12.5px/1.4 ${SANS}`,
              }}
            >
              {eroare}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={pending}
            style={{ padding: '12px 18px', font: `600 14px ${SANS}` }}
          >
            {pending ? 'O clipă…' : 'Salvează parola'}
          </button>
        </form>
      </div>
    </div>
  );
}
