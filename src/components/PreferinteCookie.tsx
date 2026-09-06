import { useEffect, useState } from 'react';
import { arataPreferinteCookie, pornesteConsimtamant } from '../lib/consimtamant';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import './preferinteCookie.css';

/** Disponibilă inclusiv pe landing și autentificare, fără dependență de cont. */
export function PreferinteCookie() {
  const [eroare, setEroare] = useState(false);
  useEffect(() => {
    let activ = true;
    void pornesteConsimtamant().catch(() => { if (activ) setEroare(true); });
    return () => { activ = false; };
  }, []);
  return <footer className="preferinte-cookie">
    <button type="button" className="btn-quiet" onClick={() => {
      setEroare(false);
      void arataPreferinteCookie().catch(() => setEroare(true));
    }}>Preferințe cookie</button>
    {eroare && <p role="status">Preferințele nu s-au încărcat. Raportarea opțională rămâne oprită. Apasă butonul pentru a reîncerca.</p>}
  </footer>;
}
