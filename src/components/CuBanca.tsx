import { App } from '../App';
import { AppProvider } from '../state/AppState';
import { useContent } from '../state/ContentContext';

/** Leagă biblioteca încărcată de starea aplicației. */
export function CuBanca() {
  const { questions } = useContent();
  return (
    <AppProvider questions={questions}>
      <App />
    </AppProvider>
  );
}
