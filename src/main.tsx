import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CuBanca } from './components/CuBanca';
import { ErrorBoundary } from './components/ErrorBoundary';
import { migrateNoteKeys } from './lib/migrations';
import { initSentry } from './lib/sentry';
import { AuthProvider } from './state/AuthContext';
import { ContentProvider } from './state/ContentContext';
import { ProgressProvider } from './state/ProgressContext';
import { ToastProvider } from './state/ToastContext';
import './styles.css';

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
          <ProgressProvider>
            <ContentProvider>
              <CuBanca />
            </ContentProvider>
          </ProgressProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
