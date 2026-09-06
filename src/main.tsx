import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CuBanca } from './components/CuBanca';
import { ErrorBoundary } from './components/ErrorBoundary';
import { migrateNoteKeys } from './lib/migrations';
import { PreferinteCookie } from './components/PreferinteCookie';
import { AuthProvider } from './state/AuthContext';
import { ContentProvider } from './state/ContentContext';
import { ProgressProvider } from './state/ProgressContext';
import { ToastProvider } from './state/ToastContext';
import './styles.css';

// Raportarea opțională pornește numai după acord, din PreferinteCookie.

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
      <PreferinteCookie />
    </ErrorBoundary>
  </StrictMode>,
);
