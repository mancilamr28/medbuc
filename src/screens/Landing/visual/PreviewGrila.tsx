import { useState } from 'react';
import { QUESTIONS, questionById, questionCap, questionMaterie } from '../../../data/questions';

/**
 * Macheta ecranului de grile — funcțională, nu o poză.
 *
 * Grila e una adevărată din bancă (`bio-nervos-01`), cu variantele, răspunsul
 * corect și explicația ei reale. Alegerea unei variante o dezvăluie exact ca în
 * aplicație: se colorează corectul și greșitul, apare explicația, iar răspunsul
 * rămâne blocat. Un vizitator poate încerca produsul înainte să-și facă cont,
 * fără să i se promită nimic ce nu există.
 */
const GRILA = questionById('bio-nervos-01') ?? QUESTIONS[0]!;

export function PreviewGrila() {
  const [ales, setAles] = useState<string | null>(null);
  const dezvaluit = ales !== null;

  return (
    <div className="lp-preview">
      <div className="lp-preview__bara">
        <span className="lp-preview__bec" />
        <span>
          {questionMaterie(GRILA)} · {questionCap(GRILA)}
        </span>
      </div>

      <div className="lp-preview__corp">
        <p className="lp-preview__intrebare">{GRILA.text}</p>

        <div className="lp-optiuni">
          {GRILA.opts.map(([cheie, text]) => {
            const clase = ['lp-optiune'];
            if (dezvaluit && cheie === GRILA.correct) clase.push('lp-optiune--corect');
            if (dezvaluit && cheie === ales && ales !== GRILA.correct) clase.push('lp-optiune--gresit');

            return (
              <button
                key={cheie}
                type="button"
                className={clase.join(' ')}
                // Odată dezvăluit, răspunsul e blocat — la fel ca în sesiunea reală.
                disabled={dezvaluit}
                aria-pressed={ales === cheie}
                onClick={() => setAles(cheie)}
              >
                <span className="lp-optiune__litera">{cheie}</span>
                <span>{text}</span>
              </button>
            );
          })}
        </div>

        {/* `aria-live`: explicația apare fără navigare, deci altfel un cititor de
            ecran n-ar avea de unde ști că răspunsul a fost verificat. */}
        <div aria-live="polite">
          {dezvaluit ? (
            <p className="lp-explicatie">
              <strong>{ales === GRILA.correct ? 'Corect.' : `Greșit — răspunsul corect e ${GRILA.correct}.`}</strong>{' '}
              {GRILA.expl}
            </p>
          ) : (
            <p className="lp-preview__sursa">Alege o variantă ca să vezi explicația. Sursa: {GRILA.src}</p>
          )}
        </div>
      </div>
    </div>
  );
}
