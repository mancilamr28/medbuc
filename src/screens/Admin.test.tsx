import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Admin } from './Admin';
import { QUESTIONS } from '../data/questions';
import { TAXONOMIE_SEED } from '../data/taxonomieSeed';
import { TIPURI_SEED } from '../data/tipuriSeed';
import { construiesteColectii } from '../lib/colectii';
import type { FiltreGrile, GrilaCuStare, GrilaDeSalvat } from '../lib/continut';
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
const schimbaStarea = vi.fn<(ids: readonly string[], s: string) => Promise<number>>(async (ids) => ids.length);
const atribuie = vi.fn<(ids: readonly string[], c: string | null) => Promise<number>>(async (ids) => ids.length);
const salveazaCap = vi.fn<(c: unknown) => Promise<void>>(async () => {});
const salveazaCol = vi.fn<(c: unknown) => Promise<void>>(async () => {});
const sterge = vi.fn<(id: string) => Promise<void>>(async () => {});

/**
 * Lista din Administrare interoghează serverul, nu mai filtrează un array adus
 * în memorie. Falsul face aici exact filtrarea pe care o face PostgREST, ca
 * testele să rămână despre ecran — ce se vede, ce se poate apăsa — nu despre
 * felul în care se compune o interogare.
 */
const filtreaza = (f: FiltreGrile) => {
  const q = f.cautare.trim().toLowerCase();
  return GRILE.filter(
    (g) =>
      (f.status === 'toate' || g.status === f.status) &&
      (q === '' || g.id.toLowerCase().includes(q) || g.text.toLowerCase().includes(q)),
  );
};

vi.mock('../lib/continut', async (original) => ({
  ...(await original<typeof import('../lib/continut')>()),
  incarcaCatalogGrile: async () => GRILE.map((g) => ({ id: g.id, capId: g.capId })),
  // Taxonomia, tipurile și colecțiile vin din bază de la faza 1 încoace; falsul
  // le dă pe cele reale, ca selectoarele ecranului să aibă ce afișa.
  incarcaTaxonomie: async () => TAXONOMIE_SEED,
  incarcaTipuri: async () => TIPURI_SEED,
  citesteAcoperirea: async () => [],
  incarcaColectii: async () =>
    construiesteColectii([
      {
        id: 'umfcd-2026-mg',
        centru_id: 'umfcd',
        nume: 'Admitere UMFCD 2026',
        tip: 'subiect_oficial',
        an: 2026,
        sursa_bibliografica: '',
        acces: 'liber',
        publicat: true,
        position: 0,
      },
    ]),
  cautaGrile: async (f: FiltreGrile, decalaj: number, limita: number) => {
    const toate = filtreaza(f);
    return { randuri: toate.slice(decalaj, decalaj + limita), total: toate.length };
  },
  citesteGrilaAdmin: async (id: string) => GRILE.find((g) => g.id === id)!,
  exportaGrileAdmin: async () => [...GRILE],
  numaraPeStare: async (f: FiltreGrile) => ({
    ciorna: filtreaza({ ...f, status: 'ciorna' }).length,
    publicata: filtreaza({ ...f, status: 'publicata' }).length,
    retrasa: filtreaza({ ...f, status: 'retrasa' }).length,
  }),
  schimbaStareaGrilelor: (ids: readonly string[], s: string) => schimbaStarea(ids, s),
  atribuieColectia: (ids: readonly string[], c: string | null) => atribuie(ids, c),
  salveazaCapitol: (c: unknown) => salveazaCap(c),
  salveazaColectie: (c: unknown) => salveazaCol(c),
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
          <AppProvider catalog={QUESTIONS}>
            <Admin />
          </AppProvider>
        </ContentProvider>
      </AuthProvider>
    </ToastProvider>,
  );
}

/** Formularul apare abia după ce rolul a fost citit din `profiles`. */
const gata = () => screen.findByRole('button', { name: 'Adaugă o grilă' });
const formular = async (user: ReturnType<typeof userEvent.setup>, id: string) => {
  await user.click(await gata());
  await user.selectOptions(screen.getByLabelText('Capitol', { exact: true }), 'bio-nervos');
  await user.click(screen.getByText('Cod intern (completat automat)'));
  await user.clear(screen.getByPlaceholderText('bio-nervos-07'));
  await user.type(screen.getByPlaceholderText('bio-nervos-07'), id);
  await user.click(screen.getByRole('button', { name: 'Continuă' }));
};
const revizuire = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: '3. Verificare și salvare' }));
};

