import { MATERII } from '../../../data/chapters';
import { chapterQuestionCount } from '../../../data/questions';
import { numar } from '../../../lib/text';

/**
 * Macheta ecranului de materii.
 *
 * Capitolele sunt cele reale din `MATERII`, iar numărul de grile e numărat din
 * bancă prin `chapterQuestionCount` — exact ca în `Materii.tsx`. Un capitol în
 * care încă nu e scrisă nicio grilă arată „—", nu un procent inventat: aceeași
 * regulă ca în restul aplicației.
 */
const CAPITOLE = MATERII.bio.list.slice(0, 6);

export function PreviewCapitole() {
  return (
    <div className="lp-preview">
      <div className="lp-preview__bara">
        <span className="lp-preview__bec" />
        <span>Biologie · {numar(MATERII.bio.list.length, 'capitol', 'capitole')}</span>
      </div>

      <div className="lp-preview__corp">
        <div className="lp-capitole">
          {CAPITOLE.map((c) => {
            const n = chapterQuestionCount(c.id);
            return (
              <div className="lp-capitol" key={c.id}>
                <span className="lp-capitol__nr">{c.nr}</span>
                <span className="lp-capitol__nume">{c.name}</span>
                {/* `numar` face acordul: „1 grilă", „6 grile", „20 de grile". */}
                <span className="lp-capitol__nr-grile">{n > 0 ? numar(n, 'grilă', 'grile') : '—'}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
