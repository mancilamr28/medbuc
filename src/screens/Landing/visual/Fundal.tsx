/**
 * Straturile de fundal ale paginii, într-un singur element fix.
 *
 * Toate sunt gradiente și texturi statice: se pictează o dată și nu se mai
 * recalculează la derulare. Singura mișcare e o translație foarte lentă a
 * plasei, care e `transform`, deci rămâne pe compozitor. Nimic de aici nu
 * animează `filter` — un blur animat pe suprafața asta ar repicta tot ecranul
 * la fiecare cadru și ar fi primul lucru care rupe 60fps.
 */
export function Fundal() {
  return (
    <div className="lp-fundal" aria-hidden="true">
      <div className="lp-fundal__lumini" />
      <div className="lp-fundal__plasa" />
      <div className="lp-fundal__grila" />
      <div className="lp-fundal__granulatie" />
    </div>
  );
}
