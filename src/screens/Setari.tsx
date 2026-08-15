import { useState } from 'react';
import { EXAMEN_ROWS } from '../data/profile';
import { adunaDatele, descarca, numeFisier } from '../lib/exportDate';
import { initialeDin } from '../lib/text';
import { SANS, SERIF, pageLead, pageTitle } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useAuth } from '../state/authState';
import { useToast } from '../state/toastState';

/**
 * Ce se poate schimba dintr-un rând. Fără `edit`, rândul e doar de citit și **nu
 * primește buton** — asta e toată diferența față de versiunea de dinainte, unde
 * fiecare rând avea „Modifică" și niciunul nu făcea nimic, inclusiv cele care nu
 * aveau ce schimba (facultatea și probele sunt fixe pentru produsul ăsta).
 */
interface Editare {
  tip: 'text' | 'email';
  initial: string;
  placeholder?: string;
  /** Întoarce mesajul de eroare, sau `null` la reușită. */
  salveaza: (valoare: string) => Promise<string | null>;
  succes: string;
}

interface Rand {
  label: string;
  value: string;
  edit?: Editare;
}

function RandDate({ rand }: { rand: Rand }) {
  const { notify } = useToast();
  const [deschis, setDeschis] = useState(false);
  const [valoare, setValoare] = useState(rand.edit?.initial ?? '');
  const [seSalveaza, setSeSalveaza] = useState(false);

  const incepe = () => {
    setValoare(rand.edit?.initial ?? '');
    setDeschis(true);
  };

  const trimite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rand.edit || seSalveaza) return;
    setSeSalveaza(true);
    const eroare = await rand.edit.salveaza(valoare);
    setSeSalveaza(false);
    if (eroare) {
      notify('eroare', eroare);
      return;
    }
    notify('succes', rand.edit.succes);
    setDeschis(false);
  };

  if (deschis && rand.edit) {
    return (
      <form
        className="setari-rand setari-rand--editare"
        onSubmit={(e) => void trimite(e)}
        style={{ padding: '11px 0', borderTop: '1px solid var(--line)' }}
      >
        <label
          className="setari-rand__eticheta"
          htmlFor={`camp-${rand.label}`}
          style={{ font: `500 13px ${SANS}`, color: 'var(--fg3)' }}
        >
          {rand.label}
        </label>
        <input
          id={`camp-${rand.label}`}
          className="field"
          type={rand.edit.tip}
          value={valoare}
          autoFocus
          placeholder={rand.edit.placeholder}
          onChange={(e) => setValoare(e.target.value)}
          style={{ minWidth: 0, padding: '9px 11px', font: `400 13.5px ${SANS}` }}
        />
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setDeschis(false)}
          style={{ padding: '8px 12px', borderRadius: 8, font: `500 12px ${SANS}` }}
        >
          Renunță
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={seSalveaza}
          style={{ padding: '8px 14px', borderRadius: 8, font: `600 12px ${SANS}` }}
        >
          {seSalveaza ? 'Se salvează…' : 'Salvează'}
        </button>
      </form>
    );
  }

  return (
    <div
      className={`setari-rand${rand.edit ? '' : ' setari-rand--doar-citire'}`}
      style={{ padding: '13px 0', borderTop: '1px solid var(--line)' }}
    >
      <span className="setari-rand__eticheta" style={{ font: `500 13px ${SANS}`, color: 'var(--fg3)' }}>
        {rand.label}
      </span>
      <span className="setari-rand__valoare" style={{ font: `400 13.5px ${SANS}` }}>
        {rand.value}
      </span>
      {rand.edit ? (
        <button
          type="button"
          className="btn-ghost"
          onClick={incepe}
          style={{ padding: '7px 12px', borderRadius: 8, borderColor: 'var(--line)', font: `500 12px ${SANS}`, color: 'var(--fg2)' }}
        >
          Modifică
        </button>
      ) : null}
    </div>
  );
}

function Rows({ rows }: { rows: Rand[] }) {
  return (
    <>
      {rows.map((r) => (
        <RandDate key={r.label} rand={r} />
      ))}
    </>
  );
}

