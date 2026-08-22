import { CAPITOLE_SEED } from '../../../data/taxonomieSeed';
import { chapterQuestionCount } from '../../../data/questions';
import { numar } from '../../../lib/text';

/**
 * Macheta ecranului de materii.
 *
 * E o **machetă**: o imagine a ecranului, nu ecranul. De aceea e singurul loc din
 * pagină care se uită la taxonomia de pornire și la fixtura de grile, nu la bază
 * — desenul trebuie să arate la fel indiferent de ce s-a scris în administrare,
 * iar un vizitator fără cont n-are cum să numere grile publicate. Cifrele reale
 * ale paginii — capitolele din `Cifre` și `Capabilitati` — vin din bază.
 *
 * Un capitol în care încă nu e scrisă nicio grilă arată „—", nu o cifră
 * inventată: aceeași regulă ca în restul aplicației.
 */
const CAPITOLE = CAPITOLE_SEED.filter((c) => c.materie_id === 'bio').slice(0, 6);

export function PreviewCapitole() {
  return (
    <div className="lp-preview">
      <div className="lp-preview__bara">
        <span className="lp-preview__bec" />
        <span>Biologie · {numar(CAPITOLE_SEED.filter((c) => c.materie_id === 'bio').length, 'capitol', 'capitole')}</span>
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
