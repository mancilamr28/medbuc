import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { PrevizualizareGrila } from './PrevizualizareGrila';

const citeste = vi.fn();
vi.mock('../lib/continut', () => ({ citesteGrilaAdmin: (id: string) => citeste(id) }));
beforeEach(() => { citeste.mockReset(); });

it('citește la deschidere și arată opțiunile și explicația fără editare', async () => {
  const user = userEvent.setup();
  citeste.mockResolvedValue({ ...QUESTIONS[0], status: 'publicata' });
  render(<PrevizualizareGrila id="grila-test" />);
  expect(citeste).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Previzualizează' }));
  expect(await screen.findByText(QUESTIONS[0]!.expl)).toBeInTheDocument();
  expect(screen.getByText('Răspuns corect')).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Închide previzualizarea' }));
  expect(screen.queryByText(QUESTIONS[0]!.expl)).not.toBeInTheDocument();
});

it('permite reîncercarea dacă citirea eșuează', async () => {
  const user = userEvent.setup();
  citeste.mockRejectedValueOnce(new Error('indisponibil')).mockResolvedValue({ ...QUESTIONS[0], status: 'publicata' });
  render(<PrevizualizareGrila id="grila-test" />);
  await user.click(screen.getByRole('button', { name: 'Previzualizează' }));
  await user.click(await screen.findByRole('button', { name: 'Reîncearcă previzualizarea' }));
  expect(await screen.findByText(QUESTIONS[0]!.expl)).toBeInTheDocument();
});

it('afișează afirmațiile complementului grupat în ordinea lor', async () => {
  const user = userEvent.setup();
  const grupata = QUESTIONS.find((g) => g.tip === 'grupat')!;
  citeste.mockResolvedValue({ ...grupata, status: 'publicata' });
  render(<PrevizualizareGrila id={grupata.id} />);
  await user.click(screen.getByRole('button', { name: 'Previzualizează' }));
  expect(await screen.findByText(grupata.enunturi![0]!)).toBeInTheDocument();
  const afirmatii = screen.getAllByRole('list')[0]!;
  expect(afirmatii.textContent).toBe(grupata.enunturi!.join(''));
});
