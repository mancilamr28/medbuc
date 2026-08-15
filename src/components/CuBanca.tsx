import { App } from '../App';
import { AppProvider } from '../state/AppState';
import { useContent } from '../state/contentState';

/** Leagă biblioteca încărcată de starea aplicației. */
export function CuBanca() {
  const { questions } = useContent();
  return (
    <AppProvider questions={questions}>
      <App />
    </AppProvider>
  );
}