const GRILE_INITIALE = [...GRILE];

beforeEach(() => {
  // Secțiunea vine din hash, nu din state: fără reset, un test care a intrat în
  // import lasă ecranul acolo pentru toate cele care urmează.
  window.location.hash = '#/admin';
  GRILE.length = 0;
  GRILE.push(...GRILE_INITIALE);
  vi.clearAllMocks();
  rol = 'admin';
});

describe('Administrare', () => {
  it('cere acordul înainte să schimbe sursa unui import existent', async () => {
    const user = userEvent.setup();
    monteaza();
    await user.click(await screen.findByRole('button', { name: 'Importă un lot' }));
    await user.click(screen.getByLabelText('Lipește tabelul aici'));
    await user.paste('Enunț\tA\tB\tCorect\tExplicație\nQ\ta\tb\tA\te');
    await user.click(screen.getByRole('tab', { name: 'Surse și colecții' }));
    await user.click(await screen.findByRole('button', { name: 'Importă grile: Admitere UMFCD 2026' }));
    expect(screen.getByLabelText('Origine / colecție')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Aplică sursa lotului' }));
    expect(screen.getByLabelText('Origine / colecție')).toHaveValue('umfcd-2026-mg');
    expect(screen.getByLabelText('Tip de conținut')).toHaveValue('subiect_oficial');
    expect(screen.getByLabelText('Lipește tabelul aici')).toHaveValue('Enunț\tA\tB\tCorect\tExplicație\nQ\ta\tb\tA\te');
    expect(salveaza).not.toHaveBeenCalled();
  });
  it('deschide biblioteca filtrată pe colecția aleasă', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();
    await user.click(screen.getByRole('tab', { name: 'Surse și colecții' }));
    await user.click(await screen.findByRole('button', { name: 'Vezi grilele: Admitere UMFCD 2026' }));
    expect(screen.getByRole('combobox', { name: 'Filtrează după colecție' })).toHaveValue('umfcd-2026-mg');
  });
  it('începe o întrebare din colecție cu originea, tipul și anul completate', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();
    await user.click(screen.getByRole('tab', { name: 'Surse și colecții' }));
    await user.click(await screen.findByRole('button', { name: 'Adaugă grile: Admitere UMFCD 2026' }));
    expect(screen.getByRole('combobox', { name: 'Origine / colecție' })).toHaveValue('umfcd-2026-mg');
    expect(screen.getByRole('combobox', { name: 'Tip de conținut' })).toHaveValue('subiect_oficial');
    expect(screen.getByLabelText('Anul subiectului')).toHaveValue('2026');
    expect(salveaza).not.toHaveBeenCalled();
  });
  it('pornește scrierea și importul din capitolul ales în acoperire', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();
    await user.click(screen.getByRole('tab', { name: 'Acoperirea programei' }));
    await user.click(await screen.findByRole('button', { name: 'Adaugă o grilă: 03. Sistemul nervos' }));
    expect(screen.getByLabelText('Capitol', { exact: true })).toHaveValue('bio-nervos');
    await user.click(screen.getByRole('tab', { name: 'Acoperirea programei' }));
    await user.click(await screen.findByRole('button', { name: 'Importă grile: 04. Glandele endocrine' }));
    await waitFor(() => expect(screen.getByLabelText('Capitolul lotului')).toHaveValue('bio-endocrin'));
    await user.click(screen.getByLabelText('Lipește tabelul aici'));
    await user.paste('Enunț\tA\tB\tCorect\tExplicație\nQ\ta\tb\tA\te');
    await user.click(screen.getByRole('tab', { name: 'Acoperirea programei' }));
    await user.click(await screen.findByRole('button', { name: 'Importă grile: 03. Sistemul nervos' }));
    expect(screen.getByLabelText('Capitolul lotului')).toHaveValue('bio-endocrin');
    await user.click(screen.getByRole('button', { name: 'Aplică acest capitol lotului' }));
    expect(screen.getByLabelText('Capitolul lotului')).toHaveValue('bio-nervos');
    expect(screen.getByLabelText('Lipește tabelul aici')).toHaveValue('Enunț\tA\tB\tCorect\tExplicație\nQ\ta\tb\tA\te');
    expect(salveaza).not.toHaveBeenCalled();
  });
  it('nu înlocuiește grila nesalvată când adaugi din alt capitol', async () => {
    const user = userEvent.setup();
    monteaza();
    await formular(user, 'in-curs');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Nu pierde textul');
    await user.click(screen.getByRole('tab', { name: 'Acoperirea programei' }));
    await user.click(await screen.findByRole('button', { name: 'Adaugă o grilă: 04. Glandele endocrine' }));
    expect(screen.getByLabelText('Enunțul grilei')).toHaveValue('Nu pierde textul');
    await user.click(screen.getByRole('button', { name: '1. Încadrare și sursă' }));
    expect(screen.getByLabelText('Capitol', { exact: true })).toHaveValue('bio-nervos');
  });
  it('previzualizează fără să înlocuiască formularul nesalvat', async () => {
    const user = userEvent.setup();
    monteaza();
    await formular(user, 'lucru-in-curs');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Textul meu neterminat');
    await user.click(screen.getByRole('button', { name: 'Înapoi la bibliotecă' }));
    await user.click((await screen.findAllByRole('button', { name: 'Previzualizează' }))[0]!);
    expect(await screen.findByRole('article', { name: 'Previzualizarea grilei' })).toHaveTextContent(GRILE[0]!.expl);
    expect(salveaza).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Continuă grila nesalvată' }));
    expect(screen.getByLabelText('Enunțul grilei')).toHaveValue('Textul meu neterminat');
  });
  it('corectează un import invalid direct în editor și cere o nouă verificare', async () => {
    const user = userEvent.setup();
    monteaza();
    await user.click(await screen.findByRole('button', { name: 'Importă un lot' }));
    await user.selectOptions(screen.getByLabelText('Capitolul lotului'), 'bio-nervos');
    await user.click(screen.getByLabelText('Lipește tabelul aici'));
    await user.paste('Enunț\tA\tB\tCorect\tExplicație\nDe reparat\tPrima\tA doua\tZ\tExplicație');
    await user.click(screen.getByRole('button', { name: 'Corectează tabelul aici' }));
    await user.clear(screen.getByRole('textbox', { name: 'Rândul 1: Corect' }));
    await user.type(screen.getByRole('textbox', { name: 'Rândul 1: Corect' }), 'B');
    expect(screen.getByRole('button', { name: 'Importă 1 grilă' })).toBeDisabled();
    await user.click(screen.getByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    await user.type(screen.getByRole('textbox', { name: 'Rândul 1: Enunț' }), ' corectat');
    expect(screen.getByRole('button', { name: 'Importă 1 grilă' })).toBeDisabled();
    await user.click(screen.getByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    await user.click(screen.getByRole('button', { name: 'Importă 1 grilă' }));
    await waitFor(() => expect(salveaza).toHaveBeenCalledWith(expect.objectContaining({ text: 'De reparat corectat', correct: 'B', id: expect.stringMatching(/^lot-.*-1$/) })));
  });
  it('salvează și continuă cu altă grilă fără să reutilizeze răspunsul corect', async () => {
    const user = userEvent.setup();
    monteaza();
    await formular(user, 'prima-din-lot');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Întrebare');
    await user.type(screen.getByLabelText('Varianta A'), 'Prima');
    await user.type(screen.getByLabelText('Varianta B'), 'A doua');
    await user.click(screen.getByRole('button', { name: 'Varianta B e răspunsul corect' }));
    await user.type(screen.getByLabelText('Explicația generală'), 'Explicație');
    await revizuire(user);
    await user.click(screen.getByRole('button', { name: 'Salvează ciorna și adaugă alta' }));
    await waitFor(() => expect(screen.getByLabelText('Enunțul grilei')).toHaveValue(''));
    expect(salveaza).toHaveBeenCalledWith(expect.objectContaining({ id: 'prima-din-lot', status: 'ciorna' }));
    expect(screen.getByRole('button', { name: 'Varianta B e răspunsul corect' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: '1. Încadrare și sursă' }));
    expect(screen.getByLabelText('Capitol', { exact: true })).toHaveValue('bio-nervos');
  });
  it('recuperează întrebarea incompletă după închiderea administrării', async () => {
    const user = userEvent.setup();
    const vedere = monteaza();
    await formular(user, 'ciorna-recuperata');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Întrebare neterminată');
    vedere.unmount();
    window.location.hash = '#/admin';
    monteaza();
    await user.click(await screen.findByRole('button', { name: 'Continuă grila nesalvată' }));
    expect(screen.getByLabelText('Enunțul grilei')).toHaveValue('Întrebare neterminată');
    expect(salveaza).not.toHaveBeenCalled();
  });
  it('păstrează grila nesalvată când schimbi secțiunea și completează cheia grupată', async () => {
    const user = userEvent.setup();
    monteaza();
    await user.click(await gata());
    await user.selectOptions(screen.getByLabelText('Tipul întrebării'), 'grupat');
    await user.click(screen.getByRole('button', { name: 'Continuă' }));
    expect(screen.getByLabelText('Varianta A')).toHaveValue(TIPURI_SEED.tip('grupat')!.sablonOptiuni![0]);
    expect(screen.getByLabelText('Varianta A')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Varianta A e răspunsul corect' })).toHaveAttribute('aria-pressed', 'false');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Text păstrat');
    await user.click(screen.getByRole('tab', { name: 'Surse și colecții' }));
    await user.click(screen.getByRole('button', { name: 'Continuă grila nesalvată' }));
    expect(screen.getByLabelText('Enunțul grilei')).toHaveValue('Text păstrat');
  });
  it('nu presupune că A este corect și salvează fără cod scris de administrator', async () => {
    const user = userEvent.setup();
    monteaza();
    await user.click(await gata());
    await user.selectOptions(screen.getByLabelText('Capitol', { exact: true }), 'bio-nervos');
    await user.click(screen.getByRole('button', { name: 'Continuă' }));
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Întrebare');
    await user.type(screen.getByLabelText('Varianta A'), 'Prima');
    await user.type(screen.getByLabelText('Varianta B'), 'A doua');
    await user.type(screen.getByLabelText('Explicația generală'), 'Explicație');
    await revizuire(user);
    await user.click(screen.getByRole('button', { name: 'Salvează ca ciornă' }));
    expect(salveaza).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '2. Întrebare și răspuns' }));
    await user.click(screen.getByRole('button', { name: 'Varianta B e răspunsul corect' }));
    await revizuire(user);
    await user.click(screen.getByRole('button', { name: 'Salvează ca ciornă' }));
    await waitFor(() => expect(salveaza).toHaveBeenCalledWith(expect.objectContaining({ id: expect.stringMatching(/^grila-/), correct: 'B', status: 'ciorna' })));
  });
  it('deschide biblioteca fără formularul de adăugare lângă ea', async () => {
    monteaza();
    await screen.findByText('bio-nervos-ciorna');
    expect(screen.queryByRole('textbox', { name: 'Enunțul grilei' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adaugă o grilă' })).toBeInTheDocument();
  });
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

    await formular(user, 'bio-nervos-42');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Care este rolul nervului vag?');
    await user.type(screen.getByLabelText('Varianta A'), 'prima');
    await user.type(screen.getByLabelText('Varianta B'), 'a doua');
    await user.click(screen.getByRole('button', { name: 'Varianta B e răspunsul corect' }));
    await user.type(screen.getByLabelText('Explicația generală'), 'Fiindcă da.');

    await revizuire(user);
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

    await formular(user, 'bio-nervos-42');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Enunț');
    await user.type(screen.getByLabelText('Varianta A'), 'prima');
    await user.type(screen.getByLabelText('Varianta B'), 'a doua');
    await user.type(screen.getByLabelText('Explicația generală'), 'Explicație');
    // `correct` a rămas pe A… care e scrisă. Se golește ca să nu mai fie.
    await user.clear(screen.getByLabelText('Varianta A'));
    await revizuire(user);

    await user.click(screen.getByRole('button', { name: 'Publică grila' }));

    expect(salveaza).not.toHaveBeenCalled();
    // Apare de două ori, intenționat: în lista de probleme de sub formular și
    // în notificare, fiindcă butonul apăsat poate fi departe de câmpul vinovat.
    await waitFor(() =>
      expect(screen.getAllByText(/Scrie cel puțin 2 variante/).length).toBeGreaterThan(0),
    );
  });

  it('salvează ciorna cu starea de ciornă, nu publicată', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await formular(user, 'bio-nervos-43');
    await user.type(screen.getByLabelText('Enunțul grilei'), 'Enunț');
    await user.type(screen.getByLabelText('Varianta A'), 'prima');
    await user.type(screen.getByLabelText('Varianta B'), 'a doua');
    await user.type(screen.getByLabelText('Explicația generală'), 'Explicație');

    await user.click(screen.getByRole('button', { name: 'Varianta A e răspunsul corect' }));
    await revizuire(user);
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

    await user.click((await screen.findAllByText('Mai multe acțiuni'))[0]!);
    await user.click((await screen.findAllByRole('button', { name: 'Șterge' }))[0]!);

    expect(sterge).not.toHaveBeenCalled();
    expect(screen.getByText('Ștergi definitiv?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Da, șterge' }));
    await waitFor(() => expect(sterge).toHaveBeenCalledWith(GRILE[0]!.id));
  });

  it('încarcă o grilă existentă în formular la editare', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click((await screen.findAllByRole('button', { name: 'Editează' }))[0]!);

    expect(screen.getByLabelText('Enunțul grilei')).toHaveValue(GRILE[0]!.text);
    // Identitatea nu se schimbă la editare: id-ul e cheia din `attempts` și din
    // lucrările salvate, deci câmpul e blocat.
    expect(screen.getByDisplayValue(GRILE[0]!.id)).toBeDisabled();
  });
});

