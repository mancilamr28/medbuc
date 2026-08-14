import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Admin } from './Admin';
import { QUESTIONS } from '../data/questions';
import type { GrilaCuStare, GrilaDeSalvat } from '../lib/continut';
import { AppProvider } from '../state/AppState';
import { AuthProvider } from '../state/AuthContext';
import { ContentProvider } from '../state/ContentContext';
import { ToastProvider } from '../state/ToastContext';

/**
 * Administrarea, după ce a încetat să fie machetă.
 *
 * Avea nouă câmpuri necontrolate și două butoane fără handler, sub un mesaj care
 * promitea că „fiecare modificare este înregistrată pe contul tău". Testele de
 * aici țin exact promisiunile pe care ecranul le face acum.
 */
const GRILE: GrilaCuStare[] = [
  { ...QUESTIONS[0]!, status: 'publicata' },
  { ...QUESTIONS[1]!, id: 'bio-nervos-ciorna', status: 'ciorna' },
];

let rol = 'admin';
const salveaza = vi.fn<(g: GrilaDeSalvat) => Promise<void>>(async () => {});
const sterge = vi.fn<(id: string) => Promise<void>>(async () => {});

vi.mock('../lib/continut', async (original) => ({
  ...(await original<typeof import('../lib/continut')>()),
  incarcaGrile: async () => GRILE,
  salveazaGrila: (g: GrilaDeSalvat) => salveaza(g),
  stergeGrila: (id: string) => sterge(id),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@b.ro' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { id: 'u1', full_name: 'Admin', role: rol }, error: null }) }),
      }),
    }),
  },
}));

function monteaza() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <ContentProvider>
          <AppProvider questions={QUESTIONS}>
            <Admin />
          </AppProvider>
        </ContentProvider>
      </AuthProvider>
    </ToastProvider>,
  );
}

/** Formularul apare abia după ce rolul a fost citit din `profiles`. */
const gata = () => screen.findByLabelText('Enunțul grilei');

beforeEach(() => {
  vi.clearAllMocks();
  rol = 'admin';
});

describe('Administrare', () => {
  it('nu se deschide pentru un elev', async () => {
    rol = 'elev';
    monteaza();

    expect(await screen.findByText(/Nu ai acces la această zonă/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Enunțul grilei')).not.toBeInTheDocument();
  });

  it('scrie o grilă nouă în bibliotecă', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.type(screen.getByPlaceholderText('bio-nervos-07'), 'bio-nervos-42');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Care este rolul nervului vag?');
    await user.type(screen.getByLabelText('Varianta A'), 'prima');
    await user.type(screen.getByLabelText('Varianta B'), 'a doua');
    await user.click(screen.getByRole('button', { name: 'Varianta B e răspunsul corect' }));
    await user.type(screen.getByLabelText('Explicația generală'), 'Fiindcă da.');

    await user.click(screen.getByRole('button', { name: 'Publică grila' }));

    await waitFor(() => expect(salveaza).toHaveBeenCalledTimes(1));
    expect(salveaza.mock.calls[0]![0]).toMatchObject({
      id: 'bio-nervos-42',
      status: 'publicata',
      correct: 'B',
      opts: [
        { key: 'A', text: 'prima' },
        { key: 'B', text: 'a doua' },
      ],
    });
  });

  /**
   * Aceeași regulă pe care o apără cheia externă amânată din schemă. Prinsă în
   * formular, autorul o vede lângă câmp; prinsă abia de server, ar afla după ce
   * a apăsat salvează.
   */
  it('nu trimite o grilă al cărei răspuns corect nu e scris', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.type(screen.getByPlaceholderText('bio-nervos-07'), 'bio-nervos-42');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Enunț');
    await user.type(screen.getByLabelText('Varianta A'), 'prima');
    await user.type(screen.getByLabelText('Varianta B'), 'a doua');
    await user.type(screen.getByLabelText('Explicația generală'), 'Explicație');
    // `correct` a rămas pe A… care e scrisă. Se golește ca să nu mai fie.
    await user.clear(screen.getByLabelText('Varianta A'));

    await user.click(screen.getByRole('button', { name: 'Publică grila' }));

    expect(salveaza).not.toHaveBeenCalled();
    // Apare de două ori, intenționat: în lista de probleme de sub formular și
    // în notificare, fiindcă butonul apăsat poate fi departe de câmpul vinovat.
    await waitFor(() =>
      expect(screen.getAllByText(/Scrie cel puțin două variante/).length).toBeGreaterThan(0),
    );
  });

  it('salvează ciorna cu starea de ciornă, nu publicată', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.type(screen.getByPlaceholderText('bio-nervos-07'), 'bio-nervos-43');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Enunț');
    await user.type(screen.getByLabelText('Varianta A'), 'prima');
    await user.type(screen.getByLabelText('Varianta B'), 'a doua');
    await user.type(screen.getByLabelText('Explicația generală'), 'Explicație');

    await user.click(screen.getByRole('button', { name: 'Salvează ca ciornă' }));

    await waitFor(() => expect(salveaza).toHaveBeenCalledTimes(1));
    expect(salveaza.mock.calls[0]![0]!.status).toBe('ciorna');
  });

  it('arată ciornele administratorului în listă', async () => {
    monteaza();
    await gata();

    // Elevii nu văd ciornele — politica `questions_citire` le ascunde. În
    // Administrare trebuie să apară, altfel n-ar exista cale înapoi la ele.
    const rand = (await screen.findByText('bio-nervos-ciorna')).closest('.list-row');
    expect(rand).not.toBeNull();
    expect(rand!.textContent).toContain('Ciornă');
  });

  /** Ștergerea unei grile e ireversibilă; un clic nu are voie să o pornească. */
  it('nu șterge de la primul clic', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(screen.getAllByRole('button', { name: 'Șterge' })[0]!);

    expect(sterge).not.toHaveBeenCalled();
    expect(screen.getByText('Ștergi definitiv?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Da, șterge' }));
    await waitFor(() => expect(sterge).toHaveBeenCalledWith(GRILE[0]!.id));
  });

  it('încarcă o grilă existentă în formular la editare', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(screen.getAllByRole('button', { name: 'Editează' })[0]!);

    expect(screen.getByLabelText('Enunțul grilei')).toHaveValue(GRILE[0]!.text);
    // Identitatea nu se schimbă la editare: id-ul e cheia din `attempts` și din
    // lucrările salvate, deci câmpul e blocat.
    expect(screen.getByDisplayValue(GRILE[0]!.id)).toBeDisabled();
  });
});
