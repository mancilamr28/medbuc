import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { migrateNoteKeys } from './lib/migrations';
import { initSentry } from './lib/sentry';
import { AppProvider } from './state/AppState';
import { AuthProvider } from './state/AuthContext';
import { ContentProvider, useContent } from './state/ContentContext';
import { ToastProvider } from './state/ToastContext';
import './styles.css';

/**
 * Podul dintre bibliotecă și starea aplicației.
 *
 * `AppProvider` primește banca prin prop tocmai ca să nu depindă de un context
 * care face rețea; cineva trebuie totuși să le lege, iar locul ăla e aici, unde
 * ambele provider-e sunt deja montate.
 */
function CuBanca() {
  const { questions } = useContent();
  return (
    <AppProvider questions={questions}>
      <App />
    </AppProvider>
  );
}

// Cât mai devreme posibil, ca să prindă și erorile de la randările timpurii.
initSentry();

// Înainte de primul render: notițele vechi sunt mutate pe cheile cu id.
migrateNoteKeys();

const root = document.getElementById('root');
if (!root) throw new Error('Elementul #root lipsește din index.html');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <ContentProvider>
            <CuBanca />
          </ContentProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
