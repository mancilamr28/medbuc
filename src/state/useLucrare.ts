import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChapterId } from '../data/chapters';
import type { OptionKey, QuestionId } from '../data/questions';
import { useNow } from '../lib/hooks';
import {
  citesteTest,
  codEroare,
  predaTest,
  raspunde,
  type CodLucrare,
  type GrilaDinLucrare,
  type Lucrare,
  type ModTest,
  type ScorLucrare,
} from '../lib/lucrari';

/**
 * O lucrare rezolvată prin motorul din bază.
 *
 * Deosebirea față de `useSession` și `useSimulare` nu e de stil, e de proprietar:
 * acolo starea e a clientului și se sincronizează la final, aici **serverul e
 * adevărul** și fiecare atingere trece pe la el. De asta nu există aici nici
 * `localStorage`, nici o „bancă" în memorie — o lucrare se redeschide după id,
 * de pe orice dispozitiv, fiindcă nu s-a scris niciodată nicăieri altundeva.
 *
 * Ce se păstrează neschimbat din cele două: numărătoarea inversă se derivă
 * dintr-un `ends_at` absolut, niciodată dintr-un contor scăzut la fiecare
 * secundă, ca timpul să curgă și cu fila închisă.
 */

export type FazaLucrare = 'incarcare' | 'eroare' | 'rulare' | 'rezultat';

/** O grilă din lucrare, gata de randat. */
export interface GrilaLucrare {
  pozitie: number;
  questionId: QuestionId;
  /** Null când grila a fost ștearsă din bibliotecă după generare — poziția rămâne. */
  text: string | null;
  enunturi: string[] | null;
  tipId: string | null;
  capId: ChapterId | null;
  /** În ordinea lucrării, nu alfabetic. */
  opts: [OptionKey, string][];
  aleasa: OptionKey | null;
  verificata: boolean;
  marcata: boolean;
  /** Vin abia după verificare sau după predare — lipsa lor e informație, nu o scăpare. */
  correct?: OptionKey;
  expl?: string;
  why?: Partial<Record<OptionKey, string>>;
}

/**
 * Variantele în ordinea scrisă pe lucrare.
 *
 * `option_order` e ordinea rezolvată la generare, nu o sămânță: Postgres nu
 * garantează reproductibilitatea lui `setseed` între versiuni, deci „ține
 * sămânța și re-derivă" ar fi fost un bug latent. Null înseamnă ordinea
 * firească — fie n-a cerut nimeni amestecare, fie formatul o interzice.
 *
 * O literă din ordine care nu se regăsește printre variante e ignorată, iar o
 * variantă pe care ordinea n-o pomenește rămâne la coadă: o nepotrivire nu are
 * voie să facă variante să dispară de pe ecran.
 */
export function randuiesteOptiuni(
  optiuni: { key: OptionKey; text: string }[],
  ordine: OptionKey[] | null,
): [OptionKey, string][] {
  const perechi = optiuni.map((o): [OptionKey, string] => [o.key, o.text]);
  if (!ordine || ordine.length === 0) return perechi;

  const dupaCheie = new Map(perechi);
  const asezate = ordine.flatMap((k): [OptionKey, string][] => {
    const text = dupaCheie.get(k);
    return text === undefined ? [] : [[k, text]];
  });
  const puse = new Set(asezate.map(([k]) => k));
  return [...asezate, ...perechi.filter(([k]) => !puse.has(k))];
}

/** Rândul brut din `citeste_test`, adus la forma pe care o randează ecranul. */
export function grilaDin(g: GrilaDinLucrare): GrilaLucrare {
  return {
    pozitie: g.position,
    questionId: g.question_id,
    text: g.text,
    enunturi: g.enunturi,
    tipId: g.tip_id,
    capId: g.chapter_id,
    opts: randuiesteOptiuni(g.optiuni ?? [], g.option_order),
    aleasa: g.chosen,
    verificata: g.revealed,
    marcata: g.marked,
    ...(g.correct === undefined ? {} : { correct: g.correct }),
    ...(g.expl === undefined ? {} : { expl: g.expl }),
    ...(g.why === undefined ? {} : { why: g.why }),
  };
}

/**
 * Secundele rămase dintr-un `ends_at` absolut.
 *
 * Zero înseamnă expirat, `null` înseamnă lucrare fără ceas — două lucruri
 * diferite, care nu se pot amesteca într-un singur număr.
 */
export function secundeRamase(endsAt: string | null, acum: number): number | null {
  if (endsAt === null) return null;
  return Math.max(0, Math.round((Date.parse(endsAt) - acum) / 1000));
}

/** Modurile care își verifică grilele pe loc; oglindește `v_verific` din `raspunde`. */
export const verificaPeLoc = (mod: ModTest): boolean =>
  mod !== 'simulare' && mod !== 'test_predefinit';

