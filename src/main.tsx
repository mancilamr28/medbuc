import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppProvider } from './state/AppState';
import './styles.css';

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
