import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { PoartaContinut } from '../../components/PoartaContinut';
import { chapterLabel, type ChapterId, type MaterieId } from '../../data/chapters';
import { numaraGrile } from '../../lib/continut';
import { codEroare, genereazaTest, numaraCandidati } from '../../lib/lucrari';
import { listaTestePredefinite, type TestPredefinitPublic } from '../../lib/testePredefinite';
import { goLucrare, useIntentieTestNou, type IntentieTestNou } from '../../lib/router';
import { numar } from '../../lib/text';
import { SANS, eyebrow, pageLead, pageTitle } from '../../lib/ui';
import { useApp } from '../../state/appContextValue';
import { useToast } from '../../state/toastState';
import { mesajCodLucrare } from '../lucrareText';
import {
  MODURI,
  cerereDin,
  cuModul,
  descriereMod,
  filtreDin,
  frazaCapitoleAlese,
  frazaDisponibile,
  frazaIncepe,
  frazaScurta,
  nrValid,
  pasVecin,
  pasiVizibili,
  stareInitiala,
  type ModAsistent,
  type PasAsistent,
  type StareAsistent,
} from './asistent';

/**
 * Asistentul care compune un test.
 *
 * Deosebirea față de `GrileConfig` și `SimConfig` nu e numărul de pași, e cine
 * alege grilele: acolo clientul filtra biblioteca pe care o avea deja în
 * memorie, aici cererea pleacă la `genereaza_test` și se întoarce cu o lucrare
 * scrisă. De asta contorul de sub filtre e o interogare, nu o numărătoare
 * locală — și de asta o grilă la care n-ai drept nu e un rând ascuns, ci nu e
 * rând deloc.
 */
export function TestNou() {
  const intentie = useIntentieTestNou();
  return (
    <PoartaContinut>
      <Asistent key={`${intentie.mod}:${intentie.capitol ?? ''}`} intentie={intentie} />
    </PoartaContinut>
  );
}

/**
 * Contorul viu.
 *
 * Se cheamă la fiecare schimbare de filtre, dar nu la fiecare tastă: cererile
 * se amână puțin, iar un răspuns care ajunge după altul mai nou se aruncă.
 * Fără garda a doua, două cereri pornite la 30 ms distanță pot ajunge în ordine
 * inversă și lasă pe ecran numărul filtrelor de dinainte.
 */
