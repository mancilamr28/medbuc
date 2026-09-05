import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PoartaContinut } from './PoartaContinut';
import { QUESTIONS } from '../data/questions';
import { AppProvider } from '../state/AppState';
import { AuthProvider } from '../state/AuthContext';
import { ContentProvider } from '../state/ContentContext';
import type { GrilaCatalog } from '../lib/continut';

/**
 * Stările prin care trece biblioteca înainte să existe grile pe ecran.
 *
 * Până la Faza 4 nu exista niciuna: banca era compilată în bundle, deci era acolo
 * de la primul render. Acum vine prin rețea, iar o rețea care tace nu are voie să
 * arate „0 grile" — ar fi o afirmație falsă prezentată ca stare.
 */
const GRILE = QUESTIONS.map((q) => ({ id: q.id, capId: q.capId }) as GrilaCatalog);

const incarca = vi.fn<() => Promise<GrilaCatalog[]>>();

vi.mock('../lib/continut', async (original) => ({
  ...(await original<typeof import('../lib/continut')>()),
  incarcaCatalogGrile: () => incarca(),
}));

/** Biblioteca se cere abia când există sesiune, deci testul trebuie să aibă una. */
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@b.ro' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { id: 'u1', full_name: 'A', role: 'elev' }, error: null }) }),
      }),
    }),
  },
}));

function monteaza(banca = QUESTIONS) {
  return render(
    <AuthProvider>
      <ContentProvider>
        <AppProvider catalog={banca}>
          <PoartaContinut>
            <div>grilele sunt aici</div>
          </PoartaContinut>
        </AppProvider>
      </ContentProvider>
    </AuthProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PoartaContinut', () => {
  it('spune că se încarcă, fără să pretindă un progres', async () => {
    let elibereaza: (g: GrilaCatalog[]) => void = () => {};
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
