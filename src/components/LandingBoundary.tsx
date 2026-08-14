import { Component, type ReactNode } from 'react';

/**
 * Prinde eșecul de încărcare al chunk-ului de prezentare și cade pe formularul
 * de autentificare.
 *
 * GitHub Pages servește fișiere cu nume hashuite: un vizitator care mai are în
 * cache `index.html` de dinaintea unui deploy cere un chunk care nu mai există,
 * iar `React.lazy` respinge. Fără granița asta, respingerea urcă la
 * `ErrorBoundary`-ul global, care i-ar oferi unui om ajuns prima oară pe site
 * „Șterge datele locale" — un buton fără sens pentru cineva care n-are date.
 * Formularul de login e în bundle-ul principal, deci sigur se poate randa.
 *
 * Deliberat nu stă în `screens/Landing/`: trebuie să existe tocmai când ce e
 * acolo nu se poate încărca.
 */
export class LandingBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { cazut: boolean }> {
  state = { cazut: false };

  static getDerivedStateFromError() {
    return { cazut: true };
  }

  render() {
    return this.state.cazut ? this.props.fallback : this.props.children;
  }
}
