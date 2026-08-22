import { useMemo, useState } from 'react';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { Icon } from '../components/Icon';
import { Segmented } from '../components/Segmented';
import { chapterLabel, type ChapterId, type MaterieId } from '../data/chapters';
import type { QuestionSursa } from '../data/questions';
import { numaraGrile } from '../lib/continut';
import { calculeazaProgres, capitoleSlabe } from '../lib/progres';
import { numar } from '../lib/text';
import { SANS, eyebrow, pageLead, pageTitle } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { filtreazaCapitole } from '../state/useSession';
import { useProgressOptional } from '../state/progressState';

type Scop = 'materie' | 'capitole' | 'slabe';

const SCOP_ITEMS: { id: Scop; label: string }[] = [
  { id: 'materie', label: 'Toată materia' },
  { id: 'capitole', label: 'Capitole anume' },
  { id: 'slabe', label: 'Puncte slabe' },
];

const SURSA_ITEMS: { id: QuestionSursa | 'toate'; label: string }[] = [
  { id: 'toate', label: 'Toate' },
  { id: 'subiect_oficial', label: 'Subiecte oficiale' },
  { id: 'culegere', label: 'Culegeri' },
];

/**
 * Configurarea unei sesiuni noi: materie, apoi scop, apoi sursă.
 *
 * Un singur formular derulabil, ca `SimConfig` din `Simulari.tsx` — nu un
 * wizard paginat. Câmpurile au valori implicite rezonabile, deci elevul poate
 * porni imediat cu „Toată materia" / „Toate sursele" sau le poate ajusta.
 */
export function GrileConfig() {
  const { materie, setMaterie, questions, session, taxonomie } = useApp();
  const progressContext = useProgressOptional();
  const [scop, setScop] = useState<Scop>('materie');
  const [sursaAleasa, setSursaAleasa] = useState<QuestionSursa | 'toate'>('toate');
  const [capitoleAlese, setCapitoleAlese] = useState<ChapterId[]>([]);

  // Materia aleasă poate lipsi cât timp taxonomia încă se încarcă, sau dacă a
  // fost depublicată din administrare între timp: se cade pe prima disponibilă.
  const mat = taxonomie.materie(materie) ?? taxonomie.materii[0] ?? null;
  const capitole = useMemo(() => mat?.list ?? [], [mat]);
  const { peCapitol } = useMemo(() => numaraGrile(questions, taxonomie), [questions, taxonomie]);
  const progres = useMemo(
    () => calculeazaProgres(progressContext?.attempts ?? [], questions, taxonomie),
    [progressContext?.attempts, questions, taxonomie],
  );
  const slabe = useMemo(
    () => capitoleSlabe(progres.capitole, capitole.map((c) => c.id)),
    [capitole, progres.capitole],
  );

  const alegeMaterie = (id: MaterieId) => {
    setMaterie(id);
    setCapitoleAlese([]);
  };

  const comuta = (id: ChapterId) =>
    setCapitoleAlese((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const capitoleFinale: ChapterId[] =
    scop === 'materie'
      ? capitole.map((c) => c.id)
      : scop === 'capitole'
        ? capitoleAlese
        : slabe.map((c) => c.capId);

  const surseFinale: QuestionSursa[] = sursaAleasa === 'toate' ? [] : [sursaAleasa];

  // O listă de capitole goală înseamnă „toată biblioteca" pentru `filtreazaCapitole`
  // — convenția potrivită când scopul e „toată materia", dar greșită aici: la
  // „Capitole anume" sau „Puncte slabe" fără nimic ales, rezultatul trebuie să
  // fie zero grile, nu biblioteca întreagă.
  const restransGol = scop !== 'materie' && capitoleFinale.length === 0;
  const numarGrile = restransGol ? 0 : filtreazaCapitole(questions, capitoleFinale, surseFinale).length;

  const sePoateIncepe = numarGrile > 0 && !restransGol;
  const areSesiuneDeReluat = session.hasStarted && !session.finished && session.total > 0;

  return (
    <div className="screen">
      <h1 style={pageTitle}>Sesiune nouă</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        Alege materia, apoi de unde vin grilele — din tot programa, din capitole anume sau din punctele
        tale slabe.
      </p>

      <div className="card" style={{ padding: 22, maxWidth: 640 }}>
        <div style={{ display: 'grid', gap: 22 }}>
          <div>
            <div style={eyebrow(undefined, 11)}>Materie</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {taxonomie.materii.map((t) => {
                const activ = mat?.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="tinta-tactila"
                    onClick={() => alegeMaterie(t.id)}
                    aria-pressed={activ}
                    style={{
                      padding: '10px 15px',
                      border: `1px solid ${activ ? 'var(--brand)' : 'var(--line)'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      font: `${activ ? 600 : 500} 13.5px ${SANS}`,
                      background: activ ? 'var(--brand)' : 'var(--surf)',
                      color: activ ? 'var(--onBrand)' : 'var(--fg2)',
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={eyebrow(undefined, 11)}>Scop</div>
            <div style={{ marginTop: 10 }}>
              <Segmented items={SCOP_ITEMS} value={scop} onChange={setScop} ariaLabel="Scopul sesiunii" />
            </div>

            {scop === 'capitole' && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {capitole.map((c) => {
                  const grile = peCapitol.get(c.id) ?? 0;
                  const ales = capitoleAlese.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="row-btn tinta-tactila"
                      onClick={() => comuta(c.id)}
                      disabled={grile === 0}
                      aria-pressed={ales}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 8px',
                        borderRadius: 9,
                        opacity: grile === 0 ? 0.45 : 1,
                        cursor: grile === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 20,
                          height: 20,
                          flex: '0 0 auto',
                          borderRadius: 6,
                          display: 'grid',
                          placeItems: 'center',
                          border: `1px solid ${ales ? 'var(--brand)' : 'var(--line2)'}`,
                          background: ales ? 'var(--brand)' : 'transparent',
                          color: 'var(--onBrand)',
                        }}
                      >
                        {ales && <Icon icon={faCheck} size={11} />}
                      </span>
                      <span style={{ flex: 1, textAlign: 'left', font: `500 13.5px ${SANS}` }}>
                        {chapterLabel(c)}
                      </span>
                      <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
                        {numar(grile, 'grilă', 'grile')}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {scop === 'slabe' && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {slabe.length === 0 ? (
                  <p style={{ margin: 0, font: `400 13px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
                    Nu ai încă niciun capitol cu răspunsuri greșite la {(mat?.name ?? 'materia asta').toLowerCase()} — rezolvă
                    câteva grile ca să apară aici.
                  </p>
                ) : (
                  slabe.map((c) => (
                    <div
                      key={c.capId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 8px',
                        font: `500 13.5px ${SANS}`,
                      }}
                    >
                      <span style={{ flex: 1 }}>{c.nume}</span>
                      <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>{c.pct}%</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <div style={eyebrow(undefined, 11)}>Sursă</div>
            <div style={{ marginTop: 10 }}>
              <Segmented items={SURSA_ITEMS} value={sursaAleasa} onChange={setSursaAleasa} ariaLabel="Sursa grilelor" />
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>
            {numar(numarGrile, 'grilă găsită', 'grile găsite')}
          </span>
          {areSesiuneDeReluat && (
            <button
              type="button"
              className="btn-ghost"
              onClick={session.renuntaConfigurare}
              style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
            >
              ← Renunță
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={() => session.start(capitoleFinale, surseFinale)}
            disabled={!sePoateIncepe}
            style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
          >
            Începe sesiunea →
          </button>
        </div>
      </div>
    </div>
  );
}
