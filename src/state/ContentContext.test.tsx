import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ContentProvider } from './ContentContext';
import { useContent } from './contentState';
import { TIPURI_SEED } from '../data/tipuriSeed';
import { TIPURI_GOALE } from '../lib/tipuriGrile';
import { TAXONOMIE_GOALA } from '../lib/taxonomie';
import { COLECTII_GOALE } from '../lib/colectii';

const stare = vi.hoisted(() => ({ user: null as null | { id: string }, citiri: vi.fn() }));
vi.mock('./authState', () => ({ useAuth: () => ({ user: stare.user, loading: false }) }));
vi.mock('../lib/continut', () => ({
  incarcaCatalogGrile: async () => [], incarcaColectii: async () => COLECTII_GOALE,
  incarcaTaxonomie: async () => TAXONOMIE_GOALA,
  incarcaTipuri: async () => { stare.citiri(); return stare.user ? TIPURI_SEED : TIPURI_GOALE; },
}));
function Proba() { return <p>{useContent().tipuri.lista.map((t) => t.nume).join(', ') || 'Fără formate'}</p>; }
it('recitește formatele după autentificare, fără reîncărcarea paginii', async () => {
  stare.user = null;
  const { rerender } = render(<ContentProvider><Proba /></ContentProvider>);
  await waitFor(() => expect(stare.citiri).toHaveBeenCalled());
  expect(screen.getByText('Fără formate')).toBeInTheDocument();
  stare.user = { id: 'u1' };
  rerender(<ContentProvider><Proba /></ContentProvider>);
  expect(await screen.findByText(/Complement simplu/)).toBeInTheDocument();
});
