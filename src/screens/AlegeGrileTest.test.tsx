import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { AlegeGrileTest } from './AlegeGrileTest';
import { TAXONOMIE_SEED } from '../data/taxonomieSeed';
import { COLECTII_GOALE } from '../lib/colectii';

const cauta = vi.hoisted(() => vi.fn(async () => ({ randuri: [
  { id: 'q-1', text: 'Prima întrebare' }, { id: 'q-2', text: 'A doua întrebare' },
], total: 2 })));
vi.mock('../lib/continut', () => ({
  FILTRE_GOALE: { cautare: '', capitole: [], colectieId: '', tipId: '', status: 'toate' },
  cautaGrile: cauta,
  numaraPeStare: async () => ({ publicata: 2, retrasa: 0, ciorna: 0 }),
}));
function Proba() {
  const [ids, setIds] = useState<string[]>([]);
  return <><output aria-label="Ordine salvată">{ids.join(',')}</output><AlegeGrileTest alese={ids} onChange={setIds} taxonomie={TAXONOMIE_SEED} colectii={COLECTII_GOALE} /></>;
}
it('alege dintr-o pagină, blochează duplicatele și păstrează ordinea după mutare și eliminare', async () => {
  const user = userEvent.setup();
  render(<Proba />);
  await user.click(await screen.findByRole('button', { name: 'Adaugă în test q-1' }));
  expect(screen.getByRole('button', { name: 'Adăugată q-1' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Adaugă în test q-2' }));
  await user.click(screen.getByRole('button', { name: 'Mută în sus q-2' }));
  expect(screen.getByLabelText('Ordine salvată')).toHaveTextContent('q-2,q-1');
  await user.click(screen.getByRole('button', { name: 'Scoate din test q-1' }));
  expect(screen.getByLabelText('Ordine salvată')).toHaveTextContent('q-2');
  await waitFor(() => expect(cauta).toHaveBeenCalledWith(expect.objectContaining({ status: 'publicata' }), 0, 25));
});
