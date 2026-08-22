import { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { StareNotitaText } from '../components/StareNotita';
import type { ChapterId } from '../data/chapters';
import { citesteCapitoleCuNotita } from '../lib/notite';
import { citesteNotite } from '../lib/notiteBaza';
import { reportError } from '../lib/sentry';
import { numar } from '../lib/text';
import { SANS, eyebrow, pageLead, pageTitle } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useAuthOptional } from '../state/authState';
import { useNotita } from '../state/useNotita';

/** O notiță de capitol, cu editare pe loc. Fiecare card își ține propria sincronizare. */
function NotitaCapitol({ capId, onSters }: { capId: ChapterId; onSters: () => void }) {
  const { taxonomie } = useApp();
  const notita = useNotita(capId);
  const [editare, setEditare] = useState(false);

  // Ștergerea scoate cardul imediat după, deci trebuie să plece și local, și de
  // pe cont într-un singur gest — `notita.sterge()` le face pe amândouă.
  const sterge = () => {
    notita.sterge();
    onSters();
  };

  return (
    <div className="card-flat" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <div style={eyebrow()}>{taxonomie.numeMaterie(capId)}</div>
            <StareNotitaText stare={notita.stare} onReincearca={notita.reincearca} />
          </div>
          <div style={{ marginTop: 4, font: `500 14px/1.3 ${SANS}` }}>{taxonomie.eticheta(capId)}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setEditare((e) => !e)}
            style={{ padding: '7px 11px', font: `500 12px ${SANS}` }}
          >
            {editare ? 'Gata' : 'Editează'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={sterge}
            style={{ padding: '7px 11px', font: `500 12px ${SANS}`, color: 'var(--bad)' }}
          >
            Șterge
          </button>
        </div>
      </div>

      {editare ? (
        <textarea
          className="field"
          value={notita.body}
          onChange={(e) => notita.scrie(e.target.value)}
          autoFocus
          placeholder="Scrie ce vrei să ții minte…"
          style={{ marginTop: 12, minHeight: 96, resize: 'vertical', padding: '11px 12px', font: `400 13px/1.5 ${SANS}` }}
        />
      ) : (
        <p style={{ margin: '12px 0 0', font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)', whiteSpace: 'pre-wrap' }}>
          {notita.body}
        </p>
      )}
    </div>
  );
}

/**
 * Toate notițele scrise pe capitole, într-un singur loc.
 *
 * Lista pornește din `localStorage`, ca să apară instantaneu, și se completează
 * cu ce e pe cont — altfel o notiță scrisă pe telefon ar lipsi de pe laptop
 * chiar dacă e salvată. Ordinea rămâne cea din bibliografie, nu ordinea în care
 * s-a scris.
 */
export function Notite() {
  const { go, taxonomie } = useApp();
  const auth = useAuthOptional();
  const userId = auth?.user?.id ?? null;
  const [capIds, setCapIds] = useState<ChapterId[]>([]);

  /**
   * Lista locală se recitește când sosește taxonomia.
   *
   * Ordinea capitolelor și „mai există capitolul ăsta?" vin acum din bază, care
   * răspunde după primul render. Citită o singură dată, la montare, lista ar
   * rămâne goală pentru totdeauna — notițele ar exista în storage, dar ecranul
   * ar arăta starea de „n-ai scris încă nimic".
   */
  useEffect(() => {
    const locale = citesteCapitoleCuNotita(taxonomie);
    setCapIds((prev) => {
      const toate = new Set([...prev, ...locale]);
      return taxonomie.capitole.map((c) => c.id).filter((id) => toate.has(id));
    });
  }, [taxonomie]);

  useEffect(() => {
    if (!userId) return;
    let renuntat = false;
    void citesteNotite()
      .then((deLaCont) => {
        if (renuntat) return;
        const dinCont = deLaCont
          .filter((n) => n.body.trim() !== '' && taxonomie.esteCapitol(n.chapter_id))
          .map((n) => n.chapter_id as ChapterId);
        setCapIds((prev) => {
          const toate = new Set([...prev, ...dinCont]);
          return taxonomie.capitole.map((c) => c.id).filter((id) => toate.has(id));
        });
      })
      .catch((e: unknown) => {
        // Lista locală rămâne pe ecran: o citire căzută nu are voie să ascundă
        // notițele de pe dispozitiv.
        reportError(e, 'Notite: listă');
        console.warn('[medbuc] Nu am putut citi notițele de pe cont.', e);
      });
    return () => {
      renuntat = true;
    };
  }, [taxonomie, userId]);

  const stergeCard = (capId: ChapterId) => setCapIds((prev) => prev.filter((id) => id !== capId));

  return (
    <div className="screen">
      <h1 style={pageTitle}>Notițele mele</h1>
      <p style={pageLead}>Tot ce ai notat, capitol cu capitol, într-un singur loc.</p>

      {capIds.length === 0 ? (
        <div className="card" style={{ marginTop: 20 }}>
          <EmptyState
            title="Nicio notiță încă"
            hint="Scrie o notiță din ecranul de Grile, la fiecare capitol — apare aici imediat ce salvezi."
            action={
              <button
                type="button"
                className="btn-primary"
                onClick={() => go('grile')}
                style={{ padding: '10px 16px', font: `600 13px ${SANS}` }}
              >
                Mergi la Grile
              </button>
            }
          />
        </div>
      ) : (
        <>
          <p style={{ ...eyebrow(), margin: '20px 0 12px' }}>{numar(capIds.length, 'notiță', 'notițe')}</p>
          <div style={{ display: 'grid', gap: 14 }}>
            {capIds.map((capId) => (
              <NotitaCapitol key={capId} capId={capId} onSters={() => stergeCard(capId)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
