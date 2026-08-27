import { useEffect, useMemo, useRef, useState } from 'react';
import {
  cautaGrile,
  numaraPeStare,
  type FiltreGrile,
  type RezumatGrila,
  type QuestionStatus,
} from '../lib/continut';
import { reportError } from '../lib/sentry';

/**
 * Lista din Administrare, citită de pe server.
 *
 * Citea `useContent().grile` — biblioteca întreagă, adusă în memorie — și filtra
 * cu `Array.filter`. Merge la 181 de grile și nu mai merge la douăzeci de mii:
 * nu din cauza randării, ci fiindcă fiecare deschidere a ecranului ar transfera
 * zeci de megaocteți, cu toate variantele și explicațiile lor.
 *
 * Separat de componentă, ca `adminCiorna.ts`: aici stă secvențierea cererilor,
 * acolo randarea.
 */
export const PE_PAGINA = 25;

/** Cât se așteaptă după ultima tastă înainte de a întreba serverul. */
const INTARZIERE_CAUTARE = 300;

export interface Biblioteca {
  randuri: RezumatGrila[];
  total: number;
  contoare: Record<QuestionStatus, number> | null;
  pagina: number;
  pagini: number;
  mergiLaPagina: (p: number) => void;
  seIncarca: boolean;
  eroare: string | null;
  reincarca: () => void;
}

export function useBibliotecaAdmin(filtre: FiltreGrile): Biblioteca {
  const [pagina, setPagina] = useState(0);
  const [randuri, setRanduri] = useState<RezumatGrila[]>([]);
  const [total, setTotal] = useState(0);
  const [contoare, setContoare] = useState<Record<QuestionStatus, number> | null>(null);
  const [seIncarca, setSeIncarca] = useState(true);
  const [eroare, setEroare] = useState<string | null>(null);
  const [versiune, setVersiune] = useState(0);

  // Doar căutarea se amână; restul filtrelor vin din clic, deci sunt deja rare.
  const [cautareAmanata, setCautareAmanata] = useState(filtre.cautare);
  useEffect(() => {
    const t = setTimeout(() => setCautareAmanata(filtre.cautare), INTARZIERE_CAUTARE);
    return () => clearTimeout(t);
  }, [filtre.cautare]);

  /**
   * Filtrele, ca valoare stabilă.
   *
   * `filtre` e un obiect literal recompus la fiecare render al ecranului; pus
   * direct în lista de dependențe ar retrimite cererea la fiecare tastă apăsată
   * în formularul de alături. Cheia serializată se schimbă doar când se schimbă
   * chiar un filtru.
   */
  const cerute: FiltreGrile = useMemo(
    () => ({ ...filtre, cautare: cautareAmanata }),
    [cautareAmanata, filtre],
  );
  const cheie = JSON.stringify(cerute);

  // Prima pagină la orice schimbare de filtru: pagina 7 dintr-un rezultat de
  // trei pagini ar fi goală, iar ecranul ar părea că nu găsește nimic.
  useEffect(() => {
    setPagina(0);
  }, [cheie]);

  /**
   * Numărul cererii, ca un răspuns întârziat să nu suprascrie unul mai nou.
   *
   * Fără el, o căutare lentă urmată de una rapidă lasă pe ecran rezultatul
   * primeia — clasicul „am tastat, apoi a apărut altceva".
   */
  const ultima = useRef(0);

  useEffect(() => {
    const alMeu = (ultima.current += 1);
    let anulat = false;
    setSeIncarca(true);
    setEroare(null);

    void (async () => {
      try {
        const [pag, nr] = await Promise.all([
          cautaGrile(JSON.parse(cheie) as FiltreGrile, pagina * PE_PAGINA, PE_PAGINA),
          numaraPeStare(JSON.parse(cheie) as FiltreGrile),
        ]);
        if (anulat || alMeu !== ultima.current) return;
        setRanduri(pag.randuri);
        setTotal(pag.total);
        setContoare(nr);
      } catch (e: unknown) {
        if (anulat || alMeu !== ultima.current) return;
        setEroare('Nu am putut căuta în bibliotecă.');
        reportError(e, 'Administrare: căutare');
      } finally {
        if (!anulat && alMeu === ultima.current) setSeIncarca(false);
      }
    })();

    return () => {
      anulat = true;
    };
  }, [cheie, pagina, versiune]);

  return {
    randuri,
    total,
    contoare,
    pagina,
    pagini: Math.max(1, Math.ceil(total / PE_PAGINA)),
    mergiLaPagina: setPagina,
    seIncarca,
    eroare,
    reincarca: () => setVersiune((v) => v + 1),
  };
}