export interface Lucrarea {
  faza: FazaLucrare;
  /** Codul erorii de încărcare, pentru ca ecranul să-l traducă în context. */
  cod: CodLucrare | null;
  eroare: string | null;
  mod: ModTest;
  nrCerut: number | null;
  /** Momentul pornirii, ca ecranul să poată arăta cât a trecut. */
  inceputLa: string | null;
  grile: GrilaLucrare[];
  total: number;
  qi: number;
  grila: GrilaLucrare | null;
  /** Secunde până la expirare; null la o lucrare fără ceas. */
  ramase: number | null;
  scor: ScorLucrare | null;
  /** Adevărat cât timp un răspuns e pe drum spre server. */
  seSalveaza: boolean;
  mergiLa: (i: number) => void;
  inainte: () => void;
  inapoi: () => void;
  alege: (k: OptionKey) => void;
  verifica: () => void;
  comutaSemn: () => void;
  preda: () => void;
  /** Enter: verifică, apoi treci mai departe, apoi predă pe ultima. */
  principal: () => void;
  reincarca: () => void;
}

interface Stare {
  faza: FazaLucrare;
  cod: CodLucrare | null;
  eroare: string | null;
  run: Lucrare['run'] | null;
  grile: GrilaLucrare[];
  scor: ScorLucrare | null;
}

const INITIALA: Stare = {
  faza: 'incarcare',
  cod: null,
  eroare: null,
  run: null,
  grile: [],
  scor: null,
};

const mesajul = (e: unknown): string =>
  e instanceof Error ? e.message : 'Nu am putut vorbi cu serverul.';

