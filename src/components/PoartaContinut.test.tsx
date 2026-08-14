import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PoartaContinut } from './PoartaContinut';
import { QUESTIONS } from '../data/questions';
import { AppProvider } from '../state/AppState';
import { ContentProvider } from '../state/ContentContext';
import type { GrilaCuStare } from '../lib/continut';

/**
 * Stările prin care trece biblioteca înainte să existe grile pe ecran.
 *
 * Până la Faza 4 nu exista niciuna: banca era compilată în bundle, deci era acolo
 * de la primul render. Acum vine prin rețea, iar o rețea care tace nu are voie să
 * arate „0 grile" — ar fi o afirmație falsă prezentată ca stare.
 */
const GRILE = QUESTIONS.map((q) => ({ ...q, status: 'publicata' }) as GrilaCuStare);

const incarca = vi.fn<() => Promise<GrilaCuStare[]>>();

vi.mock('../lib/continut', async (original) => ({
  ...(await original<typeof import('../lib/continut')>()),
  incarcaGrile: () => incarca(),
}));

function monteaza(banca = QUESTIONS) {
  return render(
    <ContentProvider>
      <AppProvider questions={banca}>
        <PoartaContinut>
          <div>grilele sunt aici</div>
        </PoartaContinut>
      </AppProvider>
    </ContentProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PoartaContinut', () => {
  it('spune că se încarcă, fără să pretindă un progres', async () => {
    let elibereaza: (g: GrilaCuStare[]) => void = () => {};
    incarca.mockReturnValue(new Promise((r) => (elibereaza = r)));

    monteaza();

    expect(screen.getByText(/Se încarcă biblioteca/)).toBeInTheDocument();
    // Nicio bară de progres: un procent care se umple după un timp inventat e
    // tot o cifră inventată, la fel ca cele scoase la Faza 0.5.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    elibereaza(GRILE);
    await waitFor(() => expect(screen.getByText('grilele sunt aici')).toBeInTheDocument());
  });

  it('arată eroarea și lasă utilizatorul să reîncerce', async () => {
    const user = userEvent.setup();
    incarca.mockRejectedValueOnce(new Error('fetch failed'));

    monteaza();

    expect(await screen.findByText(/Nu am putut încărca biblioteca/)).toBeInTheDocument();

    incarca.mockResolvedValueOnce(GRILE);
    await user.click(screen.getByRole('button', { name: 'Încearcă din nou' }));

    await waitFor(() => expect(screen.getByText('grilele sunt aici')).toBeInTheDocument());
  });

  /** Biblioteca goală e o stare legitimă, nu o eroare — și nu arată ca una. */
  it('deosebește biblioteca goală de o încărcare eșuată', async () => {
    incarca.mockResolvedValue([]);

    monteaza([]);

    expect(await screen.findByText(/nu are încă nicio grilă publicată/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Încearcă din nou' })).not.toBeInTheDocument();
  });

  it('lasă ecranul să treacă odată ce există grile', async () => {
    incarca.mockResolvedValue(GRILE);

    monteaza();

    expect(await screen.findByText('grilele sunt aici')).toBeInTheDocument();
  });
});
