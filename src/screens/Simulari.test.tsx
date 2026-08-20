import { render, screen } from '@testing-library/react';
import { QUESTIONS } from '../data/questions';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Simulari } from './Simulari';
import { AppProvider } from '../state/AppState';

vi.mock('../lib/supabase', () => import('../test/supabaseFals'));

/** Ceasul simulării merge doar cât timp ecranul e deschis, deci fixăm ruta. */
beforeEach(() => {
  window.location.hash = '#/simulari';
});

const deschide = () =>
  render(
    <AppProvider questions={QUESTIONS}>
      <Simulari />
    </AppProvider>,
  );

const lucrareaSalvata = () => {
  const raw = localStorage.getItem('medbuc.sim.run');
  return raw === null ? null : JSON.parse(raw);
};

/**
 * Regresia din spatele acestor teste: `finish()` era `setRun(null)`. După 180 de
 * minute, o apăsare pe „Predă lucrarea" ștergea răspunsurile, ordinea și ora de
 * început, și te întorcea la formularul de configurare — fără scor și fără
 * explicații, exact contrariul a ce promitea ecranul.
 */
describe('predarea lucrării', () => {
  it('nu predă din prima apăsare, ci cere confirmare', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: /Începe simularea/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Predă lucrarea' }));

    expect(screen.getByRole('button', { name: 'Da, predau' })).toBeInTheDocument();
    // Încă în lucrare: cronometrul e pe ecran, rezultatul nu.
    expect(screen.queryByRole('button', { name: /Începe simularea/ })).not.toBeInTheDocument();
  });

  it('spune câte grile rămân fără răspuns înainte de a preda', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: /Începe simularea/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Predă lucrarea' }));

    // Aserțiunea de dinainte era `/fără răspuns/`, care trecea peste orice
    // număr și orice acord. Fraza se cere întreagă. Cazul greu — 2..19, unde
    // vechiul cod scria „5 de grile" — nu se poate atinge de aici, fiindcă cea
    // mai mică simulare are 60 de grile; el e acoperit de testele lui `numar`.
    expect(screen.getByText('Mai ai 100 de grile fără răspuns. Predai?')).toBeInTheDocument();
  });

  it('renunțarea la confirmare lasă lucrarea în desfășurare', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: /Începe simularea/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Predă lucrarea' }));
    await userEvent.click(screen.getByRole('button', { name: 'Nu încă' }));

    expect(screen.getByRole('button', { name: 'Predă lucrarea' })).toBeInTheDocument();
    expect(lucrareaSalvata()?.finishedAt).toBeNull();
  });

  it('păstrează lucrarea după predare, cu răspunsurile date', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: /Începe simularea/ }));

    const inainte = lucrareaSalvata();
    expect(inainte.order.length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Predă lucrarea' }));
    await userEvent.click(screen.getByRole('button', { name: 'Da, predau' }));

    const dupa = lucrareaSalvata();
    expect(dupa).not.toBeNull();
    expect(dupa.order).toEqual(inainte.order);
    expect(dupa.startedAt).toBe(inainte.startedAt);
    expect(dupa.finishedAt).toBeTypeOf('number');
  });

  it('arată rezultatul, nu formularul de configurare', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: /Începe simularea/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Predă lucrarea' }));
    await userEvent.click(screen.getByRole('button', { name: 'Da, predau' }));

    expect(screen.queryByRole('button', { name: /Începe simularea/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Lucrare predată|Rezultatul/i)).toBeInTheDocument();
  });

  it('rezultatul supraviețuiește reîncărcării paginii', async () => {
    const { unmount } = deschide();
    await userEvent.click(screen.getByRole('button', { name: /Începe simularea/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Predă lucrarea' }));
    await userEvent.click(screen.getByRole('button', { name: 'Da, predau' }));
    unmount();

    // A doua montare citește din localStorage, ca după un refresh.
    deschide();
    expect(screen.queryByRole('button', { name: /Începe simularea/ })).not.toBeInTheDocument();
  });

  it('o lucrare salvată dintr-o versiune veche e respinsă, nu duce la ecran alb', () => {
    // `order` cu poziții numerice e forma dinainte de id-urile de grilă.
    localStorage.setItem(
      'medbuc.sim.run',
      JSON.stringify({
        startedAt: Date.now(),
        endsAt: Date.now() + 60_000,
        finishedAt: null,
        config: { model: 'UMFCD · Medicină', nr: '100', durata: '180 minute', ordine: 'Amestecate' },
        order: [0, 1, 2],
        qi: 0,
        answers: {},
        marks: {},
      }),
    );

    deschide();
    expect(screen.getByRole('button', { name: /Începe simularea/ })).toBeInTheDocument();
    expect(localStorage.getItem('medbuc.sim.run')).toBeNull();
  });
});
