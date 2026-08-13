import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

/**
 * `matchMedia` nu există în jsdom, iar `useIsDesktop()` îl cere la primul render
 * al aproape fiecărui ecran. Îl împlinim citind lățimea ferestrei, ca un test
 * să poată trece pe lățime de telefon doar schimbând `window.innerWidth`.
 */
window.matchMedia = ((query: string): MediaQueryList => {
  const prag = /min-width:\s*(\d+)px/.exec(query);
  const matches = prag ? window.innerWidth >= Number(prag[1]) : false;

  return {
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList;
}) as typeof window.matchMedia;

/** jsdom pornește la 1024px; ecranele se randează implicit în varianta desktop. */
beforeEach(() => {
  window.innerWidth = 1280;
});

/**
 * Fiecare test pornește de la zero: DOM curat și `localStorage` gol.
 *
 * Fără golirea storage-ului, un test care scrie o notiță sau o lucrare ar
 * schimba rezultatul următorului — exact felul de dependență între teste care
 * face o suită să treacă local și să cadă în CI.
 */
beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  cleanup();
});