/**
 * Importul în masă.
 *
 * Regulile în sine sunt testate în `importLot.test.ts`, pe funcții pure. Aici se
 * verifică doar ce nu se vede de acolo: că panoul chiar trimite spre bază, că un
 * rând stricat nu pleacă odată cu lotul, și că lista rămasă vizibilă alături nu
 * te lasă blocat în modul greșit.
 */
describe('Administrare · import în masă', () => {
  it('importă din tabel numai după verificare și păstrează textul la schimbarea secțiunii', async () => {
    const user = userEvent.setup();
    monteaza();
    await user.click(await screen.findByRole('button', { name: 'Importă un lot' }));
    await user.selectOptions(screen.getByLabelText('Capitolul lotului'), 'bio-nervos');
    const text = 'Enunț\tA\tB\tCorect\tExplicație\nDin tabel\tPrima\tA doua\tB\tExplicație';
    await user.click(screen.getByLabelText('Lipește tabelul aici'));
    await user.paste(text);
    expect(screen.getByRole('button', { name: 'Importă 1 grilă' })).toBeDisabled();
    await user.click(screen.getByRole('tab', { name: 'Surse și colecții' }));
    await user.click(screen.getByRole('button', { name: 'Importă un lot' }));
    expect(screen.getByLabelText('Lipește tabelul aici')).toHaveValue(text);
    await user.click(screen.getByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    await user.click(screen.getByRole('button', { name: 'Importă 1 grilă' }));
    await waitFor(() => expect(salveaza).toHaveBeenCalledWith(expect.objectContaining({ text: 'Din tabel', correct: 'B', status: 'ciorna', id: expect.stringMatching(/^lot-/) })));
  });
  const grilaJson = (peste: Record<string, unknown> = {}) => ({
    id: 'bio-nervos-90',
    capId: 'bio-nervos',
    tip: 'simplu',
    text: 'Enunțul importat.',
    opts: [
      ['A', 'prima'],
      ['B', 'a doua'],
    ],
    correct: 'B',
    expl: 'Explicația.',
    src: 'Manual, p. 1',
    ...peste,
  });

  const lipeste = async (user: ReturnType<typeof userEvent.setup>, lot: unknown) => {
    await user.click(await screen.findByRole('button', { name: 'Importă un lot' }));
    await user.click(screen.getByRole('tab', { name: 'JSON (avansat)' }));
    const camp = await screen.findByLabelText('Grilele, în JSON');
    await user.click(camp);
    await user.paste(JSON.stringify(lot, null, 2));
  };

  it('trimite fiecare grilă din lot, o cerere pe grilă', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await lipeste(user, [grilaJson(), grilaJson({ id: 'bio-nervos-91' })]);
    await user.click(screen.getByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    await user.click(screen.getByRole('button', { name: 'Importă 2 grile' }));

    await waitFor(() => expect(salveaza).toHaveBeenCalledTimes(2));
    expect(salveaza.mock.calls.map((c) => c[0]!.id)).toEqual(['bio-nervos-90', 'bio-nervos-91']);
    // Fără stare proprie, lotul intră ca ciornă: publicarea e o decizie separată.
    expect(salveaza.mock.calls[0]![0]!.status).toBe('ciorna');
  });

  /**
   * Bucata care contează la două sute de grile: un rând stricat nu are voie să
   * oprească lotul, dar nici să plece spre bază sperând că trece.
   */
  it('lasă deoparte rândul cu probleme și importă restul', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await lipeste(user, [grilaJson(), grilaJson({ id: 'bio-nervos-91', correct: 'E' })]);

    expect(await screen.findByText(/Rândul 2 · bio-nervos-91/)).toBeInTheDocument();
    expect(screen.getByText(/Răspunsul corect trebuie să fie una dintre variantele scrise/)).toBeInTheDocument();

    await user.click(screen.getByLabelText('Am verificat întrebările și răspunsurile corecte.'));
    await user.click(screen.getByLabelText(/Confirm modificarea/));
    await user.click(screen.getByRole('button', { name: 'Importă 1 grilă' }));

    await waitFor(() => expect(salveaza).toHaveBeenCalledTimes(1));
    expect(salveaza.mock.calls[0]![0]!.id).toBe('bio-nervos-90');
  });

  /** Rescrierea e legitimă — așa se relipește un lot corectat — dar se spune înainte. */
  it('anunță că un id existent va rescrie grila', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await lipeste(user, [grilaJson({ id: GRILE[0]!.id })]);

    // Un singur rând, deci verbul e la singular. Prima versiune a testului cerea
    // „rescriu", fiindcă asta scria ecranul — a picat abia când s-a reparat.
    expect(await screen.findByText(/rescrie o grilă existentă/)).toBeInTheDocument();
  });

  it('nu poate porni un import gol', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(await screen.findByRole('button', { name: 'Importă un lot' }));

    expect(screen.getByRole('button', { name: 'Importă' })).toBeDisabled();
  });

  /**
   * Lista bibliotecii rămâne vizibilă în ambele moduri. Fără comutarea asta,
   * „Editează" ar umple un formular ascuns și ar părea că butonul e mort.
   */
  it('revine la formular când editezi din listă', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(await screen.findByRole('button', { name: 'Importă un lot' }));
    expect(screen.queryByLabelText('Enunțul grilei')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Înapoi la bibliotecă' }));
    await user.click((await screen.findAllByRole('button', { name: 'Editează' }))[0]!);

    expect(await screen.findByLabelText('Enunțul grilei')).toHaveValue(GRILE[0]!.text);
  });

  /**
   * Lista aducea biblioteca întreagă în memorie și o filtra cu `Array.filter`.
   * Merge la 181 de grile și nu mai merge la douăzeci de mii — nu din cauza
   * randării, ci fiindcă fiecare deschidere a ecranului ar transfera zeci de
   * megaocteți, cu toate variantele și explicațiile lor.
   */

  /**
   * După un import de o sută de grile, publicarea lor una câte una înseamnă o
   * sută de dus-întorsuri. Cifra din mesaj vine de la bază — câte rânduri a
   * atins chiar update-ul — nu câte s-au trimis.
   */
  it('publică în masă doar grilele bifate', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(await screen.findByLabelText('Alege bio-nervos-ciorna'));
    expect(screen.getByText('1 grilă aleasă')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Publică' }));

    await waitFor(() => expect(schimbaStarea).toHaveBeenCalledWith(['bio-nervos-ciorna'], 'publicata'));
    // Selecția se golește după operație: altfel al doilea clic ar reface-o tăcut.
    await waitFor(() => expect(screen.queryByText('1 grilă aleasă')).not.toBeInTheDocument());
  });

  it('atribuie o colecție lotului bifat', async () => {
    const user = userEvent.setup();
    monteaza();
    await gata();

    await user.click(await screen.findByLabelText('Alege bio-nervos-ciorna'));
    await user.selectOptions(
      screen.getByLabelText('Atribuie o colecție grilelor alese'),
      'umfcd-2026-mg',
    );

    await waitFor(() =>
      expect(atribuie).toHaveBeenCalledWith(['bio-nervos-ciorna'], 'umfcd-2026-mg'),
    );
  });

  it('aduce o singură pagină, nu toată biblioteca', async () => {
    GRILE.push(
      ...Array.from({ length: 60 }, (_, i) => ({
        ...QUESTIONS[0]!,
        id: `bio-umplutura-${String(i).padStart(2, '0')}`,
        status: 'publicata' as const,
      })),
    );

    monteaza();

    await waitFor(() => expect(screen.getByText(/din 62 de grile/)).toBeInTheDocument());
    // 25 pe pagină: rândurile randate sunt mult sub cele 62 care trec de filtru.
    expect(screen.getAllByRole('button', { name: 'Editează' })).toHaveLength(25);
    expect(screen.getByRole('button', { name: /Înapoi/ })).toBeDisabled();
  });

  it('trece la pagina următoare fără să reia totul', async () => {
    const user = userEvent.setup();
    GRILE.push(
      ...Array.from({ length: 60 }, (_, i) => ({
        ...QUESTIONS[0]!,
        id: `bio-umplutura-${String(i).padStart(2, '0')}`,
        status: 'publicata' as const,
      })),
    );

    monteaza();
    await waitFor(() => expect(screen.getByText(/1–25 din/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Înainte/ }));

    await waitFor(() => expect(screen.getByText(/26–50 din/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Înapoi/ })).toBeEnabled();
  });
});

