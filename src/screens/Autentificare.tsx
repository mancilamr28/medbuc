import { useState, type FormEvent } from 'react';
import { SANS, SERIF, label } from '../lib/ui';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

/** Exportat pentru că `App` alege modul din ruta publică (`#/inregistrare`). */
export type ModAutentificare = 'login' | 'inregistrare' | 'uitat';

const TITLURI: Record<ModAutentificare, { titlu: string; sub: string }> = {
  login: { titlu: 'Bine ai revenit', sub: 'Autentifică-te ca să continui pregătirea.' },
  inregistrare: { titlu: 'Creează-ți contul', sub: 'Câteva secunde, apoi poți începe să exersezi.' },
  uitat: { titlu: 'Recuperează parola', sub: 'Îți trimitem un link de resetare pe email.' },
};

/**
 * Ecranul de autentificare. Nu se sprijină pe `AppState` — nu are ce naviga
 * înainte să existe o sesiune, iar rolul (elev/admin) vine mereu din `profiles`
 * după autentificare, nu dintr-un comutator din interfață.
 *
 * `modInitial` vine din ruta publică, dar legătura e într-un singur sens: doar
 * punctul de intrare se citește din hash. Comutatoarele din card rămân stare
 * internă — o sincronizare în ambele sensuri ar rescrie URL-ul la fiecare
 * „Ai uitat parola?" și ar pierde ce e deja tastat.
 */
export function Autentificare({ modInitial = 'login' }: { modInitial?: ModAutentificare }) {
  const [mod, setMod] = useState<ModAutentificare>(modInitial);
  const [email, setEmail] = useState('');
  const [parola, setParola] = useState('');
  const [numeComplet, setNumeComplet] = useState('');
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [emailTrimis, setEmailTrimis] = useState(false);

  const { signIn, signUp, requestPasswordReset } = useAuth();
  const { notify } = useToast();

  const schimbaMod = (next: ModAutentificare) => {
    setMod(next);
    setEroare(null);
    setEmailTrimis(false);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setEroare(null);
    setPending(true);
    try {
      if (mod === 'login') {
        const { error } = await signIn(email, parola);
        if (error) setEroare(error);
      } else if (mod === 'inregistrare') {
        const { error, confirmareEmail } = await signUp(email, parola, numeComplet);
        if (error) {
          setEroare(error);
        } else if (confirmareEmail) {
          notify('info', 'Cont creat — verifică emailul ca să-l confirmi.');
          schimbaMod('login');
        } else {
          notify('succes', 'Cont creat.');
        }
      } else {
        const { error } = await requestPasswordReset(email);
        if (error) setEroare(error);
        else setEmailTrimis(true);
      }
    } finally {
      setPending(false);
    }
  };

  const { titlu, sub } = TITLURI[mod];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'var(--bg)',
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 30 }}>
        {/* Marca duce înapoi la pagina de prezentare — altfel cardul e o fundătură
            pentru cine a intrat aici dintr-un buton și vrea să se mai uite o dată. */}
        <a
          href="#/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 22,
            color: 'var(--fg)',
          }}
        >
          <img
            src={`${import.meta.env.BASE_URL}logo-kitty.svg`}
            alt=""
            style={{ width: 34, height: 34, display: 'block' }}
          />
          <span style={{ font: `600 16px/1 ${SANS}`, letterSpacing: '-.01em' }}>MedBuc</span>
        </a>

        <h1 style={{ margin: 0, font: `400 24px/1.2 ${SERIF}` }}>{titlu}</h1>
        <p style={{ margin: '7px 0 22px', font: `400 13.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>{sub}</p>

        {mod === 'uitat' && emailTrimis ? (
          <div style={{ font: `400 13.5px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
            Dacă există un cont cu adresa <strong>{email}</strong>, ai primit un email cu un link de resetare.
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mod === 'inregistrare' && (
              <label style={{ display: 'block' }}>
                <span style={label}>Nume complet</span>
                <input
                  className="field"
                  type="text"
                  autoComplete="name"
                  required
                  value={numeComplet}
                  onChange={(e) => setNumeComplet(e.target.value)}
                  style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
                />
              </label>
            )}

            <label style={{ display: 'block' }}>
              <span style={label}>Email</span>
              <input
                className="field"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
              />
            </label>

            {mod !== 'uitat' && (
              <label style={{ display: 'block' }}>
                <span style={label}>Parolă</span>
                <input
                  className="field"
                  type="password"
                  autoComplete={mod === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  value={parola}
                  onChange={(e) => setParola(e.target.value)}
                  style={{ padding: '11px 12px', font: `400 13.5px ${SANS}` }}
                />
              </label>
            )}

            {mod === 'login' && (
              <button
                type="button"
                className="plain-btn"
                onClick={() => schimbaMod('uitat')}
                style={{ alignSelf: 'flex-end', font: `500 12.5px ${SANS}`, color: 'var(--brand)' }}
              >
                Ai uitat parola?
              </button>
            )}

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
              {pending
                ? 'O clipă…'
                : mod === 'login'
                  ? 'Autentificare'
                  : mod === 'inregistrare'
                    ? 'Creează contul'
                    : 'Trimite link-ul'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: 'center', font: `400 13px ${SANS}`, color: 'var(--fg3)' }}>
          {mod === 'inregistrare' ? (
            <>
              Ai deja cont?{' '}
              <button type="button" className="plain-btn" onClick={() => schimbaMod('login')} style={{ color: 'var(--brand)', font: `500 13px ${SANS}` }}>
                Autentifică-te
              </button>
            </>
          ) : (
            <>
              Nu ai cont încă?{' '}
              <button type="button" className="plain-btn" onClick={() => schimbaMod('inregistrare')} style={{ color: 'var(--brand)', font: `500 13px ${SANS}` }}>
                Creează unul
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
