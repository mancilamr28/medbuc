import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Crapa(): never {
  throw new Error('ceva a explodat');
}

/**
 * React scrie erorile prinse în consolă chiar dacă boundary-ul le tratează;
 * le înghițim ca ieșirea testelor să rămână citibilă.
 */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Fără boundary, orice excepție la randare lăsa pagina complet albă. Cel mai rău
 * caz era o valoare stricată în `localStorage`: aplicația cădea la fiecare
 * reîncărcare și nu exista nicio cale, din interfață, de a o curăța.
 */
describe('ErrorBoundary', () => {
  it('lasă aplicația să se randeze cât timp nu crapă nimic', () => {
    render(
      <ErrorBoundary>
        <p>conținut</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('conținut')).toBeInTheDocument();
  });

  it('prinde eroarea în loc să lase pagina albă', () => {
    render(
      <ErrorBoundary>
        <Crapa />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Ceva s-a stricat')).toBeInTheDocument();
    expect(screen.getByText('ceva a explodat')).toBeInTheDocument();
  });

  it('oferă o cale de recuperare, nu doar un mesaj', () => {
    render(
      <ErrorBoundary>
        <Crapa />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: 'Reîncarcă' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Șterge datele locale' })).toBeInTheDocument();
  });
});
