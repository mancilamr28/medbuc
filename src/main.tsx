import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { migrateNoteKeys } from './lib/migrations';
import { AppProvider } from './state/AppState';
import './styles.css';

// Înainte de primul render: notițele vechi sunt mutate pe cheile cu id.
migrateNoteKeys();

const root = document.getElementById('root');
if (!root) throw new Error('Elementul #root lipsește din index.html');

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </ErrorBoundary>
  </StrictMode>,
);
