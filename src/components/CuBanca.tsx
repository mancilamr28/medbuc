import { App } from '../App';
import { AppProvider } from '../state/AppState';
import { useContent } from '../state/contentState';
import { useProgressOptional } from '../state/progressState';

/** Leagă biblioteca încărcată de starea aplicației. */
export function CuBanca() {
  const { catalog, taxonomie, tipuri } = useContent();
  const attempts = useProgressOptional()?.attempts ?? [];
  return (
    <AppProvider catalog={catalog} attempts={attempts} taxonomie={taxonomie} tipuri={tipuri}>
      <App />
    </AppProvider>
  );
}
