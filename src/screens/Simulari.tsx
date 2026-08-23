import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnswerOptions } from '../components/AnswerOptions';
import { Progress } from '../components/Progress';
import { PasulUrmator } from '../components/PasulUrmator';
import { RecitireGrile, type GrilaRecitita } from '../components/RecitireGrile';
import { PoartaContinut } from '../components/PoartaContinut';
import { rezumaLucrari } from '../lib/istoricSimulari';
import { useProgressOptional } from '../state/progressState';
import { LucrareRedeschisa, PanouIstoric } from './IstoricSimulari';

import { useIsDesktop } from '../lib/hooks';
import { navWindow } from '../lib/navWindow';
import { numar } from '../lib/text';
import { formatClock } from '../lib/time';
import {
  SANS,
  SERIF,
  autoGrid,
  eyebrow,
  label,
  pageLead,
  pageTitle,
  sideStack,
  twoCol,
} from '../lib/ui';
import { SIM_FIELDS } from '../state/useSimulare';
import { useApp } from '../state/appContextValue';
import { frazaCorecte } from './grileText';

export function Simulari() {
  const { sim } = useApp();
  // Lucrarea deschisă din istoric e o stare a ecranului, nu a simulării: n-are
  // rută proprie și nu trebuie să supraviețuiască unei reîncărcări, dar o
  // simulare pornită între timp o închide de la sine, prin `phase`.
  const [deschisa, setDeschisa] = useState<string | null>(null);
  const inchide = useCallback(() => setDeschisa(null), []);

  return (
    <PoartaContinut>
      {sim.phase === 'rezultat' ? (
        <SimRezultat />
      ) : sim.phase !== 'config' ? (
        <SimRun />
      ) : deschisa !== null ? (
        <DinIstoric id={deschisa} onInchide={inchide} />
      ) : (
        <SimConfig onDeschideLucrare={setDeschisa} />
      )}
    </PoartaContinut>
  );
}

/**
 * Caută lucrarea cerută în ce s-a încărcat deja.
 *
 * Dacă a dispărut între timp — alt cont, o reîncărcare a progresului — ecranul
 * se întoarce la configurare în loc să rămână gol.
 */
function DinIstoric({ id, onInchide }: { id: string; onInchide: () => void }) {
  const progres = useProgressOptional();
  const run = progres?.simRuns.find((r) => r.id === id) ?? null;
  const lucrare = rezumaLucrari(run ? [run] : [], progres?.attempts ?? [])[0] ?? null;

  useEffect(() => {
    if (!run || !lucrare) onInchide();
  }, [lucrare, onInchide, run]);

  if (!run || !lucrare) return null;
  return <LucrareRedeschisa run={run} lucrare={lucrare} onInchide={onInchide} />;
}

/** Prima regulă urmează durata aleasă, nu o valoare fixă. */
const reguliPentru = (durata: string): string[] => [
  `Cronometru fix de ${durata}, afișat permanent.`,
  'Nicio explicație și niciun răspuns corect până la predarea lucrării.',
  'Punctaj UMFCD: grila corectă valorează 1 punct, cea greșită sau nemarcată valorează 0. Fără penalizări.',
  'Poți marca grile și reveni la ele cât timp mai ai minute.',
];

