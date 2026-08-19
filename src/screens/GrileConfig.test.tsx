import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { AppProvider } from '../state/AppState';
import { Grile } from './Grile';

vi.mock('../lib/supabase', () => import('../test/supabaseFals'));

vi.mock('../state/progressState', () => ({
  useProgressOptional: () => undefined,
}));

const deschide = () => render(<AppProvider questions={QUESTIONS}><Grile /></AppProvider>);

const buton = (name: RegExp | string) => screen.getByRole('button', { name });

describe('configurarea sesiunii', () => {
  it('e prima faza a ecranului de grile, cu Biologie și toată materia implicit', () => {
    deschide();

    expect(screen.getByText('Sesiune nouă')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Biologie' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('tab', { name: 'Toată materia' })).toHaveAttribute('aria-selected', 'true');
    // 4 din cele 6 grile ale fixturii țin de Biologie.
    expect(screen.getByText('4 grile găsite')).toBeInTheDocument();
  });

  it('numără din nou grilele când se schimbă materia', async () => {
    const user = userEvent.setup();
    deschide();

    await user.click(screen.getByRole('button', { name: 'Chimie organică' }));
    expect(screen.getByText('2 grile găsite')).toBeInTheDocument();
  });

  it('restrânge la capitolele bifate și dezactivează pornirea până alegi unul', async () => {
    const user = userEvent.setup();
    deschide();

    await user.click(screen.getByRole('tab', { name: 'Capitole anume' }));
    expect(buton('Începe sesiunea →')).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /Sistemul nervos/ }));
    expect(screen.getByText('1 grilă găsită')).toBeInTheDocument();
    expect(buton('Începe sesiunea →')).not.toBeDisabled();
  });

  it('dezactivează un capitol fără nicio grilă scrisă', async () => {
    const user = userEvent.setup();
    deschide();

    await user.click(screen.getByRole('tab', { name: 'Capitole anume' }));
    expect(screen.getByRole('button', { name: /Analizatorii/ })).toBeDisabled();
  });

  it('arată o stare goală pentru puncte slabe fără istoric', async () => {
    const user = userEvent.setup();
    deschide();

    await user.click(screen.getByRole('tab', { name: 'Puncte slabe' }));
    expect(screen.getByText(/Nu ai încă niciun capitol cu răspunsuri greșite/)).toBeInTheDocument();
    expect(screen.getByText('0 grile găsite')).toBeInTheDocument();
    expect(buton('Începe sesiunea →')).toBeDisabled();
  });

  it('pornește sesiunea cu scopul și sursa alese și trece la rezolvare', async () => {
    const user = userEvent.setup();
    deschide();

    await user.click(screen.getByRole('tab', { name: 'Subiecte oficiale' }));
    expect(screen.getByText('0 grile găsite')).toBeInTheDocument();
    expect(buton('Începe sesiunea →')).toBeDisabled();

    await user.click(screen.getByRole('tab', { name: 'Toate' }));
    await user.click(buton('Începe sesiunea →'));

    expect(screen.getByText('Grila 1 din 4')).toBeInTheDocument();
  });
});
