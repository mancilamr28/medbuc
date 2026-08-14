import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Vocabularul de mișcare al paginii de prezentare.
 *
 * Proiectul nu are bibliotecă de animație și nu primește una: tot ce urmează
 * animează exclusiv `transform` și `opacity`, singurele proprietăți pe care
 * compozitorul le poate muta fără să reașeze pagina. Blurul e static peste tot —
 * un `filter` animat repictează tot stratul la fiecare cadru.
 *
 * Fiecare hook se scurtcircuitează singur când omul a cerut mai puțină mișcare:
 * blocul global din `styles.css` acoperă tranzițiile, dar nu și ce se scrie de
 * aici direct în stil.
 */

/** Durate și curbe comune, ca secțiunile să nu-și inventeze fiecare timpul ei. */
export const DURATA = { scurt: 320, mediu: 520, lung: 760 } as const;
export const CURBA = 'cubic-bezier(.22,.61,.36,1)';

/**
 * `prefers-reduced-motion`, urmărit în timp real: schimbat din setările
 * sistemului, efectul se oprește fără reîncărcare.
 */
export function useReducedMotion(): boolean {
  const [redus, setRedus] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setRedus(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return redus;
}

/** Dispozitiv cu mouse adevărat. Efectele care urmăresc cursorul n-au ce căuta pe touch. */
export function useHasPointer(): boolean {
  const [are, setAre] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onChange = () => setAre(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return are;
}

/**
 * Elementul a intrat în ecran.
 *
 * `disconnect()` la curățare nu e opțional: `StrictMode` invocă efectele de două
 * ori în dezvoltare, iar un observator scăpat se adună peste același nod și
 * declanșează dezvăluirea de două ori.
 *
 * Cu mișcare redusă returnează `true` din start — conținutul trebuie să fie
 * acolo, doar apariția lui dispare.
 */
export function useInView<T extends Element>(
  optiuni: { prag?: number; margine?: string } = {},
): [RefObject<T | null>, boolean] {
  // Prag 0 în mod implicit: panourile mari sunt mai înalte decât ecranul, iar un
  // prag procentual pe ele s-ar atinge abia după ce au trecut de jumătate.
  // Momentul intrării îl dă marginea de jos, nu procentul din element.
  const { prag = 0, margine = '0px 0px -14% 0px' } = optiuni;
  const ref = useRef<T | null>(null);
  const redus = useReducedMotion();
  const [vazut, setVazut] = useState(false);

  useEffect(() => {
    if (redus) {
      setVazut(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVazut(true);
      return;
    }

    const obs = new IntersectionObserver(
      (intrari) => {
        for (const intrare of intrari) {
          if (intrare.isIntersecting) {
            setVazut(true);
            obs.disconnect(); // o singură dată: nimic nu se ascunde la ieșire
          }
        }
      },
      { threshold: prag, rootMargin: margine },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [prag, margine, redus]);

  return [ref, vazut];
}

/**
 * Poziția cursorului, scrisă ca procente în `--lp-mx` / `--lp-my` pe element.
 *
 * Prin `requestAnimationFrame` și direct în stil, niciodată prin `setState`:
 * un render React la fiecare `pointermove` ar face din highlight-ul cardurilor
 * cel mai scump lucru de pe pagină. Stratul care le folosește are
 * `pointer-events: none`, deci nimic din asta nu stă în calea unui clic.
 */
export function usePointerGlow<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const redus = useReducedMotion();
  const arePointer = useHasPointer();

  useEffect(() => {
    const el = ref.current;
    if (!el || redus || !arePointer) return;

    let cadru = 0;
    let x = 0;
    let y = 0;

    const scrie = () => {
      cadru = 0;
      el.style.setProperty('--lp-mx', `${x}%`);
      el.style.setProperty('--lp-my', `${y}%`);
      // Aceleași valori centrate în −1…1 și fără unitate: straturile din obiectul
      // eroului le înmulțesc cu propriul factor ca să se miște cu viteze diferite.
      // Procentele nu pot fi convertite în pixeli în `calc`, de aici perechea.
      el.style.setProperty('--lp-dx', ((x / 100 - 0.5) * 2).toFixed(3));
      el.style.setProperty('--lp-dy', ((y / 100 - 0.5) * 2).toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width) * 100;
      y = ((e.clientY - r.top) / r.height) * 100;
      if (!cadru) cadru = requestAnimationFrame(scrie);
    };

    const onLeave = () => {
      if (cadru) cancelAnimationFrame(cadru);
      cadru = 0;
      el.style.removeProperty('--lp-mx');
      el.style.removeProperty('--lp-my');
      el.style.setProperty('--lp-dx', '0');
      el.style.setProperty('--lp-dy', '0');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (cadru) cancelAnimationFrame(cadru);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [redus, arePointer]);

  return ref;
}

/**
 * Înclinare 3D spre cursor, tot prin variabile CSS. Amplitudinea e mică
 * intenționat — peste vreo 6° cardul devine o jucărie și textul din el se
 * citește greu.
 */
export function useTilt<T extends HTMLElement>(grade = 5): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const redus = useReducedMotion();
  const arePointer = useHasPointer();

  useEffect(() => {
    const el = ref.current;
    if (!el || redus || !arePointer) return;

    let cadru = 0;
    let rx = 0;
    let ry = 0;

    const scrie = () => {
      cadru = 0;
      el.style.setProperty('--lp-rx', `${rx}deg`);
      el.style.setProperty('--lp-ry', `${ry}deg`);
    };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ry = ((e.clientX - r.left) / r.width - 0.5) * 2 * grade;
      rx = -((e.clientY - r.top) / r.height - 0.5) * 2 * grade;
      if (!cadru) cadru = requestAnimationFrame(scrie);
    };

    const onLeave = () => {
      if (cadru) cancelAnimationFrame(cadru);
      cadru = 0;
      el.style.setProperty('--lp-rx', '0deg');
      el.style.setProperty('--lp-ry', '0deg');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (cadru) cancelAnimationFrame(cadru);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [grade, redus, arePointer]);

  return ref;
}

/**
 * Paralaxă legată de derulare: cât s-a depărtat centrul elementului de centrul
 * ecranului, în intervalul −1…1, scris în `--lp-p`.
 *
 * Ascultătorul e pasiv și citirea se face într-un singur `requestAnimationFrame`
 * per cadru, ca să nu alterneze citiri și scrieri de layout.
 */
export function useParallax<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const redus = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || redus) return;

    let cadru = 0;

    const masoara = () => {
      cadru = 0;
      const r = el.getBoundingClientRect();
      const centru = r.top + r.height / 2;
      const p = (centru - window.innerHeight / 2) / (window.innerHeight / 2);
      el.style.setProperty('--lp-p', Math.max(-1.5, Math.min(1.5, p)).toFixed(3));
    };

    const cere = () => {
      if (!cadru) cadru = requestAnimationFrame(masoara);
    };

    masoara();
    window.addEventListener('scroll', cere, { passive: true });
    window.addEventListener('resize', cere);
    return () => {
      if (cadru) cancelAnimationFrame(cadru);
      window.removeEventListener('scroll', cere);
      window.removeEventListener('resize', cere);
    };
  }, [redus]);

  return ref;
}

/**
 * Progresul derulării printr-o secțiune înaltă, 0…1, ca stare React.
 *
 * Ăsta e singurul hook care chiar are nevoie de `setState` — pasul afișat în
 * showcase e o schimbare de conținut, nu una de stil. De aceea returnează și
 * pasul discret, calculat aici o singură dată, în loc să-l recalculeze fiecare
 * consumator.
 */
export function useScrollSteps<T extends HTMLElement>(pasi: number): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [pas, setPas] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cadru = 0;

    const masoara = () => {
      cadru = 0;
      const r = el.getBoundingClientRect();
      // Cât din partea „lipită" a secțiunii a fost parcursă.
      const parcurs = -r.top / Math.max(1, r.height - window.innerHeight);
      const p = Math.max(0, Math.min(0.999, parcurs));
      setPas(Math.floor(p * pasi));
    };

    const cere = () => {
      if (!cadru) cadru = requestAnimationFrame(masoara);
    };

    masoara();
    window.addEventListener('scroll', cere, { passive: true });
    window.addEventListener('resize', cere);
    return () => {
      if (cadru) cancelAnimationFrame(cadru);
      window.removeEventListener('scroll', cere);
      window.removeEventListener('resize', cere);
    };
  }, [pasi]);

  return [ref, pas];
}

/**
 * Numărare ascendentă până la o valoare — folosită **doar** pe cifre reale,
 * derivate din bancă sau din data examenului. Regula proiectului e că nicio
 * cifră afișată nu se scrie de mână; animația nu schimbă nimic la ea.
 */
export function useContorAnimat(tinta: number, pornit: boolean, durata = 1100): number {
  const redus = useReducedMotion();
  const [valoare, setValoare] = useState(0);

  useEffect(() => {
    if (!pornit) return;
    if (redus || tinta === 0) {
      setValoare(tinta);
      return;
    }

    let cadru = 0;
    const start = performance.now();

    const pas = (acum: number) => {
      const t = Math.min(1, (acum - start) / durata);
      // Încetinire spre final: cifra se așază, nu se oprește brusc.
      const usor = 1 - Math.pow(1 - t, 3);
      setValoare(Math.round(tinta * usor));
      if (t < 1) cadru = requestAnimationFrame(pas);
    };

    cadru = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(cadru);
  }, [tinta, pornit, durata, redus]);

  return valoare;
}
