/**
 * Marca MedBuc, ca link către capul paginii.
 *
 * Nu folosește `<Logo />` din `components/`: acela apelează `useApp().go('acasa')`,
 * ceea ce aici ar duce vizitatorul direct în formularul de autentificare —
 * `#/acasa` e o rută a aplicației, deci `publicViewFor` cere sesiune pentru ea.
 * Imaginea se randează direct, exact ca în `Autentificare.tsx`.
 */
export function Marca({ dimensiune = 28 }: { dimensiune?: number }) {
  return (
    <a className="lp-nav__marca" href="#/" aria-label="MedBuc — pagina principală">
      <img
        src={`${import.meta.env.BASE_URL}logo-kitty.svg`}
        alt=""
        width={dimensiune}
        height={dimensiune}
        style={{ width: dimensiune, height: dimensiune }}
      />
      <span>MedBuc</span>
    </a>
  );
}