/**
 * Materiile și capitolele se adăugau prin migrare — adică din editorul SQL, de
 * către cineva care știe SQL. E chiar bariera pe care faza 1 a scos-o din
 * runtime: taxonomia trăiește în bază, deci trebuie și scrisă de acolo.
 */
describe('Administrare · materii și capitole', () => {
  it('adaugă un capitol în materia lui, cu poziția următoare', async () => {
    const user = userEvent.setup();
    monteaza();
    await user.click(await screen.findByRole('tab', { name: 'Materii și capitole' }));
    await user.click(screen.getByText(/Biologie · 12 capitole/));

    await user.click(screen.getByText('Adaugă un capitol în Biologie'));
    await user.click(screen.getAllByText('Cod intern al capitolului (automat)')[0]!);
    await user.clear(screen.getByLabelText('Identificatorul capitolului nou din Biologie'));
    await user.type(await screen.findByLabelText('Identificatorul capitolului nou din Biologie'), 'bio-nou');
    await user.type(screen.getByLabelText('Numele capitolului nou din Biologie'), 'Capitol nou');
    await user.type(screen.getByLabelText('Numărul capitolului nou din Biologie'), '13');
    await user.click(screen.getByRole('button', { name: 'Adaugă un capitol în Biologie' }));

    await waitFor(() =>
      expect(salveazaCap).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bio-nou', materieId: 'bio', nr: '13', nume: 'Capitol nou' }),
      ),
    );
  });

  it('redenumește un capitol fără să-i schimbe materia', async () => {
    const user = userEvent.setup();
    monteaza();
    await user.click(await screen.findByRole('tab', { name: 'Materii și capitole' }));
    await user.click(screen.getByText(/Biologie · 12 capitole/));

    await user.click(await screen.findByRole('button', { name: /Redenumește 01. Celula/ }));
    const camp = screen.getByLabelText('Numele capitolului bio-celula');
    await user.clear(camp);
    await user.type(camp, 'Celula (revizuit)');
    await user.click(screen.getByRole('button', { name: 'Salvează capitolul bio-celula' }));

    await waitFor(() =>
      expect(salveazaCap).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'bio-celula', materieId: 'bio', nume: 'Celula (revizuit)' }),
      ),
    );
  });
});