function SimConfig({ onDeschideLucrare }: { onDeschideLucrare: (id: string) => void }) {
  const { sim } = useApp();
  const isDesktop = useIsDesktop();

  return (
    <div className="screen">
      <h1 style={pageTitle}>Simulare de admitere</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        Aceleași reguli ca la examenul UMFCD. Odată pornită, cronometrul nu se oprește.
      </p>

      <div style={twoCol(isDesktop)}>
        <div className="card" style={{ padding: 22 }}>
          <div style={autoGrid(220, 16)}>
            {SIM_FIELDS.map((f) => (
              <label key={f.key} style={{ display: 'block' }}>
                <span style={label}>{f.label}</span>
                <select
                  className="field"
                  value={sim.config[f.key]}
                  onChange={(e) => sim.setConfig(f.key, e.target.value)}
                  style={{ padding: '11px 12px', font: `400 13.5px ${SANS}`, cursor: 'pointer' }}
                >
                  {f.options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 22, padding: 18, background: 'var(--surf2)', borderRadius: 12 }}>
            <div style={{ font: `600 12.5px ${SANS}`, marginBottom: 12 }}>Reguli de examen</div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                font: `400 13px/1.5 ${SANS}`,
                color: 'var(--fg2)',
              }}
            >
              {reguliPentru(sim.config.durata).map((r) => (
                <div key={r} style={{ display: 'flex', gap: 10 }}>
                  <span aria-hidden="true" style={{ color: 'var(--brand)', fontWeight: 600 }}>
                    ·
                  </span>
                  {r}
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={sim.start}
            style={{ marginTop: 20, width: '100%', padding: 15, borderRadius: 12, font: `600 15px ${SANS}` }}
          >
            Începe simularea · {sim.config.nr} de grile, {sim.config.durata}
          </button>
          <div style={{ marginTop: 10, textAlign: 'center', font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
            Dacă închizi fereastra, timpul curge mai departe.
          </div>
        </div>

        <div style={sideStack}>
          <PanouIstoric onDeschide={onDeschideLucrare} />
        </div>
      </div>
    </div>
  );
}

/**
 * Poziția din lucrare nu mai are pereche în bibliotecă.
 *
 * Se întâmplă când o grilă e retrasă după ce cineva a început lucrarea. Până la
 * Faza 4 nu putea apărea — banca era compilată în bundle — și cădea tăcut pe
 * prima grilă din bancă, adică arăta altceva decât se salvase.
 */
function GrilaLipsa() {
  const { sim } = useApp();
  return (
    <div className="screen">
      <div className="card" style={{ padding: 26, maxWidth: 620 }}>
        <div style={eyebrow('var(--bad)')}>Grilă indisponibilă</div>
        <p style={{ margin: '14px 0 0', font: `400 17px/1.5 ${SERIF}`, textWrap: 'pretty' }}>
          Grila {sim.qi + 1} a fost scoasă din bibliotecă după ce ai început lucrarea.
        </p>
        <p style={{ margin: '10px 0 18px', font: `400 13.5px/1.6 ${SANS}`, color: 'var(--fg2)' }}>
          Restul lucrării e neatins. Treci mai departe sau predă — punctajul se calculează din
          grilele care au rămas.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={sim.prev}
            style={{ padding: '10px 15px', font: `500 13px ${SANS}` }}
          >
            ← Înapoi
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={sim.next}
            style={{ padding: '10px 16px', font: `600 13px ${SANS}` }}
          >
            Grila următoare →
          </button>
        </div>
      </div>
    </div>
  );
}

function SimRun() {
  const { sim, tipuri } = useApp();
  const isDesktop = useIsDesktop();
  const { start, end } = navWindow(sim.qi, sim.total);
  const run = sim.run;
  const [confirmaPredarea, setConfirmaPredarea] = useState(false);
  const faraRaspuns = sim.total - sim.completed;
  const question = sim.question;

  // O lucrare începută înainte ca o grilă să fie retrasă poate ajunge pe o
  // poziție care nu mai are pereche în bibliotecă. Se spune, nu se sare peste:
  // altfel numerotarea ar minți despre câte grile are lucrarea.
  if (!question) return <GrilaLipsa />;

  return (
    <div className="screen">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          padding: '14px 18px',
          background: 'var(--fg)',
          color: 'var(--bg)',
          borderRadius: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ ...eyebrow(), color: 'inherit', letterSpacing: '.1em', opacity: 0.7, fontSize: 12 }}>
          Simulare în desfășurare
        </div>
        <div style={{ flex: 1, minWidth: 60 }} />
        <div style={{ font: `400 12.5px ${SANS}`, opacity: 0.8 }}>
          {sim.completed} din {sim.total} completate
        </div>
        <div
          className="tabular"
          style={{ font: `500 22px/1 ${SERIF}`, letterSpacing: '.02em' }}
          aria-label="Timp rămas"
        >
          {formatClock(sim.secondsLeft)}
        </div>
        {confirmaPredarea ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ font: `400 12.5px/1.4 ${SANS}`, opacity: 0.85 }}>
              {faraRaspuns > 0
                ? `Mai ai ${numar(faraRaspuns, 'grilă', 'grile')} fără răspuns. Predai?`
                : 'Predai lucrarea?'}
            </span>
            <button
              type="button"
              onClick={() => setConfirmaPredarea(false)}
              style={{
                padding: '10px 14px',
                border: '1px solid currentColor',
                borderRadius: 9,
                background: 'transparent',
                color: 'inherit',
                font: `500 13px ${SANS}`,
                cursor: 'pointer',
              }}
            >
              Nu încă
            </button>
            <button
              type="button"
              onClick={sim.finish}
              style={{
                padding: '10px 16px',
                border: 0,
                borderRadius: 9,
                background: 'var(--bg)',
                color: 'var(--fg)',
                font: `600 13px ${SANS}`,
                cursor: 'pointer',
              }}
            >
              Da, predau
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmaPredarea(true)}
            style={{
              padding: '10px 16px',
              border: 0,
              borderRadius: 9,
              background: 'var(--bg)',
              color: 'var(--fg)',
              font: `600 13px ${SANS}`,
              cursor: 'pointer',
            }}
          >
            Predă lucrarea
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'minmax(0,1fr) 260px' : 'minmax(0,1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <div className="card" style={{ padding: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span
              style={{
                ...eyebrow('var(--brand)'),
                letterSpacing: '.1em',
                background: 'var(--brandS)',
                borderRadius: 6,
                padding: '6px 9px',
              }}
            >
              {tipuri.eticheta(question.tip)}
            </span>
            <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
              Grila {sim.qi + 1} din {sim.total}
            </span>
          </div>

          <p style={{ margin: '18px 0 0', font: `400 21px/1.45 ${SERIF}`, textWrap: 'pretty' }}>{question.text}</p>

          {question.enunturi && (
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                padding: '16px 18px',
                background: 'var(--surf2)',
                borderRadius: 11,
              }}
            >
              {question.enunturi.map((t, i) => (
                <div key={t} style={{ display: 'flex', gap: 10, font: `400 14.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--fg)', flex: '0 0 auto' }}>{i + 1}.</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          )}

          <AnswerOptions
            question={question}
            tip={tipuri.tip(question.tip)}
            answer={sim.answer}
            revealed={false}
            onPick={sim.pick}
            showIcons={false}
          />

          <div
            style={{
              marginTop: 22,
              paddingTop: 18,
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className="btn-ghost"
              onClick={sim.prev}
              style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
            >
              Înapoi
            </button>
            <button
              type="button"
              onClick={sim.toggleMark}
              aria-pressed={sim.isMarked}
              style={{
                padding: '8px 13px',
                border: `1px solid ${sim.isMarked ? 'var(--acc)' : 'var(--line2)'}`,
                borderRadius: 9,
                background: sim.isMarked ? 'var(--accS)' : 'transparent',
                color: sim.isMarked ? 'var(--acc)' : 'var(--fg2)',
                font: `500 12.5px ${SANS}`,
                cursor: 'pointer',
              }}
            >
              {sim.isMarked ? '★ Marcată pentru revenire' : '☆ Marchează pentru revenire'}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={sim.next}
              style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
            >
              Următoarea grilă →
            </button>
          </div>
        </div>

        <div className="card-flat" style={{ padding: 18 }}>
          <div style={eyebrow()}>
            Grile {start + 1}–{end} din {sim.total}
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 6 }}>
            {Array.from({ length: end - start }, (_, k) => {
              const i = start + k;
              const done = run?.answers[i] !== undefined;
              const mark = !!run?.marks[i];
              const cur = i === sim.qi;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => sim.goTo(i)}
                  aria-current={cur ? 'true' : undefined}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    cursor: 'pointer',
                    font: `600 12px ${SANS}`,
                    border: `1px solid ${cur ? 'var(--brand)' : mark ? 'var(--acc)' : 'var(--line)'}`,
                    background: done ? 'var(--brandS)' : mark ? 'var(--accS)' : 'var(--surf2)',
                    color: done ? 'var(--brand)' : mark ? 'var(--acc)' : 'var(--fg3)',
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              font: `400 11.5px/1.4 ${SANS}`,
              color: 'var(--fg3)',
            }}
          >
            {[
              ['var(--brandS)', 'var(--brand)', 'Completată'],
              ['var(--accS)', 'var(--acc)', 'Marcată pentru revenire'],
              ['var(--surf2)', 'var(--line)', 'Necompletată'],
            ].map(([bg, border, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{ width: 10, height: 10, borderRadius: 3, background: bg, border: `1px solid ${border}` }}
                />
                {text}
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid var(--line)',
              font: `400 12px/1.5 ${SANS}`,
              color: 'var(--fg3)',
            }}
          >
            Explicațiile apar doar după predarea lucrării.
          </div>
        </div>
      </div>
    </div>
  );
}

/** Ecranul de după predare: scorul lucrării și recitirea grilelor, cu explicații. */
function SimRezultat() {
  const { sim, tipuri } = useApp();
  const isDesktop = useIsDesktop();
  const run = sim.run;

  const { corecte, gresite, neraspunse, total, pct, durataMs } = sim.score;
  const culoare = pct >= 80 ? 'var(--ok)' : pct >= 65 ? 'var(--brand)' : 'var(--bad)';

  // `questionAt` intră ca dependență, nu `sim` întreg: e memoizat pe banca
  // încărcată și pe lucrare, deci lista se recalculează exact când se schimbă
  // una dintre ele, nu la fiecare bătaie de ceas a simulării.
  const questionAt = sim.questionAt;
  const grile = useMemo<GrilaRecitita[]>(
    () =>
      run?.order.map((_, pozitie) => ({
        pozitie,
        question: questionAt(pozitie) ?? null,
        ales: run.answers[pozitie] ?? null,
      })) ?? [],
    [questionAt, run],
  );

  if (!run) return null;

  const dale: [string, string, string][] = [
    ['Corecte', String(corecte), 'var(--ok)'],
    ['Greșite', String(gresite), 'var(--bad)'],
    ['Fără răspuns', String(neraspunse), 'var(--fg3)'],
    ['Timp', formatClock(durataMs / 1000), 'var(--fg)'],
  ];

  return (
    <div className="screen">
      <h1 style={pageTitle}>Rezultatul simulării</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        {sim.expired
          ? 'Timpul a expirat, iar lucrarea s-a încheiat automat.'
          : 'Lucrarea a fost predată. Acum poți vedea răspunsurile corecte și explicațiile.'}
      </p>

      <div style={twoCol(isDesktop)}>
        <div style={{ minWidth: 0 }}>
          <div className="card" style={{ padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
              <span className="tabular" style={{ font: `600 46px/1 ${SERIF}`, color: culoare }}>
                {pct}%
              </span>
              <span style={{ font: `400 14px ${SANS}`, color: 'var(--fg2)' }}>
                {frazaCorecte(corecte, total)}
              </span>
            </div>

            <div style={{ marginTop: 14 }}>
              <Progress pct={pct} height={8} color={culoare} label={`Scor ${pct}%`} />
            </div>

            <div style={{ ...autoGrid(140, 14), marginTop: 20 }}>
              {dale.map(([eticheta, valoare, color]) => (
                <div key={eticheta} className="card-flat" style={{ padding: 16 }}>
                  <div style={eyebrow()}>{eticheta}</div>
                  <div className="tabular" style={{ marginTop: 8, font: `600 24px/1 ${SANS}`, color }}>
                    {valoare}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
                {run.config.model} · {run.config.nr} de grile, {run.config.durata}
              </span>
              <button
                type="button"
                className="btn-primary"
                onClick={sim.reset}
                style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
              >
                Simulare nouă
              </button>
            </div>
          </div>

          <PasulUrmator gresite={gresite} />

          <RecitireGrile grile={grile} tipuri={tipuri} />
        </div>

        <div style={sideStack}>
          <div className="card-flat" style={{ padding: 20 }}>
            <div style={eyebrow(undefined, 11)}>Cum se citește</div>
            <p style={{ margin: '12px 0 0', font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)' }}>
              Punctajul e raportat la toate cele {numar(total, 'grilă', 'grile')}: o grilă fără răspuns valorează 0, la fel ca
              una greșită. Fără penalizări.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
