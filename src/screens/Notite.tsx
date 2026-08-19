import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { chapterLabelById, materieNameOf, type ChapterId } from '../data/chapters';
import { citesteCapitoleCuNotita } from '../lib/notite';
import { usePersistentState } from '../lib/hooks';
import { NOTE_PREFIX } from '../lib/migrations';
import { numar } from '../lib/text';
import { SANS, eyebrow, pageLead, pageTitle } from '../lib/ui';
import { useApp } from '../state/appContextValue';

const esteText = (v: unknown): v is string => typeof v === 'string';

/** O notiță de capitol, cu editare pe loc. Fiecare card ține propria stare persistentă. */
function NotitaCapitol({ capId, onSters }: { capId: ChapterId; onSters: () => void }) {
  const [note, setNote, stergeNota] = usePersistentState<string>(`${NOTE_PREFIX}${capId}`, '', esteText);
  const [editare, setEditare] = useState(false);

  // `stergeNota()`, nu `setNote('')`: cardul se demontează imediat după, prin
  // `onSters()`, iar o scriere lăsată în updater s-ar pierde odată cu el.
  const sterge = () => {
    stergeNota();
    onSters();
  };

  return (
    <div className="card-flat" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={eyebrow()}>{materieNameOf(capId)}</div>
          <div style={{ marginTop: 4, font: `500 14px/1.3 ${SANS}` }}>{chapterLabelById(capId)}</div>
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
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
          placeholder="Scrie ce vrei să ții minte…"
          style={{ marginTop: 12, minHeight: 96, resize: 'vertical', padding: '11px 12px', font: `400 13px/1.5 ${SANS}` }}
        />
      ) : (
        <p style={{ margin: '12px 0 0', font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)', whiteSpace: 'pre-wrap' }}>
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * Toate notițele scrise pe capitole, într-un singur loc. Nu introduce
 * persistență nouă — citește ce s-a scris deja din ecranul de Grile
 * (`medbuc.note.${capId}`) și editează prin același `usePersistentState`.
 *
 * Lista de capitole se citește o singură dată, la montare: nu are sens s-o
 * urmărească live, fiindcă acesta e singurul alt ecran care scrie notițe și
 * cele două nu pot fi deschise deodată.
 */
export function Notite() {
  const { go } = useApp();
  const [capIds, setCapIds] = useState<ChapterId[]>(() => citesteCapitoleCuNotita());

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
