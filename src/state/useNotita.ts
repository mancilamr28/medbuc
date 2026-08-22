import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChapterId } from '../data/chapters';
import { usePersistentState } from '../lib/hooks';
import { NOTE_PREFIX } from '../lib/migrations';
import {
  alegeNotita,
  esteNotitaStocata,
  normalizeazaNotita,
  type NotitaStocata,
} from '../lib/notite';
import { citesteNotita, salveazaNotita, stergeNotitaDinBaza } from '../lib/notiteBaza';
import { reportError } from '../lib/sentry';
import { useAuthOptional } from './authState';

/** Cât se așteaptă după ultima tastă înainte de a scrie pe cont. */
const RAGAZ_MS = 800;

export type StareNotita =
  /** Fără sesiune: notița trăiește doar pe dispozitivul ăsta. */
  | 'local'
  | 'seIncarca'
  | 'seSalveaza'
  | 'salvat'
  | 'eroare';

export interface Notita {
  body: string;
  scrie: (body: string) => void;
  sterge: () => void;
  stare: StareNotita;
  reincearca: () => void;
}

/**
 * O notiță de capitol, ținută pe cont și în `localStorage` deodată.
 *
 * Până acum exista doar copia locală: textul scris de un elev stătea pe un
 * singur dispozitiv, lipsea din exportul GDPR și dispărea cu tot cu browser. E
 * singurul lucru din aplicație care nu se poate reface — un răspuns se poate da
 * din nou, o pagină de notițe nu.
 *
 * Ordinea e voită: **întâi discul, apoi rețeaua**. Tastarea scrie imediat local
 * și abia după o pauză urcă pe cont, deci nimic nu se pierde dacă pică rețeaua
 * sau dacă elevul închide fereastra între două litere. Copia locală rămâne și
 * după sincronizare: e ce se vede instantaneu la deschidere, fără să aștepți o
 * cerere.
 *
 * Notițele scrise înainte de tabelă urcă singure: la prima deschidere a
 * capitolului, dacă pe cont nu e nimic mai nou, copia locală e trimisă acolo.
 */
export function useNotita(capId: ChapterId | null): Notita {
  const auth = useAuthOptional();
  const userId = auth?.user?.id ?? null;
  const cheie = `${NOTE_PREFIX}${capId ?? 'fara-capitol'}`;

  const [stocata, setStocata, stergeLocal] = usePersistentState<NotitaStocata>(
    cheie,
    '',
    esteNotitaStocata,
  );
  const body = normalizeazaNotita(stocata).body;

  const [stare, setStare] = useState<StareNotita>(userId ? 'seIncarca' : 'local');
  const [incercare, setIncercare] = useState(0);

  /**
   * Ce așteaptă să fie urcat, ținut în ref, nu în state: cronometrul îl citește
   * la expirare, iar curățarea efectului îl trimite pe loc dacă ecranul se
   * închide între timp. În state, fiecare literă ar reporni efectul de salvare.
   */
  const inAsteptare = useRef<{ capId: ChapterId; body: string } | null>(null);
  const cronometru = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urca = useCallback(
    async (id: ChapterId, text: string) => {
      if (!userId) return;
      setStare('seSalveaza');
      try {
        await salveazaNotita(userId, id, text);
        setStare('salvat');
      } catch (e: unknown) {
        setStare('eroare');
        reportError(e, 'useNotita: salvare');
        console.warn('[medbuc] Nu am putut salva notița pe cont.', e);
      }
    },
    [userId],
  );

  /** Trimite acum ce aștepta, dacă mai e ceva. Folosit și la ieșirea din ecran. */
  const trimiteAcum = useCallback(() => {
    if (cronometru.current !== null) {
      clearTimeout(cronometru.current);
      cronometru.current = null;
    }
    const pending = inAsteptare.current;
    inAsteptare.current = null;
    if (pending) void urca(pending.capId, pending.body);
  }, [urca]);

  // Citirea de pe cont, la deschiderea capitolului. Ce e mai nou câștigă, iar
  // dacă localul e cel nou, urcă imediat — așa ajung pe cont și notițele
  // scrise înainte să existe tabela.
  useEffect(() => {
    if (!capId) return;
    if (!userId) {
      setStare('local');
      return;
    }

    let renuntat = false;
    setStare('seIncarca');
    void citesteNotita(capId)
      .then((deLaCont) => {
        if (renuntat) return;
        // Copia locală se recitește de pe disc, nu se ia din starea hook-ului:
        // altfel efectul ar depinde de textul curent și ar reciti contul la
        // fiecare literă tastată.
        const local = normalizeazaNotita(
          (() => {
            try {
              const brut = localStorage.getItem(`${NOTE_PREFIX}${capId}`);
              const parsat: unknown = brut === null ? '' : JSON.parse(brut);
              return esteNotitaStocata(parsat) ? parsat : '';
            } catch {
              return '';
            }
          })(),
        );

        const ales = alegeNotita(local, deLaCont);
        if (ales.provenienta === 'cont') {
          setStocata({ body: ales.body, updatedAt: ales.updatedAt });
          setStare('salvat');
          return;
        }
        if (ales.provenienta === 'local') {
          void urca(capId, ales.body);
          return;
        }
        setStare('salvat');
      })
      .catch((e: unknown) => {
        if (renuntat) return;
        setStare('eroare');
        reportError(e, 'useNotita: citire');
        console.warn('[medbuc] Nu am putut citi notița de pe cont.', e);
      });

    return () => {
      renuntat = true;
    };
    // `setStocata` e stabil pe cheie; `incercare` repornește citirea la „Reîncearcă".
  }, [capId, incercare, setStocata, urca, userId]);

  // Ce n-a apucat să plece pleacă la schimbarea capitolului sau la ieșire.
  useEffect(() => trimiteAcum, [capId, trimiteAcum]);

  const scrie = useCallback(
    (text: string) => {
      setStocata({ body: text, updatedAt: Date.now() });
      if (!capId || !userId) return;

      inAsteptare.current = { capId, body: text };
      setStare('seSalveaza');
      if (cronometru.current !== null) clearTimeout(cronometru.current);
      cronometru.current = setTimeout(() => {
        cronometru.current = null;
        const pending = inAsteptare.current;
        inAsteptare.current = null;
        if (pending) void urca(pending.capId, pending.body);
      }, RAGAZ_MS);
    },
    [capId, setStocata, urca, userId],
  );

  const sterge = useCallback(() => {
    if (cronometru.current !== null) clearTimeout(cronometru.current);
    cronometru.current = null;
    inAsteptare.current = null;
    stergeLocal();
    if (!capId || !userId) return;
    // Ștergerea e explicită pe cont: un text golit local n-ar șterge rândul, iar
    // notița s-ar întoarce de acolo la următoarea deschidere.
    void stergeNotitaDinBaza(capId).catch((e: unknown) => {
      setStare('eroare');
      reportError(e, 'useNotita: ștergere');
      console.warn('[medbuc] Nu am putut șterge notița de pe cont.', e);
    });
  }, [capId, stergeLocal, userId]);

  const reincearca = useCallback(() => {
    if (inAsteptare.current) {
      trimiteAcum();
      return;
    }
    setIncercare((n) => n + 1);
  }, [trimiteAcum]);

  return { body, scrie, sterge, stare, reincearca };
}
