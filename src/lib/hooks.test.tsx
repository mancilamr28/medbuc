import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { usePersistentState } from './hooks';

/**
 * Componentă care imită exact tiparul din `Grile.tsx`: cheia notiței se schimbă
 * odată cu capitolul, cât timp componenta rămâne montată.
 */
function NotitaPeCapitol({ capitole }: { capitole: string[] }) {
  const [cap, setCap] = useState(capitole[0]!);
  const [note, setNote] = usePersistentState<string>(`medbuc.note.${cap}`, '');

  return (
    <div>
      <textarea aria-label="Notiță" value={note} onChange={(e) => setNote(e.target.value)} />
      {capitole.map((c) => (
        <button key={c} type="button" onClick={() => setCap(c)}>
          {c}
        </button>
      ))}
    </div>
  );
}

describe('usePersistentState cu cheie schimbătoare', () => {
  it('arată notița capitolului curent, nu pe a celui dinainte', async () => {
    localStorage.setItem('medbuc.note.bio-nervos', JSON.stringify('despre măduvă'));
    localStorage.setItem('medbuc.note.chim-alcooli', JSON.stringify('despre alcooli'));

    render(<NotitaPeCapitol capitole={['bio-nervos', 'chim-alcooli']} />);
    const textarea = screen.getByLabelText('Notiță');
    expect(textarea).toHaveValue('despre măduvă');

    await userEvent.click(screen.getByRole('button', { name: 'chim-alcooli' }));
    expect(textarea).toHaveValue('despre alcooli');
  });

  /**
   * Regresia care a costat date: înainte, la schimbarea capitolului textarea
   * păstra textul vechi, iar prima tastă îl salva peste notița reală a noului
   * capitol. Testul scrie efectiv, apoi verifică ce a rămas în storage.
   */
  it('nu suprascrie notița altui capitol la prima tastă', async () => {
    localStorage.setItem('medbuc.note.bio-nervos', JSON.stringify('despre măduvă'));
    localStorage.setItem('medbuc.note.chim-alcooli', JSON.stringify('despre alcooli'));

    render(<NotitaPeCapitol capitole={['bio-nervos', 'chim-alcooli']} />);
    await userEvent.click(screen.getByRole('button', { name: 'chim-alcooli' }));
    await userEvent.type(screen.getByLabelText('Notiță'), '!');

    expect(JSON.parse(localStorage.getItem('medbuc.note.chim-alcooli')!)).toBe('despre alcooli!');
    expect(JSON.parse(localStorage.getItem('medbuc.note.bio-nervos')!)).toBe('despre măduvă');
  });

  it('pornește gol pe un capitol fără notiță salvată', async () => {
    localStorage.setItem('medbuc.note.bio-nervos', JSON.stringify('despre măduvă'));

    render(<NotitaPeCapitol capitole={['bio-nervos', 'bio-celula']} />);
    await userEvent.click(screen.getByRole('button', { name: 'bio-celula' }));

    expect(screen.getByLabelText('Notiță')).toHaveValue('');
  });

  it('scrie sub cheia curentă, nu sub cea de la montare', async () => {
    render(<NotitaPeCapitol capitole={['bio-nervos', 'chim-alcooli']} />);
    await userEvent.click(screen.getByRole('button', { name: 'chim-alcooli' }));
    await userEvent.type(screen.getByLabelText('Notiță'), 'nou');

    expect(JSON.parse(localStorage.getItem('medbuc.note.chim-alcooli')!)).toBe('nou');
    expect(localStorage.getItem('medbuc.note.bio-nervos')).toBeNull();
  });

  it('aruncă valoarea care nu trece de validator și o șterge din storage', () => {
    localStorage.setItem('medbuc.test', JSON.stringify({ formaVeche: true }));
    const isString = (v: unknown): v is string => typeof v === 'string';

    function Citeste() {
      const [value] = usePersistentState<string>('medbuc.test', 'implicit', isString);
      return <span>{value}</span>;
    }

    render(<Citeste />);
    expect(screen.getByText('implicit')).toBeInTheDocument();
    expect(localStorage.getItem('medbuc.test')).toBeNull();
  });
});