export function useLucrare(runId: string | null): Lucrarea {
  const [stare, setStare] = useState<Stare>(INITIALA);
  const [qi, setQi] = useState(0);
  const [seSalveaza, setSeSalveaza] = useState(false);
  const [reincarcari, setReincarcari] = useState(0);

  const run = stare.run;
  const mod: ModTest = run?.mod ?? 'exersare';
  const areCeas = run?.ends_at != null && run.finished_at === null;
  // Ceasul bate doar cât lucrarea e în curs — la fel ca la simulare, unde
  // `AppState` îl pornește doar pe ecranul ei.
  const acum = useNow(areCeas);
  const ramase = secundeRamase(run?.ends_at ?? null, acum);

  // Predarea se poate declanșa din două locuri (butonul și expirarea), iar
  // `preda_test` e idempotentă — dar o cursă între ele ar aduce două citiri și
  // ar clipi ecranul. Garda ține de randare, nu de corectitudinea din bază.
  const predaInCurs = useRef(false);

  const incarca = useCallback(async () => {
    if (runId === null) return;
    try {
      const l = await citesteTest(runId);
      const grile = l.grile.map(grilaDin);
      const predata = l.run.finished_at !== null;
      // O lucrare deja predată are un scor de arătat, iar `preda_test` e
      // idempotentă: îl întoarce fără să rescrie nimic.
      const scor = predata ? await predaTest(runId) : null;
      setStare({
        faza: predata ? 'rezultat' : 'rulare',
        cod: null,
        eroare: null,
        run: l.run,
        grile,
        scor,
      });
      setQi((prev) => (prev === 0 ? Math.min(l.run.qi, Math.max(0, grile.length - 1)) : prev));
    } catch (e) {
      setStare({ ...INITIALA, faza: 'eroare', cod: codEroare(e), eroare: mesajul(e) });
    }
  }, [runId]);

  useEffect(() => {
    setStare(INITIALA);
    setQi(0);
    void incarca();
  }, [incarca, reincarcari]);

  const total = stare.grile.length;
  const grila = stare.grile[qi] ?? null;

  const scrieGrila = useCallback((pozitie: number, peste: Partial<GrilaLucrare>) => {
    setStare((s) => ({
      ...s,
      grile: s.grile.map((g) => (g.pozitie === pozitie ? { ...g, ...peste } : g)),
    }));
  }, []);

  /**
   * Un drum către server, cu starea de salvare și eroarea tratate o singură
   * dată. Eroarea nu răstoarnă ecranul: lucrarea rămâne pe ecran, iar mesajul
   * apare lângă ea — un răspuns pierdut nu e un motiv să dispară lucrarea.
   */
  const trimite = useCallback(async (lucru: () => Promise<void>) => {
    setSeSalveaza(true);
    try {
      await lucru();
      setStare((s) => (s.eroare === null ? s : { ...s, eroare: null }));
    } catch (e) {
      setStare((s) => ({ ...s, eroare: mesajul(e) }));
    } finally {
      setSeSalveaza(false);
    }
  }, []);

  const mergiLa = useCallback(
    (i: number) => setQi(Math.max(0, Math.min(i, Math.max(0, total - 1)))),
    [total],
  );
  const inainte = useCallback(() => mergiLa(qi + 1), [mergiLa, qi]);
  const inapoi = useCallback(() => mergiLa(qi - 1), [mergiLa, qi]);

  /**
   * Alegerea unei variante.
   *
   * La exersare rămâne locală până la „Verifică": trimiterea ei *este*
   * verificarea, deci un clic pe o literă ar deschide răspunsul fără să-l fi
   * cerut nimeni. La simulare pleacă imediat — se poate schimba până la
   * predare, iar un răspuns netrimis se pierde la reîncărcarea filei.
   */
  const alege = useCallback(
    (k: OptionKey) => {
      if (grila === null || grila.verificata || stare.faza !== 'rulare') return;
      scrieGrila(grila.pozitie, { aleasa: k });
      if (verificaPeLoc(mod) || runId === null) return;
      void trimite(async () => {
        await raspunde({ runId, pozitie: grila.pozitie, aleasa: k });
      });
    },
    [grila, mod, runId, scrieGrila, stare.faza, trimite],
  );

  const verifica = useCallback(() => {
    if (runId === null || grila === null || grila.verificata || grila.aleasa === null) return;
    if (!verificaPeLoc(mod)) return;
    const pozitie = grila.pozitie;
    const aleasa = grila.aleasa;
    void trimite(async () => {
      const r = await raspunde({ runId, pozitie, aleasa });
      scrieGrila(pozitie, {
        verificata: true,
        ...(r.correct === undefined ? {} : { correct: r.correct }),
        ...(r.expl === undefined ? {} : { expl: r.expl }),
        ...(r.why === undefined ? {} : { why: r.why }),
      });
    });
  }, [grila, mod, runId, scrieGrila, trimite]);

  /**
   * Semnul pus pe o grilă.
   *
   * Varianta aleasă se retrimite neschimbată dinadins: la o grilă deja
   * verificată, `raspunde` ridică `raspuns_blocat` pentru orice altă valoare, iar
   * un `null` ar însemna „am șters răspunsul".
   */
  const comutaSemn = useCallback(() => {
    if (runId === null || grila === null || stare.faza !== 'rulare') return;
    const { pozitie, aleasa, marcata } = grila;
    scrieGrila(pozitie, { marcata: !marcata });
    void trimite(async () => {
      await raspunde({ runId, pozitie, aleasa, marcata: !marcata });
    });
  }, [grila, runId, scrieGrila, stare.faza, trimite]);

  const preda = useCallback(() => {
    if (runId === null || stare.faza !== 'rulare' || predaInCurs.current) return;
    predaInCurs.current = true;
    void trimite(async () => {
      try {
        const scor = await predaTest(runId);
        // Recitirea aduce răspunsurile corecte, care abia acum au fost câștigate.
        const l = await citesteTest(runId);
        setStare((s) => ({ ...s, faza: 'rezultat', run: l.run, grile: l.grile.map(grilaDin), scor }));
        setQi(0);
      } finally {
        predaInCurs.current = false;
      }
    });
  }, [runId, stare.faza, trimite]);

  /**
   * Expirarea încheie lucrarea, nu o pierde.
   *
   * Serverul spune deja același lucru la citire (`private.predata_la` întoarce
   * `ends_at` când a trecut), deci predarea de aici doar aduce rezultatul mai
   * devreme — cât e fila deschisă, elevul vede scorul în clipa în care sună.
   */
  useEffect(() => {
    if (stare.faza === 'rulare' && ramase === 0) preda();
  }, [preda, ramase, stare.faza]);

  const principal = useCallback(() => {
    if (grila === null) return;
    const ultima = qi === total - 1;
    if (verificaPeLoc(mod) && !grila.verificata) {
      if (grila.aleasa !== null) verifica();
      return;
    }
    if (ultima) preda();
    else inainte();
  }, [grila, inainte, mod, preda, qi, total, verifica]);

  const reincarca = useCallback(() => setReincarcari((n) => n + 1), []);

  // Obiectul se memoizează, ca la `useSession`/`useSimulare`: e o dependință a
  // memo-ului din ecran, iar un literal proaspăt la fiecare randare l-ar anula.
  return useMemo(
    () => ({
      faza: stare.faza,
      cod: stare.cod,
      eroare: stare.eroare,
      mod,
      nrCerut: run?.nr_cerut ?? null,
      inceputLa: run?.started_at ?? null,
      grile: stare.grile,
      total,
      qi,
      grila,
      ramase,
      scor: stare.scor,
      seSalveaza,
      mergiLa,
      inainte,
      inapoi,
      alege,
      verifica,
      comutaSemn,
      preda,
      principal,
      reincarca,
    }),
    [
      alege,
      comutaSemn,
      grila,
      inainte,
      run?.started_at,
      inapoi,
      mergiLa,
      mod,
      preda,
      principal,
      qi,
      ramase,
      reincarca,
      run?.nr_cerut,
      seSalveaza,
      stare.cod,
      stare.eroare,
      stare.faza,
      stare.grile,
      stare.scor,
      total,
      verifica,
    ],
  );
}
