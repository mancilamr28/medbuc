import { useMemo, useState } from 'react';
import { ChapterChart } from '../components/ChapterChart';
import { EmptyState } from '../components/EmptyState';
import { Progress } from '../components/Progress';
import { ScoreChart } from '../components/ScoreChart';
import { Segmented } from '../components/Segmented';
import { numar } from '../lib/text';
import { calculeazaStatistici, type PerioadaStatistici } from '../lib/statistici';
import { SANS, SERIF, autoGrid, eyebrow, pageLead, pageTitle } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useProgressOptional } from '../state/progressState';

const PERIOADE: { id: PerioadaStatistici; label: string }[] = [
  { id: '7z', label: '7 zile' },
  { id: '30z', label: '30 zile' },
  { id: 'toate', label: 'Tot timpul' },
];

const SURSE = [
  { id: 'sesiune', label: 'Sesiuni libere' },
  { id: 'simulare', label: 'Simulări' },
  { id: 'recapitulare', label: 'Recapitulări' },
] as const;

function Cifra({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={eyebrow()}>{label}</div>
      <div style={{ marginTop: 11, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="tabular" style={{ font: `500 31px/1 ${SERIF}` }}>{value}</span>
        {suffix && <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>{suffix}</span>}
      </div>
    </div>
  );
}

export function Statistici() {
  const { go, questions } = useApp();
  const progress = useProgressOptional();
  const [perioada, setPerioada] = useState<PerioadaStatistici>('30z');
  const statistici = useMemo(
    () => calculeazaStatistici(progress?.attempts ?? [], questions, perioada, Date.now()),
    [perioada, progress?.attempts, questions],
  );
  const { progres } = statistici;
  const capitole = [...progres.capitole]
    .sort((a, b) => a.pct - b.pct || b.raspunsuri - a.raspunsuri)
    .slice(0, 12)
    .map((capitol) => ({ id: capitol.capId, name: capitol.nume, pct: capitol.pct }));
  const activitate = statistici.activitate.slice(-14);
  const evolutie = progres.evolutie.slice(-8);
  const maximZi = Math.max(1, ...activitate.map((zi) => zi.raspunsuri));

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={pageTitle}>Statistici și progres</h1>
          <p style={pageLead}>Tot ce vezi aici este calculat din răspunsurile salvate în contul tău.</p>
        </div>
        <Segmented items={PERIOADE} value={perioada} onChange={setPerioada} ariaLabel="Perioada statisticilor" />
      </div>

      {progress?.loading ? (
        <div className="card"><EmptyState title="Se încarcă statisticile…" hint="Citirea istoricului nu blochează biblioteca de grile." /></div>
      ) : progress?.error ? (
        <div className="card">
          <EmptyState
            title={progress.error}
            hint="Nu afișăm procente cât timp istoricul nu poate fi citit."
            action={<button type="button" className="btn-ghost tinta-tactila" onClick={() => void progress.reload()}>Reîncearcă</button>}
          />
        </div>
      ) : progres.raspunsuri === 0 ? (
        <div className="card">
          <EmptyState
            title="Nu există răspunsuri în perioada aleasă"
            hint={perioada === 'toate' ? 'Încheie o sesiune de grile și progresul va apărea aici.' : 'Alege o perioadă mai lungă sau rezolvă câteva grile.'}
            action={<button type="button" className="btn-primary tinta-tactila" onClick={() => go('materii')}>Alege un capitol</button>}
          />
        </div>
      ) : (
        <>
          <div style={{ ...autoGrid(180), marginBottom: 18 }}>
            <Cifra label="Răspunsuri" value={progres.raspunsuri} />
            <Cifra label="Corecte" value={progres.pct ?? '—'} suffix="%" />
            <Cifra label="Grile distincte" value={statistici.grileUnice} />
            <Cifra label="Zile active" value={statistici.zileActive} />
          </div>

          <div style={{ ...autoGrid(280), alignItems: 'start' }}>
            <div className="card" style={{ padding: '20px 20px 8px' }}>
              <div style={{ font: `600 15px ${SANS}` }}>Evoluția rezultatelor</div>
              <div style={{ marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>Procent corect la fiecare lucrare încheiată</div>
              <div style={{ marginTop: 14 }}>
                <ScoreChart scores={evolutie.map((punct) => punct.pct)} labels={evolutie.map((punct) => punct.eticheta)} />
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ font: `600 15px ${SANS}` }}>După tipul exercițiului</div>
              <div style={{ marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>Unde ai dat răspunsurile din perioada aleasă</div>
              <div style={{ marginTop: 18, display: 'grid', gap: 16 }}>
                {SURSE.map((sursa) => {
                  const total = statistici.surse[sursa.id];
                  const pct = Math.round((total / progres.raspunsuri) * 100);
                  return (
                    <div key={sursa.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 7, font: `500 13px ${SANS}` }}>
                        <span>{sursa.label}</span>
                        <span className="tabular" style={{ color: 'var(--fg2)' }}>{numar(total, 'răspuns', 'răspunsuri')} · {pct}%</span>
                      </div>
                      <Progress pct={pct} label={`${sursa.label}: ${pct}% din răspunsuri`} />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ font: `600 15px ${SANS}` }}>Capitole începute</div>
              <div style={{ marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>Cele mai slabe apar primele</div>
              <div style={{ marginTop: 18 }}><ChapterChart rows={capitole} /></div>
            </div>

            <div className="card" style={{ padding: 20 }}>
              <div style={{ font: `600 15px ${SANS}` }}>Activitate recentă</div>
              <div style={{ marginTop: 4, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>Ultimele {activitate.length} zile în care ai răspuns</div>
              <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                {activitate.map((zi) => (
                  <div key={zi.data} style={{ display: 'grid', gridTemplateColumns: '48px minmax(50px,1fr) 76px', alignItems: 'center', gap: 8 }}>
                    <span style={{ font: `500 12px ${SANS}`, color: 'var(--fg2)' }}>{zi.eticheta}</span>
                    <Progress pct={(zi.raspunsuri / maximZi) * 100} height={9} label={`${zi.eticheta}: ${numar(zi.raspunsuri, 'răspuns', 'răspunsuri')}`} />
                    <span className="tabular" style={{ textAlign: 'right', font: `500 12px ${SANS}`, color: 'var(--fg2)' }}>{zi.raspunsuri} · {zi.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
