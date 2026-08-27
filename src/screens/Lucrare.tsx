import { useEffect, useRef, type ReactNode } from 'react';
import { AnswerOptions } from '../components/AnswerOptions';
import { EmptyState } from '../components/EmptyState';
import { PasulUrmator } from '../components/PasulUrmator';
import { Progress } from '../components/Progress';
import { OPTION_KEYS, type OptionKey } from '../data/questions';
import { useNow } from '../lib/hooks';
import { navWindow } from '../lib/navWindow';
import { useIdLucrare } from '../lib/router';
import { formatClock } from '../lib/time';
import { SANS, SERIF, autoGrid, eyebrow } from '../lib/ui';
import { useApp } from '../state/appContextValue';
import { useProgressOptional } from '../state/progressState';
import { useLucrare, verificaPeLoc, type GrilaLucrare, type Lucrarea } from '../state/useLucrare';
import { detaliuLucrare, frazaFaraRaspuns, frazaScor, mesajCodLucrare, titluMod } from './lucrareText';

/**
 * Ecranul unei lucrări compuse de motorul din bază.
 *
 * Id-ul vine din adresă (`#/lucrare/<id>`), nu dintr-o cheie de `localStorage`:
 * lucrarea trăiește pe server, deci adresa e tot ce trebuie ca să o redeschizi,
 * de pe orice dispozitiv. Restul aplicației nu știe nimic despre ea — `Grile` și
 * `Simulari` merg mai departe pe drumul lor, neatinse, până când drumul ăsta se
 * dovedește.
 */
export function Lucrare() {
  const runId = useIdLucrare();
  const lucrare = useLucrare(runId);

  if (runId === null) return <FaraLucrare />;
  if (lucrare.faza === 'incarcare') return <SeIncarca />;
  if (lucrare.faza === 'eroare') return <Eroare lucrare={lucrare} />;
  if (lucrare.total === 0) return <LucrareGoala />;
  return lucrare.faza === 'rezultat' ? (
    <Rezultat lucrare={lucrare} />
  ) : (
    <Rulare lucrare={lucrare} />
  );
}

const Panou = ({ children }: { children: ReactNode }) => (
  <div className="screen">
    <div className="card" style={{ padding: 8, maxWidth: 520, margin: '0 auto' }}>{children}</div>
  </div>
);

function ButonTestNou({ text = 'Compune un test' }: { text?: string }) {
  const { go } = useApp();
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() => go('test-nou')}
      style={{ padding: '10px 16px', font: `600 13px ${SANS}` }}
    >
      {text}
    </button>
  );
}

/** `#/lucrare` fără id: nu e o eroare, doar n-are ce deschide. */
const FaraLucrare = () => (
  <Panou>
    <EmptyState
      title="N-am ce lucrare să deschid"
      hint="Fiecare lucrare are adresa ei. Compune una nouă și vei ajunge direct în ea."
      action={<ButonTestNou />}
    />
  </Panou>
);

/** Suprafață goală, nu un progres inventat — aceeași regulă ca la pornirea aplicației. */
const SeIncarca = () => (
  <div className="screen" style={{ minHeight: 220 }} aria-busy="true" aria-label="Se încarcă lucrarea" />
);

function LucrareGoala() {
  return (
    <Panou>
      <EmptyState
        title="Lucrarea nu are nicio grilă"
        hint="Grilele din ea au fost retrase din bibliotecă după ce a fost compusă."
        action={<ButonTestNou />}
      />
    </Panou>
  );
}

function Eroare({ lucrare }: { lucrare: Lucrarea }) {
  return (
    <Panou>
      <EmptyState
        title={mesajCodLucrare(lucrare.cod)}
        hint={lucrare.cod === null ? lucrare.eroare ?? undefined : undefined}
        action={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={lucrare.reincarca}
              style={{ padding: '10px 16px', font: `500 13px ${SANS}` }}
            >
              Încearcă din nou
            </button>
            <ButonTestNou />
          </div>
        }
      />
    </Panou>
  );
}