describe('Administrare · colecții', () => {
  /**
   * O culegere nu ține de un centru de admitere; o lucrare, da. Diferența
   * contează pentru întrebarea de drepturi, care vine înaintea oricărei plăți.
   */
  it('creează o culegere fără centru și cu sursa ei bibliografică', async () => {
    const user = userEvent.setup();
    monteaza();
    await user.click(await screen.findByRole('tab', { name: 'Surse și colecții' }));

    await user.click(screen.getByText('Adaugă o sursă / colecție'));
    await user.click(screen.getByText('Cod intern (automat)'));
    await user.clear(screen.getByLabelText('Identificator'));
    await user.type(await screen.findByLabelText('Identificator'), 'corint-nervos');
    await user.type(screen.getByLabelText('Nume'), 'Corint – Sistemul nervos');
    await user.selectOptions(screen.getByLabelText('Fel'), 'culegere');
    await user.type(screen.getByLabelText('Sursa bibliografică'), 'Corint, ediția 2024');
    await user.click(screen.getByRole('button', { name: 'Adaugă colecția' }));

    await waitFor(() =>
      expect(salveazaCol).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'corint-nervos',
          tip: 'culegere',
          centruId: null,
          sursaBibliografica: 'Corint, ediția 2024',
        }),
      ),
    );
  });

  it('leagă o lucrare de admitere de centru', async () => {
    const user = userEvent.setup();
    monteaza();
    await user.click(await screen.findByRole('tab', { name: 'Surse și colecții' }));

    await user.click(screen.getByText('Adaugă o sursă / colecție'));
    await user.click(screen.getByText('Cod intern (automat)'));
    await user.clear(screen.getByLabelText('Identificator'));
    await user.type(await screen.findByLabelText('Identificator'), 'umfcd-2027-mg');
    await user.type(screen.getByLabelText('Nume'), 'Admitere 2027');
    await user.type(screen.getByLabelText('Anul'), '2027');
    await user.click(screen.getByRole('button', { name: 'Adaugă colecția' }));

    await waitFor(() =>
      expect(salveazaCol).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'umfcd-2027-mg', tip: 'subiect_oficial', centruId: 'umfcd', an: 2027 }),
      ),
    );
  });
});
