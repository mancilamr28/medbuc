import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TAXONOMIE_SEED } from '../data/taxonomieSeed';
import { TIPURI_SEED } from '../data/tipuriSeed';
import { COLECTII_GOALE } from '../lib/colectii';
import { ImportGrile } from './ImportGrile';
import type { GrilaDeSalvat } from '../lib/continut';

const api = vi.hoisted(() => ({ salveaza: vi.fn(), reload: vi.fn(), test: vi.fn(), notify: vi.fn() }));
vi.mock('../lib/continut', () => ({ salveazaGrila: (g: GrilaDeSalvat) => api.salveaza(g), exportaGrileAdmin: vi.fn() }));
vi.mock('../state/toastState', () => ({ useToast: () => ({ notify: api.notify }) }));
vi.mock('../state/contentState', () => ({ useContent: () => ({ reloadStructura: api.reload }) }));
const grila = { text: 'Care este celula nervoasă?', opts: [['A', 'Neuron'], ['B', 'Nefron']], correct: 'A', expl: 'Neuronul transmite impulsuri nervoase.', capId: 'bio-nervos' };

function porneste() {
  render(<ImportGrile catalog={[]} taxonomie={TAXONOMIE_SEED} tipuri={TIPURI_SEED} colectii={COLECTII_GOALE} reload={api.reload} creeazaTest={api.test} />);
}
async function incarca(continut: unknown) {
  const text = typeof continut === 'string' ? continut : JSON.stringify(continut);
  const file = new File([text], 'grile.json', { type: 'application/json' });
  // jsdom nu implementează încă Blob.text; browserul furnizează aceeași promisiune.
  Object.defineProperty(file, 'text', { value: async () => text });
  await userEvent.upload(screen.getByLabelText('Încarcă un fișier (CSV, TSV sau JSON)'), file);
}
beforeEach(() => {
  api.salveaza.mockReset().mockResolvedValue(undefined);
  api.reload.mockReset().mockResolvedValue(undefined);
  api.test.mockReset(); api.notify.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('importul JSON fără editarea codului', () => {
  it('nu pierde textul încă nepregătit când se schimbă formatul', async () => {
    porneste(); const user = userEvent.setup();
    const confirma = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: 'Din document (Word / PDF)' }));
    await user.type(screen.getByLabelText('Textul întrebărilor'), '1. Text nesalvat');
    await user.click(screen.getByRole('tab', { name: 'JSON (avansat)' }));
    expect(confirma).toHaveBeenCalled();
    expect(screen.getByLabelText('Textul întrebărilor')).toHaveValue('1. Text nesalvat');
  });
  it('nu ascunde întrebarea după primul caracter când filtrul arată numai problemele', async () => {
    porneste(); const user = userEvent.setup();
    await incarca([{ ...grila, expl: '' }]);
    await user.click(await screen.findByLabelText('Arată numai grilele cu probleme'));
    await user.type(screen.getByLabelText('Grila 1: Explicație'), 'Explicația completă, nu doar prima literă.');
    expect(screen.getByLabelText('Grila 1: Explicație')).toHaveValue('Explicația completă, nu doar prima literă.');
  });
  it('încarcă fișierul, corectează răspunsul prin formular și cere revizuirea din nou după editare', async () => {
    porneste(); const user = userEvent.setup();
    await incarca([{ ...grila, correct: '' }]);
    expect(api.salveaza).not.toHaveBeenCalled();
    await user.selectOptions(await screen.findByLabelText('Grila 1: Răspuns corect'), 'A');
    await user.click(screen.getByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    fireEvent.change(screen.getByLabelText('Grila 1: Explicație'), { target: { value: 'Explicația verificată.' } });
    expect(screen.getByRole('button', { name: 'Importă 1 grilă' })).toBeDisabled();
    await user.click(screen.getByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    await user.click(screen.getByRole('button', { name: 'Importă 1 grilă' }));
    await waitFor(() => expect(api.salveaza).toHaveBeenCalledTimes(1));
    expect(api.salveaza.mock.calls[0]![0]).toMatchObject({ id: expect.stringMatching(/^lot-/), capId: 'bio-nervos', correct: 'A', expl: 'Explicația verificată.', status: 'ciorna' });
  });
  it('predă un test complet în ordinea originală, cu numele și durata din fișier', async () => {
    porneste(); const user = userEvent.setup();
    await incarca({ test: { nume: 'Simularea de duminică', durataMinute: 90 }, grile: [{ ...grila, id: 'a-doua' }, { ...grila, id: 'prima' }] });
    await user.click(await screen.findByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    await user.click(screen.getByRole('button', { name: 'Importă 2 grile' }));
    await user.click(await screen.findByRole('button', { name: 'Creează un test din acest lot' }));
    expect(api.test).toHaveBeenCalledWith(['a-doua', 'prima'], '', { nume: 'Simularea de duminică', durata: '90' }, { 'a-doua': grila.text, prima: grila.text });
  });
  it('nu importă o parte dintr-un test care are răspunsuri lipsă', async () => {
    porneste();
    await incarca({ test: { nume: 'Test' }, grile: [grila, { ...grila, correct: '' }] });
    expect(await screen.findByText(/Corectează toate grilele înainte/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Importă 1 grilă' })).toBeDisabled();
    expect(api.salveaza).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Creează un test din acest lot' })).not.toBeInTheDocument();
  });
  it('păstrează identitățile după o eroare de rețea și nu oferă un test trunchiat', async () => {
    porneste(); const user = userEvent.setup();
    api.salveaza.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('Conexiune întreruptă'));
    await incarca({ test: { nume: 'Test' }, grile: [grila, { ...grila, text: 'Alt enunț' }] });
    await user.click(await screen.findByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    await user.click(screen.getByRole('button', { name: 'Importă 2 grile' }));
    await waitFor(() => expect(api.reload).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Creează un test din acest lot' })).not.toBeInTheDocument();
    const ids = api.salveaza.mock.calls.map((c) => (c[0] as GrilaDeSalvat).id);
    await user.click(screen.getByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    await user.click(screen.getByRole('button', { name: 'Importă 2 grile' }));
    await waitFor(() => expect(api.salveaza).toHaveBeenCalledTimes(4));
    expect(api.salveaza.mock.calls.slice(2).map((c) => (c[0] as GrilaDeSalvat).id)).toEqual(ids);
  });
  it('explică un JSON stricat fără să salveze nimic', async () => {
    porneste(); await incarca('{');
    expect(await screen.findByRole('alert')).toHaveTextContent('JSON nu poate fi citit');
    expect(api.salveaza).not.toHaveBeenCalled();
  });
});