/** Banda de sus: unde ești, cât a trecut sau cât a mai rămas, și cum ieși. */
function Antet({ lucrare }: { lucrare: Lucrarea }) {
  const { go } = useApp();
  const acum = useNow(lucrare.inceputLa !== null && lucrare.ramase === null);
  const scurs =
    lucrare.inceputLa === null ? null : formatClock((acum - Date.parse(lucrare.inceputLa)) / 1000);
  // Sub un minut ceasul devine avertisment: la examen ultimele secunde sunt
  // exact momentul în care contează să le vezi.
  const peSfarsite = lucrare.ramase !== null && lucrare.ramase <= 60;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
      <button
        type="button"
        className="btn-ghost tinta-tactila"
        onClick={() => go('acasa')}
        style={{ padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
      >
        ← Lasă lucrarea
      </button>
      <div style={{ flex: 1, minWidth: 140 }}>
        <div style={{ font: `600 13.5px/1.2 ${SANS}` }}>{titluMod(lucrare.mod)}</div>
        <div style={{ marginTop: 3, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
          {detaliuLucrare(lucrare.total, lucrare.nrCerut)}
          {lucrare.ramase === null ? ' · fără limită de timp' : ''}
        </div>
      </div>
      {lucrare.ramase !== null ? (
        <div
          className="tabular"
          aria-label="Timp rămas"
          style={{
            font: `600 15px ${SANS}`,
            color: peSfarsite ? 'var(--bad)' : 'var(--fg)',
            padding: '6px 11px',
            borderRadius: 8,
            background: peSfarsite ? 'var(--badS)' : 'var(--surf2)',
          }}
        >
          {formatClock(lucrare.ramase)}
        </div>
      ) : (
        scurs !== null && (
          <div className="tabular" aria-label="Timp scurs" style={{ font: `500 13px ${SANS}`, color: 'var(--fg2)' }}>
            {scurs}
          </div>
        )
      )}
      <button
        type="button"
        className="btn-ghost tinta-tactila"
        onClick={lucrare.preda}
        style={{ padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
      >
        Predă lucrarea
      </button>
    </div>
  );
}

/** Navigatorul: unde ai ajuns, ce ai marcat, ce ai verificat. */
function Navigator({ lucrare }: { lucrare: Lucrarea }) {
  const { start, end } = navWindow(lucrare.qi, lucrare.total);
  const peLoc = verificaPeLoc(lucrare.mod);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 200 }}>
        {Array.from({ length: end - start }, (_, k) => {
          const i = start + k;
          const g = lucrare.grile[i]!;
          const curenta = i === lucrare.qi;
          // La simulare nu se știe încă ce e corect, deci pastila spune doar
          // „ai răspuns" — a colora corect/greșit ar fi chiar scurgerea pe care
          // motorul a fost mutat pe server ca s-o oprească.
          const stare = peLoc && g.verificata ? (g.aleasa === g.correct ? 'ok' : 'bad') : g.aleasa ? 'dat' : 'gol';
          const fundal =
            stare === 'ok' ? 'var(--okS)' : stare === 'bad' ? 'var(--badS)' : stare === 'dat' ? 'var(--brandS)' : 'var(--surf2)';
          const culoare =
            stare === 'ok' ? 'var(--ok)' : stare === 'bad' ? 'var(--bad)' : stare === 'dat' ? 'var(--brand)' : 'var(--fg3)';
          return (
            <button
              key={i}
              type="button"
              className="tinta-tactila"
              onClick={() => lucrare.mergiLa(i)}
              aria-label={`Grila ${i + 1}`}
              aria-current={curenta ? 'true' : undefined}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                cursor: 'pointer',
                font: `600 12.5px ${SANS}`,
                border: `1.5px solid ${curenta ? 'var(--brand)' : g.marcata ? 'var(--acc)' : 'var(--line)'}`,
                background: fundal,
                color: culoare,
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="tabular" style={{ font: `500 12.5px ${SANS}`, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>
        Grila {lucrare.qi + 1} din {lucrare.total}
      </div>
    </div>
  );
}

/** O grilă retrasă din bibliotecă după generare: poziția rămâne, golul se vede. */
const GrilaLipsa = ({ pozitie }: { pozitie: number }) => (
  <div className="card" style={{ padding: 26 }}>
    <EmptyState
      title={`Grila ${pozitie + 1} nu mai există`}
      hint="A fost retrasă din bibliotecă după ce lucrarea a fost compusă. Poziția rămâne, ca restul să nu se renumeroteze."
      padding="10px 0"
    />
  </div>
);

function CardGrila({ lucrare, grila }: { lucrare: Lucrarea; grila: GrilaLucrare }) {
  const { tipuri, taxonomie } = useApp();
  if (grila.text === null) return <GrilaLipsa pozitie={grila.pozitie} />;

  const peLoc = verificaPeLoc(lucrare.mod);
  const aratatRaspunsul = peLoc && grila.verificata;
  const corect = grila.aleasa === grila.correct;
  const tip = grila.tipId === null ? undefined : tipuri.tip(grila.tipId);
  const ultima = lucrare.qi === lucrare.total - 1;

  return (
    <div className="card" style={{ padding: 26 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {grila.tipId !== null && (
          <span
            style={{
              ...eyebrow('var(--brand)'),
              letterSpacing: '.1em',
              background: 'var(--brandS)',
              borderRadius: 6,
              padding: '6px 9px',
            }}
          >
            {tipuri.eticheta(grila.tipId)}
          </span>
        )}
        {grila.capId !== null && (
          <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
            {taxonomie.numeMaterie(grila.capId)} · {taxonomie.eticheta(grila.capId)}
          </span>
        )}
        <button
          type="button"
          className="tinta-tactila"
          onClick={lucrare.comutaSemn}
          aria-pressed={grila.marcata}
          style={{
            marginLeft: 'auto',
            padding: '6px 11px',
            border: `1px solid ${grila.marcata ? 'var(--acc)' : 'var(--line)'}`,
            borderRadius: 8,
            background: grila.marcata ? 'var(--accS)' : 'transparent',
            color: grila.marcata ? 'var(--acc)' : 'var(--fg3)',
            font: `500 12px ${SANS}`,
            cursor: 'pointer',
          }}
        >
          {grila.marcata ? '★ Marcată' : '☆ Marchează'}
        </button>
      </div>

      <p style={{ margin: '18px 0 0', font: `400 21px/1.45 ${SERIF}`, color: 'var(--fg)', textWrap: 'pretty' }}>
        {grila.text}
      </p>

      {grila.enunturi && (
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
          {grila.enunturi.map((t, i) => (
            <div key={t} style={{ display: 'flex', gap: 10, font: `400 14.5px/1.5 ${SANS}`, color: 'var(--fg2)' }}>
              <span style={{ fontWeight: 600, color: 'var(--fg)', flex: '0 0 auto' }}>{i + 1}.</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}

      <AnswerOptions
        question={{ opts: grila.opts, ...(grila.correct === undefined ? {} : { correct: grila.correct }) }}
        tip={tip}
        answer={grila.aleasa ?? undefined}
        revealed={aratatRaspunsul}
        onPick={lucrare.alege}
      />

      {aratatRaspunsul && <Explicatia grila={grila} corect={corect} />}

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
          className="btn-ghost tinta-tactila"
          onClick={lucrare.inapoi}
          disabled={lucrare.qi === 0}
          style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
        >
          Înapoi
        </button>
        <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)', marginLeft: 2 }}>
          {lucrare.seSalveaza ? 'Se salvează…' : 'Taste: A–E pentru răspuns, Enter mai departe'}
        </span>
        <button
          type="button"
          className="btn-primary tinta-tactila"
          onClick={lucrare.principal}
          disabled={peLoc && !grila.verificata && grila.aleasa === null}
          style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
        >
          {peLoc && !grila.verificata
            ? 'Verifică răspunsul'
            : ultima
              ? 'Predă lucrarea →'
              : 'Următoarea grilă →'}
        </button>
      </div>
    </div>
  );
}

function Explicatia({ grila, corect }: { grila: GrilaLucrare; corect: boolean }) {
  return (
    <div
      style={{
        marginTop: 18,
        padding: 18,
        borderRadius: 12,
        border: `1px solid ${corect ? 'var(--ok)' : 'var(--bad)'}`,
        background: corect ? 'var(--okS)' : 'var(--badS)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span
          aria-hidden="true"
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            font: `600 13px ${SANS}`,
            background: corect ? 'var(--ok)' : 'var(--bad)',
            color: 'var(--onBrand)',
          }}
        >
          {corect ? '✓' : '✕'}
        </span>
        <span style={{ font: `600 14.5px ${SANS}`, color: 'var(--fg)' }}>
          {corect ? 'Corect. Ai reținut bine noțiunea.' : 'Greșit — hai să vedem de ce.'}
        </span>
        <span style={{ marginLeft: 'auto', font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
          Răspuns corect: {grila.correct}
        </span>
      </div>

      {grila.expl && (
        <p style={{ margin: '12px 0 0', font: `400 14px/1.6 ${SANS}`, color: 'var(--fg2)', textWrap: 'pretty' }}>
          {grila.expl}
        </p>
      )}

      {grila.why && Object.keys(grila.why).length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line2)' }}>
          <div style={{ ...eyebrow(), letterSpacing: '.1em' }}>De ce fiecare variantă</div>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {grila.opts.map(([k]) => (
              <div key={k} style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <span
                  style={{
                    flex: '0 0 auto',
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    display: 'grid',
                    placeItems: 'center',
                    font: `600 12px ${SANS}`,
                    background: k === grila.correct ? 'var(--ok)' : 'var(--surf3)',
                    color: k === grila.correct ? 'var(--onBrand)' : 'var(--fg3)',
                  }}
                >
                  {k}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, font: `400 13.5px/1.55 ${SANS}`, color: 'var(--fg2)', textWrap: 'pretty' }}>
                    {grila.why?.[k]}
                  </p>
                  {grila.aleasa === k && (
                    <span style={{ display: 'inline-block', marginTop: 5, font: `500 11px ${SANS}`, color: 'var(--fg3)' }}>
                      Varianta aleasă de tine
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Rulare({ lucrare }: { lucrare: Lucrarea }) {
  // Tastele A–E aleg varianta, Enter duce mai departe — ca la `Grile`, fiindcă
  // e același gest, nu fiindcă e același cod.
  //
  // Dependințele sunt cele două funcții, nu obiectul întreg: la o lucrare cu
  // ceas `lucrare` capătă altă identitate la fiecare secundă (`ramase` e una
  // dintre dependințele memo-ului lui), deci ascultătorul s-ar re-abona o dată
  // pe secundă degeaba.
  const { alege, principal } = lucrare;
  useEffect(() => {
    const laTasta = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tinta = e.target as HTMLElement | null;
      if (tinta && /^(INPUT|TEXTAREA|SELECT)$/.test(tinta.tagName)) return;

      const k = e.key.toUpperCase();
      if (k.length === 1 && (OPTION_KEYS as string[]).includes(k)) {
        alege(k as OptionKey);
        e.preventDefault();
      } else if (e.key === 'Enter') {
        principal();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', laTasta);
    return () => window.removeEventListener('keydown', laTasta);
  }, [alege, principal]);

  const grila = lucrare.grila;
  if (grila === null) return null;

  return (
    <div className="screen">
      <Antet lucrare={lucrare} />
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Navigator lucrare={lucrare} />
        {/* Eroarea unui răspuns nu răstoarnă lucrarea: rămâne pe ecran, iar
            mesajul stă lângă ea, ca răspunsul să poată fi retrimis. */}
        {lucrare.eroare !== null && (
          <div
            role="alert"
            style={{
              marginBottom: 14,
              padding: '11px 14px',
              borderRadius: 10,
              border: '1px solid var(--bad)',
              background: 'var(--badS)',
              font: `500 12.5px ${SANS}`,
              color: 'var(--bad)',
            }}
          >
            Nu am putut salva ultimul răspuns. Verifică-ți conexiunea și încearcă din nou.
          </div>
        )}
        <CardGrila lucrare={lucrare} grila={grila} />
      </div>
    </div>
  );
}

function Rezultat({ lucrare }: { lucrare: Lucrarea }) {
  const { go } = useApp();
  const progres = useProgressOptional();
  const scor = lucrare.scor;
  const runId = scor?.run_id ?? null;

  // Progresul se reîncarcă o singură dată per lucrare predată: jurnalul tocmai
  // s-a schimbat, iar `Acasă` și `Statistici` citesc din el. Fără marcaj,
  // efectul ar reporni la fiecare randare în care `progres` capătă altă
  // identitate — adică exact după reîncărcarea pe care tocmai a cerut-o.
  const reincarcatPentru = useRef<string | null>(null);
  const reload = progres?.reload;
  useEffect(() => {
    if (runId === null || reincarcatPentru.current === runId) return;
    reincarcatPentru.current = runId;
    void reload?.();
  }, [reload, runId]);

  if (scor === null) return <SeIncarca />;

  const pct = scor.pct;
  const culoare = pct === null ? 'var(--fg)' : pct >= 80 ? 'var(--ok)' : pct >= 65 ? 'var(--brand)' : 'var(--bad)';
  const faraRaspuns = lucrare.grile.filter((g) => g.aleasa === null).length;

  const dale: [string, string, string][] = [
    ['Corecte', String(scor.corecte), 'var(--ok)'],
    ['Greșite', String(scor.gresite), 'var(--bad)'],
    ['Fără răspuns', String(faraRaspuns), 'var(--fg3)'],
  ];

  return (
    <div className="screen">
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => go('acasa')}
          style={{ marginBottom: 18, padding: '9px 14px', font: `500 13px ${SANS}`, background: 'var(--surf)' }}
        >
          ← Înapoi acasă
        </button>

        <div className="card" style={{ padding: 26 }}>
          <div style={eyebrow('var(--brand)')}>{titluMod(lucrare.mod)} · predată</div>
          <h1 style={{ margin: '8px 0 0', font: `500 30px/1.15 ${SERIF}`, color: 'var(--fg)' }}>Rezultatul tău</h1>

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            {/* Procentul lipsește la lucrările mutate din tabelele vechi: n-au
                numitor, iar un zero pus acolo ar fi o notă inventată. */}
            {pct !== null && (
              <span className="tabular" style={{ font: `600 46px/1 ${SERIF}`, color: culoare }}>
                {pct}%
              </span>
            )}
            <span style={{ font: `400 14px ${SANS}`, color: 'var(--fg2)' }}>
              {frazaScor(scor.corecte, scor.nr_cerut)}
            </span>
          </div>

          {pct !== null && (
            <div style={{ marginTop: 14 }}>
              <Progress pct={pct} height={8} color={culoare} label={`Scor ${pct}%`} />
            </div>
          )}

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

          <div style={{ marginTop: 12, font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>
            {frazaFaraRaspuns(faraRaspuns)}
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
            <ButonTestNou text="Compune alt test" />
          </div>
        </div>

        <PasulUrmator gresite={scor.gresite} />

        {/* Recitirea: fiecare grilă cu răspunsul ei, acum că au fost câștigate. */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {lucrare.grile.map((g) => (
            <RandRecitire key={g.pozitie} grila={g} />
          ))}
        </div>
      </div>
    </div>
  );
}

function RandRecitire({ grila }: { grila: GrilaLucrare }) {
  const { taxonomie } = useApp();
  const corect = grila.aleasa !== null && grila.aleasa === grila.correct;
  const culoare = grila.aleasa === null ? 'var(--fg3)' : corect ? 'var(--ok)' : 'var(--bad)';

  return (
    <div className="card-flat" style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="tabular" style={{ font: `600 13px ${SANS}`, color: culoare }}>
          {grila.pozitie + 1}.
        </span>
        <span style={{ flex: 1, minWidth: 0, font: `400 15px/1.5 ${SERIF}`, color: 'var(--fg)' }}>
          {grila.text ?? 'Grila a fost retrasă din bibliotecă.'}
        </span>
        {grila.capId !== null && (
          <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>{taxonomie.eticheta(grila.capId)}</span>
        )}
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', font: `400 12.5px ${SANS}` }}>
        <span style={{ color: culoare }}>
          {grila.aleasa === null ? 'Fără răspuns' : `Ai ales ${grila.aleasa}`}
        </span>
        {grila.correct !== undefined && (
          <span style={{ color: 'var(--fg3)' }}>Corect: {grila.correct}</span>
        )}
      </div>
      {grila.expl && (
        <p style={{ margin: '10px 0 0', font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)', textWrap: 'pretty' }}>
          {grila.expl}
        </p>
      )}
    </div>
  );
}
