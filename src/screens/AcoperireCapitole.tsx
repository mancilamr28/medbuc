import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { chapterLabel } from '../data/chapters';
import { citesteAcoperirea, type AcoperireCapitol } from '../lib/continut';
import { reportError } from '../lib/sentry';
import type { Taxonomie } from '../lib/taxonomie';
import { numar } from '../lib/text';
import { SANS, SERIF, eyebrow, type SX } from '../lib/ui';

/**
 * Ce s-a scris și ce nu, capitol cu capitol.
 *
 * Întrebarea „ce scriu mai departe?" se răspunde azi din memorie, iar memoria
 * greșește: din 22 de capitole, 20 sunt goale, și cifra asta nu se vede nicăieri
 * în aplicație. Cu 30 de capitole pe două probe, e chiar bariera care ține
 * produsul pe loc — nu funcțiile.
 *
 * Numărătoarea vine dintr-o agregare SQL, nu dintr-un array adus în client;
 * `acoperire_capitole` e `security invoker`, deci RLS decide ce se numără.
 *
 * Nicio cifră de aici nu e scrisă de mână — regula casei. Un capitol fără nicio
 * grilă arată „—", nu un zero care s-ar putea citi ca un procent.
 */
/**
 * Numărul de grile publicate dintr-un capitol.
 *
 * Pastila își strânge lățimea pe cifră, nu ține una fixă: cu lățime fixă și text
 * la dreapta, fondul colorat rămas liber varia cu numărul de cifre, așa că „60"
 * arăta ca o bară umplută mai mult decât „120" — exact pe dos. E o numărătoare,
 * nu o măsură, deci nu are voie să semene cu o bară de progres.
 */
const pastila = (areGrile: boolean): SX => ({
  font: `600 12.5px/1 ${SANS}`,
  padding: '4px 9px',
  borderRadius: 99,
  flex: '0 0 auto',
  fontVariantNumeric: 'tabular-nums',
  color: areGrile ? 'var(--ok)' : 'var(--fg3)',
  background: areGrile ? 'var(--okS)' : 'var(--surf2)',
});

export function AcoperireCapitole({ taxonomie, onDeschide, onAdauga, onImporta }: {
  taxonomie: Taxonomie;
  onDeschide?: (capitol: string) => void;
  onAdauga?: (capitol: string) => void;
  onImporta?: (capitol: string) => void;
}) {
  const [randuri, setRanduri] = useState<AcoperireCapitol[] | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [incercare, setIncercare] = useState(0);

  useEffect(() => {
    let anulat = false;
    setEroare(null);
    void citesteAcoperirea()
      .then((r) => {
        if (!anulat) setRanduri(r);
      })
      .catch((e: unknown) => {
        if (anulat) return;
        setEroare('Nu am putut citi acoperirea.');
        reportError(e, 'Administrare: acoperire');
      });
    return () => {
      anulat = true;
    };
  }, [incercare]);

  const peCapitol = useMemo(
    () => new Map((randuri ?? []).map((r) => [r.capId, r])),
    [randuri],
  );

  const total = useMemo(
    () => (randuri ?? []).reduce((n, r) => n + r.ciorna + r.publicata + r.retrasa, 0),
    [randuri],
  );

  const goale = useMemo(
    () => taxonomie.capitole.filter((c) => (peCapitol.get(c.id)?.publicata ?? 0) === 0).length,
    [peCapitol, taxonomie.capitole],
  );

  if (eroare) {
    return (
      <div className="card" style={{ padding: 8 }}>
        <EmptyState
          title={eroare}
          action={
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setIncercare((i) => i + 1)}
              style={{ padding: '9px 14px', font: `500 12.5px ${SANS}` }}
            >
              Încearcă din nou
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
        <div style={eyebrow(undefined, 11)}>Acoperirea programei</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 22, flexWrap: 'wrap' }}>
          <div>
            <div style={{ font: `500 22px/1 ${SERIF}` }}>{randuri ? total : '—'}</div>
            <div style={{ marginTop: 5, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
              grile scrise
            </div>
          </div>
          <div>
            <div style={{ font: `500 22px/1 ${SERIF}` }}>
              {randuri ? `${taxonomie.capitole.length - goale}/${taxonomie.capitole.length}` : '—'}
            </div>
            <div style={{ marginTop: 5, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
              capitole cu grile publicate
            </div>
          </div>
        </div>
        {randuri && goale > 0 && (
          <p style={{ margin: '12px 0 0', font: `400 12.5px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
            {numar(goale, 'capitol așteaptă', 'capitole așteaptă')} prima grilă publicată.
          </p>
        )}
      </div>

      {randuri === null ? (
        <div style={{ padding: 20, font: `400 13px ${SANS}`, color: 'var(--fg3)' }}>
          Se numără biblioteca…
        </div>
      ) : (
        <div style={{ maxHeight: 460, overflowY: 'auto' }}>
          {taxonomie.materii.map((m) => (
            <div key={m.id}>
              <div
                style={{
                  padding: '10px 20px',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--surf2)',
                  borderBottom: '1px solid var(--line)',
                  ...eyebrow(undefined, 10.5),
                }}
              >
                {m.name}
              </div>
              {m.list.map((c) => {
                const a = peCapitol.get(c.id);
                return (
                  <div
                    key={c.id}
                    className="list-row"
                    style={{
                      padding: '9px 20px',
                      borderBottom: '1px solid var(--line)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, font: `400 12.5px ${SANS}` }} className="truncate">
                      {chapterLabel(c)}
                    </span>
                    {(a?.ciorna ?? 0) > 0 && (
                      <span style={{ font: `400 11px ${SANS}`, color: 'var(--fg3)' }}>
                        {numar(a!.ciorna, 'ciornă', 'ciorne')}
                      </span>
                    )}
                    <span
                      className="tabular"
                      style={{
                        ...pastila((a?.publicata ?? 0) > 0),
                        // Culoarea spune „are conținut / n-are", nu un procent de
                        // corectitudine: aici se scrie, nu se rezolvă.
                      }}
                    >
                      {(a?.publicata ?? 0) > 0 ? a!.publicata : '—'}
                    </span>
                    {onDeschide && <button className="btn-quiet" aria-label={`Vezi grilele: ${chapterLabel(c)}`} onClick={() => onDeschide(c.id)}>Vezi grilele</button>}
                    <div className="admin-butoane" style={{ width: '100%' }}>
                      {onAdauga && <button className="btn-quiet" aria-label={`Adaugă o grilă: ${chapterLabel(c)}`} onClick={() => onAdauga(c.id)}>Adaugă aici</button>}
                      {onImporta && <button className="btn-quiet" aria-label={`Importă grile: ${chapterLabel(c)}`} onClick={() => onImporta(c.id)}>Importă aici</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