function useNumarCandidati(filtre: ReturnType<typeof filtreDin>, activ = true) {
  const [total, setTotal] = useState<number | null>(null);
  const [seIncarca, setSeIncarca] = useState(true);
  const cheie = JSON.stringify(filtre);
  const ultima = useRef(0);

  useEffect(() => {
    if (!activ) {
      setTotal(null);
      setSeIncarca(false);
      return;
    }
    const alMeu = ++ultima.current;
    setSeIncarca(true);
    const t = setTimeout(() => {
      void numaraCandidati(JSON.parse(cheie) as ReturnType<typeof filtreDin>)
        .then((r) => {
          if (alMeu !== ultima.current) return;
          setTotal(r.total);
          setSeIncarca(false);
        })
        .catch(() => {
          if (alMeu !== ultima.current) return;
          setTotal(null);
          setSeIncarca(false);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [activ, cheie]);

  return { total, seIncarca };
}

function useTestePredefinite() {
  const [teste, setTeste] = useState<TestPredefinitPublic[]>([]);
  const [seIncarca, setSeIncarca] = useState(true);

  useEffect(() => {
    let viu = true;
    void listaTestePredefinite()
      .then((r) => {
        if (viu) setTeste(r);
      })
      .catch(() => {
        if (viu) setTeste([]);
      })
      .finally(() => {
        if (viu) setSeIncarca(false);
      });
    return () => {
      viu = false;
    };
  }, []);

  return { teste, seIncarca };
}

/** Câte grile are fiecare mod, o singură dată la deschidere. */
function useNumarPeMod() {
  const [pe, setPe] = useState<Partial<Record<ModAsistent, number>>>({});

  useEffect(() => {
    let viu = true;
    void Promise.all(
      MODURI.filter((m) => m.id !== 'test_predefinit').map(async (m) => {
        try {
          const r = await numaraCandidati({ mod: m.id, filtre: { materii: [], capitole: [] } });
          return [m.id, r.total] as const;
        } catch {
          // Un mod al cărui contor n-a răspuns rămâne fără cifră, nu cu zero:
          // zero ar închide cardul pentru un mod care are grile.
          return null;
        }
      }),
    ).then((randuri) => {
      if (!viu) return;
      setPe(Object.fromEntries(randuri.filter((r) => r !== null)));
    });
    return () => {
      viu = false;
    };
  }, []);

  return pe;
}

function Asistent({ intentie }: { intentie: IntentieTestNou }) {
  const { catalog, taxonomie } = useApp();
  const { notify } = useToast();
  const [stare, setStare] = useState<StareAsistent>(() =>
    stareInitiala(
      intentie.mod,
      intentie.capitol === null ? [] : [intentie.capitol as ChapterId],
    ),
  );
  const [pas, setPas] = useState<PasAsistent>('mod');
  const [seGenereaza, setSeGenereaza] = useState(false);

  const { peCapitol } = useMemo(() => numaraGrile(catalog, taxonomie), [catalog, taxonomie]);
  const capitoleCuGrile = useMemo(
    () => taxonomie.capitole.filter((c) => (peCapitol.get(c.id) ?? 0) > 0).length,
    [peCapitol, taxonomie.capitole],
  );

  const pasi = pasiVizibili(stare, { capitoleCuGrile });
  // Pasul curent poate dispărea sub picioare — se schimbă modul din rezumat și
  // `continut` iese din listă. Atunci se cade pe primul pas real, nu pe gol.
  const pasCurent = pasi.includes(pas) ? pas : pasi[0]!;

  const { teste, seIncarca: seIncarcaTeste } = useTestePredefinite();
  const testAles = teste.find((t) => t.id === stare.testId) ?? null;
  const ePredefinit = stare.mod === 'test_predefinit';
  const contor = useNumarCandidati(filtreDin(stare), !ePredefinit);
  const total = ePredefinit ? (testAles?.nr_grile ?? null) : contor.total;
  const seIncarca = ePredefinit ? seIncarcaTeste : contor.seIncarca;
  const peMod = useNumarPeMod();

  const inainte = () => {
    const urmator = pasVecin(pasi, pasCurent, 1);
    if (urmator !== null) setPas(urmator);
  };
  const inapoi = () => {
    const anterior = pasVecin(pasi, pasCurent, -1);
    if (anterior !== null) setPas(anterior);
  };

  const genereaza = useCallback(async () => {
    setSeGenereaza(true);
    try {
      const r = await genereazaTest(cerereDin(stare));
      goLucrare(r.run_id);
    } catch (e) {
      const cod = codEroare(e);
      notify(
        'eroare',
        cod === 'fara_candidati'
          ? 'Nicio grilă nu se potrivește cu ce ai ales.'
          : mesajCodLucrare(cod),
      );
      setSeGenereaza(false);
    }
  }, [notify, stare]);

  return (
    <div className="screen">
      <h1 style={pageTitle}>Test nou</h1>
      <p style={{ ...pageLead, marginBottom: 20 }}>
        Alege ce fel de test vrei, din ce anume, și cât de lung. Numărul de sub fiecare pas e cel
        adevărat — se numără în bibliotecă, nu se estimează.
      </p>

      <div className="card" style={{ padding: 22, maxWidth: 720 }}>
        <Indicator pasi={pasi} curent={pasCurent} />

        <div style={{ marginTop: 22 }}>
          {pasCurent === 'mod' && (
            <PasulMod
              stare={stare}
              peMod={peMod}
              nrTeste={teste.length}
              seIncarcaTeste={seIncarcaTeste}
              onAlege={(m) => {
                setStare((s) => cuModul(s, m));
                const urmator = pasVecin(pasiVizibili(cuModul(stare, m), { capitoleCuGrile }), 'mod', 1);
                if (urmator !== null) setPas(urmator);
              }}
            />
          )}
          {pasCurent === 'test' && (
            <PasulTestPredefinit
              teste={teste}
              ales={stare.testId}
              onAlege={(id) => setStare((s) => ({ ...s, testId: id }))}
            />
          )}
          {pasCurent === 'continut' && (
            <PasulContinut stare={stare} peCapitol={peCapitol} setStare={setStare} />
          )}
          {pasCurent === 'configurare' && <PasulConfigurare stare={stare} setStare={setStare} />}
          {pasCurent === 'rezumat' && <PasulRezumat stare={stare} total={total} test={testAles} />}
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
            {seIncarca
              ? ePredefinit ? 'Se încarcă testele…' : 'Se numără…'
              : ePredefinit && testAles === null
                ? numar(teste.length, 'test disponibil', 'teste disponibile')
                : total === null
                  ? 'Numărul n-a putut fi aflat'
                  : frazaDisponibile(total)}
          </span>
          {pasCurent !== 'mod' && (
            <button
              type="button"
              className="btn-ghost tinta-tactila"
              onClick={inapoi}
              style={{ padding: '11px 15px', font: `500 13.5px ${SANS}` }}
            >
              ← Înapoi
            </button>
          )}
          {pasCurent === 'rezumat' ? (
            <button
              type="button"
              className="btn-primary tinta-tactila"
              onClick={() => void genereaza()}
              disabled={
                seGenereaza ||
                total === 0 ||
                (ePredefinit ? testAles === null || !testAles.disponibil : !nrValid(stare.nr))
              }
              style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
            >
              {seGenereaza
                ? 'Se compune…'
                : frazaIncepe(
                    ePredefinit
                      ? (testAles?.nr_grile ?? 0)
                      : total === null ? stare.nr : Math.min(stare.nr, total),
                  )}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary tinta-tactila"
              onClick={inainte}
              disabled={pasCurent === 'test' && testAles === null}
              style={{ marginLeft: 'auto', padding: '12px 20px', font: `600 14px ${SANS}` }}
            >
              Mai departe →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const NUME_PAS: Record<PasAsistent, string> = {
  mod: 'Fel',
  test: 'Test',
  continut: 'Conținut',
  configurare: 'Configurare',
  rezumat: 'Rezumat',
};

function Indicator({ pasi, curent }: { pasi: PasAsistent[]; curent: PasAsistent }) {
  const i = pasi.indexOf(curent);
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {pasi.map((p, k) => (
        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              font: `600 11.5px ${SANS}`,
              letterSpacing: '.06em',
              textTransform: 'uppercase',
              color: k === i ? 'var(--brand)' : k < i ? 'var(--fg2)' : 'var(--fg3)',
            }}
          >
            {NUME_PAS[p]}
          </span>
          {k < pasi.length - 1 && <span style={{ color: 'var(--line2)' }}>›</span>}
        </div>
      ))}
    </div>
  );
}

function PasulMod({
  stare,
  peMod,
  nrTeste,
  seIncarcaTeste,
  onAlege,
}: {
  stare: StareAsistent;
  peMod: Partial<Record<ModAsistent, number>>;
  nrTeste: number;
  seIncarcaTeste: boolean;
  onAlege: (m: ModAsistent) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={eyebrow(undefined, 11)}>Ce fel de test</div>
      {MODURI.map((m) => {
        const ePredefinit = m.id === 'test_predefinit';
        const n = ePredefinit ? (seIncarcaTeste ? undefined : nrTeste) : peMod[m.id];
        const gol = n === 0;
        const ales = stare.mod === m.id;
        return (
          <button
            key={m.id}
            type="button"
            className="row-btn tinta-tactila"
            onClick={() => onAlege(m.id)}
            disabled={gol}
            aria-pressed={ales}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '13px 14px',
              borderRadius: 11,
              textAlign: 'left',
              border: `1.5px solid ${ales ? 'var(--brand)' : 'var(--line)'}`,
              background: ales ? 'var(--brandS)' : 'var(--surf)',
              opacity: gol ? 0.6 : 1,
              cursor: gol ? 'not-allowed' : 'pointer',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `600 14px ${SANS}`, color: 'var(--fg)' }}>{m.titlu}</div>
              <div style={{ marginTop: 4, font: `400 12.5px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
                {/* Un mod gol spune ce lipsește, nu arată un lacăt. */}
                {gol ? m.motivGol : m.detaliu}
              </div>
            </div>
            <span style={{ flex: '0 0 auto', font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
              {n === undefined
                ? ''
                : ePredefinit
                  ? numar(n, 'test', 'teste')
                  : numar(n, 'grilă', 'grile')}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PasulTestPredefinit({
  teste,
  ales,
  onAlege,
}: {
  teste: TestPredefinitPublic[];
  ales: string | null;
  onAlege: (id: string) => void;
}) {
  if (teste.length === 0) {
    return (
      <EmptyState
        title="Niciun test pregătit încă"
        hint="Când echipa publică o lucrare oficială sau o simulare, apare aici automat."
        padding="10px 0"
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={eyebrow(undefined, 11)}>Alege lucrarea</div>
      {teste.map((t) => {
        const activ = ales === t.id;
        return (
          <button
            key={t.id}
            type="button"
            className="row-btn tinta-tactila"
            disabled={!t.disponibil}
            aria-pressed={activ}
            onClick={() => onAlege(t.id)}
            style={{
              padding: '13px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              borderRadius: 11,
              textAlign: 'left',
              border: `1.5px solid ${activ ? 'var(--brand)' : 'var(--line)'}`,
              background: activ ? 'var(--brandS)' : 'var(--surf)',
              opacity: t.disponibil ? 1 : 0.6,
              cursor: t.disponibil ? 'pointer' : 'not-allowed',
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', font: `600 14px ${SANS}` }}>{t.nume}</span>
              <span style={{ display: 'block', marginTop: 4, font: `400 12.5px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
                {!t.disponibil
                  ? 'Necesită acces premium'
                  : t.descriere || (t.mod_selectie === 'fix' ? 'Lucrare în ordine fixă' : 'Variantă nouă la fiecare pornire')}
              </span>
            </span>
            <span style={{ flex: '0 0 auto', textAlign: 'right', font: `400 12px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
              {numar(t.nr_grile, 'grilă', 'grile')}
              {t.durata_minute !== null && <><br />{numar(t.durata_minute, 'minut', 'minute')}</>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PasulContinut({
  stare,
  peCapitol,
  setStare,
}: {
  stare: StareAsistent;
  peCapitol: ReadonlyMap<ChapterId, number>;
  setStare: (f: (s: StareAsistent) => StareAsistent) => void;
}) {
  const { taxonomie } = useApp();

  const comutaCapitol = (id: ChapterId) =>
    setStare((s) => ({
      ...s,
      capitole: s.capitole.includes(id) ? s.capitole.filter((c) => c !== id) : [...s.capitole, id],
    }));

  const comutaMaterie = (id: MaterieId) =>
    setStare((s) => ({
      ...s,
      materii: s.materii.includes(id) ? s.materii.filter((m) => m !== id) : [...s.materii, id],
    }));

  const cuCapitole = taxonomie.materii.filter((m) =>
    m.list.some((c) => (peCapitol.get(c.id) ?? 0) > 0),
  );

  if (cuCapitole.length === 0) {
    return (
      <EmptyState
        title="Nicio materie n-are încă grile publicate"
        hint="Testul se compune din ce e scris în bibliotecă. Adaugă grile din Administrare și pasul ăsta se umple singur."
        padding="10px 0"
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <div style={eyebrow(undefined, 11)}>Materii</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cuCapitole.map((m) => {
            const activ = stare.materii.includes(m.id);
            // O materie bifată n-are efect cât timp sunt alese capitole anume:
            // filtrele se compun cu „și", deci ar restrânge, nu ar adăuga.
            const inactivat = stare.capitole.length > 0;
            return (
              <button
                key={m.id}
                type="button"
                className="tinta-tactila"
                onClick={() => comutaMaterie(m.id)}
                disabled={inactivat}
                aria-pressed={activ}
                style={{
                  padding: '10px 15px',
                  border: `1px solid ${activ && !inactivat ? 'var(--brand)' : 'var(--line)'}`,
                  borderRadius: 10,
                  cursor: inactivat ? 'not-allowed' : 'pointer',
                  opacity: inactivat ? 0.45 : 1,
                  font: `${activ ? 600 : 500} 13.5px ${SANS}`,
                  background: activ && !inactivat ? 'var(--brand)' : 'var(--surf)',
                  color: activ && !inactivat ? 'var(--onBrand)' : 'var(--fg2)',
                }}
              >
                {m.name}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 8, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
          {stare.capitole.length > 0
            ? 'Ai ales capitole anume, deci materiile nu mai schimbă nimic.'
            : 'Nicio materie bifată înseamnă toate.'}
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={eyebrow(undefined, 11)}>Capitole</div>
          <span style={{ font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
            {frazaCapitoleAlese(stare.capitole.length)}
          </span>
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {cuCapitole.flatMap((m) =>
            m.list.map((c) => {
              const grile = peCapitol.get(c.id) ?? 0;
              if (grile === 0) return [];
              const ales = stare.capitole.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  className="row-btn tinta-tactila"
                  onClick={() => comutaCapitol(c.id)}
                  aria-pressed={ales}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 8px',
                    borderRadius: 9,
                    cursor: 'pointer',
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
                    {m.name} · {chapterLabel(c)}
                  </span>
                  {/* Cifra e a bibliotecii, nu a modului: la „Grile noi" o parte
                      dintre ele sunt deja văzute. Totalul adevărat pentru
                      filtrele alese e cel de jos, care vine de la server. */}
                  <span style={{ font: `400 12px ${SANS}`, color: 'var(--fg3)' }}>
                    {numar(grile, 'grilă', 'grile')}
                  </span>
                </button>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}

const PRESETURI = [10, 20, 30, 50, 100];

function PasulConfigurare({
  stare,
  setStare,
}: {
  stare: StareAsistent;
  setStare: (f: (s: StareAsistent) => StareAsistent) => void;
}) {
  const areCeas = stare.durataMinute !== null;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div>
        <div style={eyebrow(undefined, 11)}>Câte grile</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {PRESETURI.map((n) => (
            <button
              key={n}
              type="button"
              className="tinta-tactila"
              onClick={() => setStare((s) => ({ ...s, nr: n }))}
              aria-pressed={stare.nr === n}
              style={{
                padding: '9px 14px',
                border: `1px solid ${stare.nr === n ? 'var(--brand)' : 'var(--line)'}`,
                borderRadius: 9,
                cursor: 'pointer',
                font: `${stare.nr === n ? 600 : 500} 13px ${SANS}`,
                background: stare.nr === n ? 'var(--brand)' : 'var(--surf)',
                color: stare.nr === n ? 'var(--onBrand)' : 'var(--fg2)',
              }}
            >
              {n}
            </button>
          ))}
          <input
            className="field"
            type="number"
            min={1}
            max={300}
            value={stare.nr}
            aria-label="Numărul de grile"
            onChange={(e) => setStare((s) => ({ ...s, nr: Number(e.target.value) }))}
            style={{ width: 90, padding: '9px 11px', font: `500 13px ${SANS}` }}
          />
        </div>
        {!nrValid(stare.nr) && (
          <div style={{ marginTop: 8, font: `500 12px ${SANS}`, color: 'var(--bad)' }}>
            Alege un număr între 1 și 300.
          </div>
        )}
      </div>

      <div>
        <div style={eyebrow(undefined, 11)}>Timp</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="tinta-tactila"
            onClick={() => setStare((s) => ({ ...s, durataMinute: areCeas ? null : 180 }))}
            aria-pressed={areCeas}
            style={{
              padding: '9px 14px',
              border: `1px solid ${areCeas ? 'var(--brand)' : 'var(--line)'}`,
              borderRadius: 9,
              cursor: 'pointer',
              font: `500 13px ${SANS}`,
              background: areCeas ? 'var(--brandS)' : 'var(--surf)',
              color: areCeas ? 'var(--brand)' : 'var(--fg2)',
            }}
          >
            {areCeas ? 'Cu ceas' : 'Fără limită de timp'}
          </button>
          {areCeas && (
            <input
              className="field"
              type="number"
              min={1}
              max={600}
              value={stare.durataMinute ?? 180}
              aria-label="Durata în minute"
              onChange={(e) => setStare((s) => ({ ...s, durataMinute: Number(e.target.value) }))}
              style={{ width: 90, padding: '9px 11px', font: `500 13px ${SANS}` }}
            />
          )}
          {areCeas && <span style={{ font: `400 12.5px ${SANS}`, color: 'var(--fg3)' }}>minute</span>}
        </div>
        {areCeas && (
          <div style={{ marginTop: 8, font: `400 11.5px ${SANS}`, color: 'var(--fg3)' }}>
            Ceasul curge de la ora pornirii, deci merge și cu fila închisă.
          </div>
        )}
      </div>

      <div>
        <div style={eyebrow(undefined, 11)}>Ordine</div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
          <Bifa
            eticheta="Amestecă ordinea grilelor"
            valoare={stare.amestecaGrile}
            onSchimba={() => setStare((s) => ({ ...s, amestecaGrile: !s.amestecaGrile }))}
          />
          <Bifa
            eticheta="Amestecă ordinea variantelor"
            detaliu="Formatele cu variante fixe, ca la complementul grupat, rămân neatinse — acolo textul variantei e chiar cheia."
            valoare={stare.amestecaOptiuni}
            onSchimba={() => setStare((s) => ({ ...s, amestecaOptiuni: !s.amestecaOptiuni }))}
          />
        </div>
      </div>
    </div>
  );
}

function Bifa({
  eticheta,
  detaliu,
  valoare,
  onSchimba,
}: {
  eticheta: string;
  detaliu?: string;
  valoare: boolean;
  onSchimba: () => void;
}) {
  return (
    <button
      type="button"
      className="row-btn tinta-tactila"
      onClick={onSchimba}
      aria-pressed={valoare}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 8px',
        borderRadius: 9,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 20,
          height: 20,
          flex: '0 0 auto',
          marginTop: 1,
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          border: `1px solid ${valoare ? 'var(--brand)' : 'var(--line2)'}`,
          background: valoare ? 'var(--brand)' : 'transparent',
          color: 'var(--onBrand)',
        }}
      >
        {valoare && <Icon icon={faCheck} size={11} />}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', font: `500 13.5px ${SANS}` }}>{eticheta}</span>
        {detaliu && (
          <span style={{ display: 'block', marginTop: 4, font: `400 11.5px/1.5 ${SANS}`, color: 'var(--fg3)' }}>
            {detaliu}
          </span>
        )}
      </span>
    </button>
  );
}

function PasulRezumat({
  stare,
  total,
  test,
}: {
  stare: StareAsistent;
  total: number | null;
  test: TestPredefinitPublic | null;
}) {
  const { taxonomie } = useApp();
  const d = descriereMod(stare.mod);
  const scurt = stare.mod !== 'test_predefinit' && total !== null && total < stare.nr;

  const randuri: [string, string][] =
    stare.mod === 'test_predefinit' && test !== null
      ? [
          ['Fel', test.mod_selectie === 'fix' ? 'Lucrare cu ordine fixă' : 'Simulare cu variantă nouă'],
          ['Test', test.nume],
          ['Câte grile', numar(test.nr_grile, 'grilă', 'grile')],
          ['Timp', test.durata_minute === null ? 'Fără limită' : numar(test.durata_minute, 'minut', 'minute')],
          ['Acces', test.acces === 'premium' ? 'Premium' : 'Liber'],
        ]
      : [
          ['Fel', d.titlu],
          [
            'Din ce',
            stare.capitole.length > 0
              ? stare.capitole.map((c) => taxonomie.eticheta(c)).join(', ')
              : stare.materii.length > 0
                ? stare.materii.map((m) => taxonomie.materie(m)?.name ?? m).join(', ')
                : 'Toată biblioteca',
          ],
          ['Câte grile', numar(stare.nr, 'grilă', 'grile')],
          ['Timp', stare.durataMinute === null ? 'Fără limită' : numar(stare.durataMinute, 'minut', 'minute')],
          [
            'Ordine',
            [stare.amestecaGrile ? 'grile amestecate' : 'grile în ordinea bibliotecii',
             stare.amestecaOptiuni ? 'variante amestecate' : 'variante în ordinea lor'].join(' · '),
          ],
        ];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={eyebrow(undefined, 11)}>Cum arată testul</div>
      {test?.descriere && stare.mod === 'test_predefinit' && (
        <p style={{ margin: 0, font: `400 13px/1.55 ${SANS}`, color: 'var(--fg2)' }}>{test.descriere}</p>
      )}
      <div style={{ display: 'grid', gap: 2 }}>
        {randuri.map(([eticheta, valoare]) => (
          <div
            key={eticheta}
            style={{
              display: 'flex',
              gap: 14,
              padding: '10px 0',
              borderBottom: '1px solid var(--line)',
              font: `400 13.5px ${SANS}`,
            }}
          >
            <span style={{ flex: '0 0 110px', color: 'var(--fg3)' }}>{eticheta}</span>
            <span style={{ flex: 1, minWidth: 0, color: 'var(--fg)' }}>{valoare}</span>
          </div>
        ))}
      </div>

      {scurt && total > 0 && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--acc)',
            background: 'var(--accS)',
            font: `400 12.5px/1.6 ${SANS}`,
            color: 'var(--fg2)',
          }}
        >
          {frazaScurta(stare.nr, total)}
        </div>
      )}

      {total === 0 && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            border: '1px solid var(--bad)',
            background: 'var(--badS)',
            font: `400 12.5px/1.6 ${SANS}`,
            color: 'var(--fg2)',
          }}
        >
          {d.motivGol} Schimbă filtrele sau alege alt fel de test.
        </div>
      )}
    </div>
  );
}
