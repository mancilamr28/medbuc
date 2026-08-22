import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOTE_PREFIX } from '../lib/migrations';
import type { NotitaBaza } from '../lib/notite';
import { useNotita } from './useNotita';

const baza = vi.hoisted(() => ({
  peCont: null as NotitaBaza | null,
  scrieri: [] as { capId: string; body: string }[],
  stergeri: [] as string[],
  esueazaScrierea: false,
}));

vi.mock('../lib/notiteBaza', () => ({
  citesteNotita: async () => baza.peCont,
  salveazaNotita: async (_userId: string, capId: string, body: string) => {
    if (baza.esueazaScrierea) throw new Error('rețea');
    baza.scrieri.push({ capId, body });
  },
  stergeNotitaDinBaza: async (capId: string) => {
    baza.stergeri.push(capId);
  },
}));

const sesiune = vi.hoisted(() => ({ user: { id: 'elev-1' } as { id: string } | null }));
vi.mock('./authState', () => ({ useAuthOptional: () => ({ user: sesiune.user }) }));

const CHEIE = `${NOTE_PREFIX}bio-celula`;

function Card() {
  const notita = useNotita('bio-celula');
  return (
    <div>
      <textarea aria-label="notiță" value={notita.body} onChange={(e) => notita.scrie(e.target.value)} />
      <span data-testid="stare">{notita.stare}</span>
      <button type="button" onClick={notita.sterge}>
        șterge
      </button>
      <button type="button" onClick={notita.reincearca}>
        reîncearcă
      </button>
    </div>
  );
}

const localSalvat = (): unknown => JSON.parse(localStorage.getItem(CHEIE) ?? 'null');

beforeEach(() => {
  baza.peCont = null;
  baza.scrieri = [];
  baza.stergeri = [];
  baza.esueazaScrierea = false;
  sesiune.user = { id: 'elev-1' };
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useNotita', () => {
  /**
   * Ordinea contează: discul întâi. Dacă rețeaua ar fi prima, o pană de curent
   * între două litere ar lua textul cu ea.
   */
  it('scrie pe disc la fiecare tastă și pe cont abia după pauză', async () => {
    vi.useFakeTimers();
    render(<Card />);
    await act(async () => {});

    fireEvent.change(screen.getByLabelText('notiță'), { target: { value: 'mitocondria' } });

    expect(localSalvat()).toMatchObject({ body: 'mitocondria' });
    expect(baza.scrieri).toEqual([]);
    expect(screen.getByTestId('stare')).toHaveTextContent('seSalveaza');

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(baza.scrieri).toEqual([{ capId: 'bio-celula', body: 'mitocondria' }]);
    expect(screen.getByTestId('stare')).toHaveTextContent('salvat');
  });

  /**
   * Notițele scrise înainte să existe tabela stăteau doar în browser, sub forma
   * veche — textul gol-goluț, fără oră. Ele trebuie să urce singure, altfel ar
   * rămâne pe un singur dispozitiv și în afara exportului GDPR.
   */
  it('urcă pe cont o notiță veche, salvată doar local', async () => {
    localStorage.setItem(CHEIE, JSON.stringify('scrisă acum un an'));
    render(<Card />);

    await waitFor(() => expect(baza.scrieri).toEqual([{ capId: 'bio-celula', body: 'scrisă acum un an' }]));
    expect(screen.getByLabelText('notiță')).toHaveValue('scrisă acum un an');
  });

  it('preferă notița de pe cont când e mai nouă decât cea locală', async () => {
    localStorage.setItem(CHEIE, JSON.stringify({ body: 'de pe telefon', updatedAt: 1000 }));
    baza.peCont = {
      chapter_id: 'bio-celula',
      body: 'de pe laptop, mai târziu',
      updated_at: new Date(5000).toISOString(),
    };
    render(<Card />);

    await waitFor(() => expect(screen.getByLabelText('notiță')).toHaveValue('de pe laptop, mai târziu'));
    // Nu se urcă nimic: contul avea deja versiunea bună.
    expect(baza.scrieri).toEqual([]);
  });

  it('păstrează notița locală când e mai nouă decât cea de pe cont', async () => {
    localStorage.setItem(CHEIE, JSON.stringify({ body: 'scrisă chiar acum', updatedAt: 9000 }));
    baza.peCont = { chapter_id: 'bio-celula', body: 'veche', updated_at: new Date(1000).toISOString() };
    render(<Card />);

    await waitFor(() => expect(baza.scrieri).toEqual([{ capId: 'bio-celula', body: 'scrisă chiar acum' }]));
    expect(screen.getByLabelText('notiță')).toHaveValue('scrisă chiar acum');
  });

  /**
   * O salvare căzută arăta exact ca una reușită — pe un text scris de mână, ăsta
   * e cel mai scump fel de tăcere din aplicație.
   */
  it('spune când salvarea a eșuat și reia la cerere', async () => {
    vi.useFakeTimers();
    baza.esueazaScrierea = true;
    render(<Card />);
    await act(async () => {});

    fireEvent.change(screen.getByLabelText('notiță'), { target: { value: 'ceva important' } });
    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    expect(screen.getByTestId('stare')).toHaveTextContent('eroare');
    // Textul e în siguranță pe disc, oricât ar fi picat rețeaua.
    expect(localSalvat()).toMatchObject({ body: 'ceva important' });

    // `waitFor` are nevoie de ceasul adevărat ca să-și poată face pașii.
    vi.useRealTimers();
    baza.esueazaScrierea = false;
    await act(async () => {
      fireEvent.click(screen.getByText('reîncearcă'));
    });
    await waitFor(() => expect(baza.scrieri).toEqual([{ capId: 'bio-celula', body: 'ceva important' }]));
  });

  /**
   * Ștergerea trebuie să fie explicită pe cont: cu un simplu text golit, rândul
   * ar rămâne acolo și notița s-ar întoarce la următoarea deschidere.
   */
  it('șterge notița și de pe cont, nu doar de pe dispozitiv', async () => {
    localStorage.setItem(CHEIE, JSON.stringify({ body: 'de șters', updatedAt: 9000 }));
    render(<Card />);
    await waitFor(() => expect(baza.scrieri).toHaveLength(1));

    await act(async () => {
      fireEvent.click(screen.getByText('șterge'));
    });

    expect(localStorage.getItem(CHEIE)).toBeNull();
    expect(baza.stergeri).toEqual(['bio-celula']);
  });

  it('rămâne pe dispozitiv, fără să ceară nimic, când nu există sesiune', async () => {
    sesiune.user = null;
    render(<Card />);
    await act(async () => {});

    fireEvent.change(screen.getByLabelText('notiță'), { target: { value: 'fără cont' } });

    expect(localSalvat()).toMatchObject({ body: 'fără cont' });
    expect(baza.scrieri).toEqual([]);
    expect(screen.getByTestId('stare')).toHaveTextContent('local');
  });
});
