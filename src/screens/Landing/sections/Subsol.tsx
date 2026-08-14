import { EXAM_DATE_LABEL } from '../../../data/profile';
import { Marca } from '../parts/Marca';

/**
 * Subsolul. Fără animație — după CTA-ul final, pagina trebuie să se așeze, nu
 * să mai ceară atenție.
 *
 * Linkurile duc doar unde chiar există ceva: secțiunile paginii și cele două
 * rute publice. Nicio pagină de termeni sau de contact inventată ca să umple
 * coloana.
 */
export function Subsol() {
  return (
    <footer className="lp-subsol">
      <div className="lp-wrap">
        <div className="lp-subsol__rand">
          <div className="lp-subsol__marca">
            <Marca dimensiune={26} />
            <p className="lp-corp" style={{ marginTop: 12, maxWidth: '32ch' }}>
              Pregătire pentru admiterea la UMFCD „Carol Davila”, Medicină generală. Sesiunea din {EXAM_DATE_LABEL}.
            </p>
          </div>

          <nav className="lp-subsol__grup" aria-label="Secțiunile paginii">
            <span className="lp-subsol__titlu">Pagina</span>
            <a className="lp-subsol__link" href="#ce-poti-face">
              Ce poți face
            </a>
            <a className="lp-subsol__link" href="#cum-merge">
              Cum merge
            </a>
            <a className="lp-subsol__link" href="#parcurs">
              Parcursul
            </a>
          </nav>

          <nav className="lp-subsol__grup" aria-label="Cont">
            <span className="lp-subsol__titlu">Cont</span>
            <a className="lp-subsol__link" href="#/inregistrare">
              Creează cont
            </a>
            <a className="lp-subsol__link" href="#/autentificare">
              Autentificare
            </a>
            <a className="lp-subsol__link" href="#/parola-uitata">
              Ai uitat parola?
            </a>
          </nav>
        </div>

        <div className="lp-subsol__jos">
          <span>© {new Date().getFullYear()} MedBuc</span>
          <span>Proiect independent, fără legătură oficială cu UMFCD.</span>
        </div>
      </div>
    </footer>
  );
}
