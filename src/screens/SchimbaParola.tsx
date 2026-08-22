import { useState } from 'react';
import { SANS } from '../lib/ui';
import { useAuth } from '../state/authState';
import { useToast } from '../state/toastState';
import { valideazaParolaNoua } from './valideazaParola';

const CAMPURI = [
  { id: 'parola-actuala', eticheta: 'Parola actuală', autoComplete: 'current-password' },
  { id: 'parola-noua', eticheta: 'Parola nouă', autoComplete: 'new-password' },
  { id: 'parola-confirmare', eticheta: 'Confirmă parola nouă', autoComplete: 'new-password' },
] as const;

/**
 * Schimbarea parolei din contul propriu.
 *
 * Până acum nu exista: singura cale era deconectarea, „Ai uitat parola?" și un
 * drum prin inbox — pentru cineva care își știe parola și doar vrea alta. În
 * plus, emailurile trec prin serverul de probă al Supabase, limitat la câteva
 * pe oră, deci calea aia pica exact când era folosită de mai mulți.
 *
 * Parola actuală se cere deși Supabase nu o cere: `updateUser` schimbă parola
 * oricui are sesiunea deschisă, deci fără ea un laptop lăsat descuiat un minut
 * e de ajuns ca să pierzi contul.
 */
export function SchimbaParola() {
  const { changePassword } = useAuth();
  const { notify } = useToast();

  const [deschis, setDeschis] = useState(false);
  const [valori, setValori] = useState({ actuala: '', noua: '', confirmare: '' });
  const [eroare, setEroare] = useState<string | null>(null);
  const [seSalveaza, setSeSalveaza] = useState(false);

  const inchide = () => {
    setDeschis(false);
    setValori({ actuala: '', noua: '', confirmare: '' });
    setEroare(null);
  };

  const valoare = (id: (typeof CAMPURI)[number]['id']): string =>
    id === 'parola-actuala' ? valori.actuala : id === 'parola-noua' ? valori.noua : valori.confirmare;

  const schimba = (id: (typeof CAMPURI)[number]['id'], v: string) =>
    setValori((prev) =>
      id === 'parola-actuala'
        ? { ...prev, actuala: v }
        : id === 'parola-noua'
          ? { ...prev, noua: v }
          : { ...prev, confirmare: v },
    );

  const trimite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seSalveaza) return;

    const problema = valideazaParolaNoua(valori.actuala, valori.noua, valori.confirmare);
    if (problema) {
      setEroare(problema);
      return;
    }

    setSeSalveaza(true);
    setEroare(null);
    const { error } = await changePassword(valori.actuala, valori.noua);
    setSeSalveaza(false);

    if (error) {
      setEroare(error);
      return;
    }
    notify('succes', 'Parola a fost schimbată.');
    inchide();
  };

  if (!deschis) {
    return (
      <div
        className="setari-rand"
        style={{ padding: '13px 0', borderTop: '1px solid var(--line)' }}
      >
        <span className="setari-rand__eticheta" style={{ font: `500 13px ${SANS}`, color: 'var(--fg3)' }}>
          Parolă
        </span>
        <span className="setari-rand__valoare" style={{ font: `400 13.5px ${SANS}` }}>
          ••••••••
        </span>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setDeschis(true)}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            borderColor: 'var(--line)',
            font: `500 12px ${SANS}`,
            color: 'var(--fg2)',
          }}
        >
          Schimbă
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void trimite(e)}
      style={{ padding: '13px 0', borderTop: '1px solid var(--line)', display: 'grid', gap: 10 }}
    >
      {CAMPURI.map((camp) => (
        <label key={camp.id} htmlFor={camp.id} style={{ display: 'grid', gap: 5 }}>
          <span style={{ font: `500 12.5px ${SANS}`, color: 'var(--fg3)' }}>{camp.eticheta}</span>
          <input
            id={camp.id}
            className="field"
            type="password"
            autoComplete={camp.autoComplete}
            autoFocus={camp.id === 'parola-actuala'}
            value={valoare(camp.id)}
            onChange={(e) => schimba(camp.id, e.target.value)}
            style={{ padding: '9px 11px', font: `400 13.5px ${SANS}` }}
          />
        </label>
      ))}

      {eroare && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: '9px 11px',
            borderRadius: 8,
            background: 'var(--badS)',
            color: 'var(--bad)',
            font: `500 12.5px/1.45 ${SANS}`,
          }}
        >
          {eroare}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={inchide}
          style={{ padding: '8px 12px', borderRadius: 8, font: `500 12px ${SANS}` }}
        >
          Renunță
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={seSalveaza}
          style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 8, font: `600 12px ${SANS}` }}
        >
          {seSalveaza ? 'Se schimbă…' : 'Schimbă parola'}
        </button>
      </div>
    </form>
  );
}