export function Setari() {
  const { theme, toggleTheme } = useApp();
  const { user, profile, signOut, updateNume, updateEmail, stergeContul } = useAuth();
  const { notify } = useToast();

  const [confirmaStergerea, setConfirmaStergerea] = useState(false);
  const [seExporta, setSeExporta] = useState(false);
  const [seSterge, setSeSterge] = useState(false);

  const nume = profile?.fullName || 'Fără nume completat';
  const email = user?.email ?? '';
  const initiale = initialeDin(profile?.fullName ?? null, email || '?');

  const contRows: Rand[] = [
    {
      label: 'Nume',
      value: profile?.fullName || '—',
      edit: {
        tip: 'text',
        initial: profile?.fullName ?? '',
        placeholder: 'Numele tău complet',
        salveaza: async (v) => (await updateNume(v)).error,
        succes: 'Numele a fost salvat.',
      },
    },
    {
      label: 'E-mail',
      value: email,
      edit: {
        tip: 'email',
        initial: email,
        salveaza: async (v) => (await updateEmail(v)).error,
        succes: 'Verifică noua adresă — până confirmi acolo, rămâne cea veche.',
      },
    },
  ];

  const exporta = async () => {
    if (!user || seExporta) return;
    setSeExporta(true);
    try {
      const date = await adunaDatele(user.id, user.email ?? null);
      descarca(date, numeFisier(new Date()));
      notify('succes', 'Datele tale au fost descărcate.');
    } catch {
      notify('eroare', 'Nu am putut pregăti fișierul. Încearcă din nou.');
    } finally {
      setSeExporta(false);
    }
  };

  const sterge = async () => {
    if (seSterge) return;
    setSeSterge(true);
    const { error } = await stergeContul();
    setSeSterge(false);
    if (error) {
      notify('eroare', error);
      setConfirmaStergerea(false);
    }
    // La reușită nu se anunță nimic: contul a dispărut, iar `onAuthStateChange`
    // duce aplicația înapoi la ecranul de autentificare sub notificare.
  };

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
            <div style={{ flex: '1 1 150px', minWidth: 0 }}>
              <div style={{ font: `400 21px/1.2 ${SERIF}` }}>{nume}</div>
              <div style={{ marginTop: 4, overflowWrap: 'anywhere', font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>
                {email}
              </div>
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
            Aceleași pentru toți deocamdată — sesiunea și punctajul țintă devin ale tale când
            planul e generat din ritmul tău real.
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
            Poți descărca tot ce ține de contul tău, sau poți șterge definitiv contul cu tot cu
            răspunsuri, simulări și notițe. Ștergerea nu se poate anula.
          </p>

          {confirmaStergerea ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ font: `500 13px/1.4 ${SANS}`, color: 'var(--fg)' }}>
                Ștergem contul și tot ce ai lucrat?
              </span>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirmaStergerea(false)}
                // Cererea e deja plecată și nu se poate opri: lăsat activ, „renunț"
                // ar închide dialogul ca și cum s-ar fi anulat ceva, iar contul ar
                // dispărea oricum o clipă mai târziu.
                disabled={seSterge}
                style={{ padding: '10px 15px', borderRadius: 9, background: 'var(--surf)', font: `500 13px ${SANS}` }}
              >
                Nu, renunț
              </button>
              <button
                type="button"
                onClick={() => void sterge()}
                disabled={seSterge}
                style={{
                  padding: '10px 15px',
                  border: 0,
                  borderRadius: 9,
                  background: 'var(--bad)',
                  // `--bad` e mai deschis pe tema întunecată, unde alb pe el abia
                  // se citește; `--onBrand` se întoarce cu tema, ca la `.btn-primary`.
                  color: 'var(--onBrand)',
                  font: `600 13px ${SANS}`,
                  cursor: 'pointer',
                }}
              >
                {seSterge ? 'Se șterge…' : 'Da, șterge definitiv'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void exporta()}
                disabled={seExporta}
                style={{ padding: '10px 15px', borderRadius: 9, background: 'var(--surf)', font: `500 13px ${SANS}` }}
              >
                {seExporta ? 'Se pregătește…' : 'Descarcă datele'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmaStergerea(true)}
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
          )}
        </div>
      </div>
    </div>
  );
}
