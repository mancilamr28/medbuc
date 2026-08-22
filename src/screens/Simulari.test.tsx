import { render, screen, waitFor } from '@testing-library/react';
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

  /**
   * Panoul de rezultat al simulării se termina cu „Simulare nouă": singurul
   * drum înainte era încă un examen. Greșelile din lucrare ajung acum în coada
   * de recapitulare (PR #49), deci rezultatul poate în sfârșit să trimită acolo.
   */
  it('duce de la lucrarea predată la recapitulare și la progres', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: /Începe simularea/ }));

    // Grila de pe ecran e aleasă de bancă, nu de test: îi găsim varianta
    // greșită după textul afișat, ca lucrarea să aibă exact o greșeală.
    const q = QUESTIONS.find((intrebare) => screen.queryByText(intrebare.text) !== null)!;
    const gresita = q.opts.find(([k]) => k !== q.correct)![1];
    await userEvent.click(screen.getByRole('radio', { name: new RegExp(gresita.slice(0, 24), 'i') }));

    await userEvent.click(screen.getByRole('button', { name: 'Predă lucrarea' }));
    await userEvent.click(screen.getByRole('button', { name: 'Da, predau' }));

    expect(screen.getByText('1 grilă greșită intră în coada de recapitulare.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Revezi greșelile/ }));
    expect(window.location.hash).toBe('#/recapitulare');

    await userEvent.click(screen.getByRole('button', { name: /Vezi progresul/ }));
    expect(window.location.hash).toBe('#/statistici');
  });

  it('nu trimite la recapitulare o lucrare fără nicio greșeală', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button', { name: /Începe simularea/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Predă lucrarea' }));
    await userEvent.click(screen.getByRole('button', { name: 'Da, predau' }));

    // Toate grilele au rămas fără răspuns: nu există greșeli în jurnal, deci
    // nici ce recapitula.
    expect(screen.queryByRole('button', { name: /Revezi greșelile/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vezi progresul/ })).toBeInTheDocument();
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

  /**
   * `SimRun.id` a apărut odată cu sincronizarea lucrărilor. O lucrare începută
   * înainte n-are câmpul, iar dacă validatorul l-ar fi cerut, examenul în curs
   * ar fi fost aruncat la prima reîncărcare — pierdut, cu cronometrul pornit.
   * E acceptată fără id și completată la montare.
   */
  it('păstrează o lucrare în curs salvată înainte să existe `id`, și îi dă unul', async () => {
    const acum = Date.now();
    localStorage.setItem(
      'medbuc.sim.run',
      JSON.stringify({
        startedAt: acum - 60_000,
        endsAt: acum + 3_600_000,
        finishedAt: null,
        config: { model: 'UMFCD · Medicină', nr: '100', durata: '180 minute', ordine: 'Amestecate' },
        order: [QUESTIONS[0]!.id, QUESTIONS[1]!.id],
        qi: 0,
        answers: {},
        marks: {},
      }),
    );

    deschide();

    // Lucrarea e în continuare deschisă, nu s-a revenit la configurare.
    expect(screen.queryByRole('button', { name: /Începe simularea/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Predă lucrarea' })).toBeInTheDocument();

    await waitFor(() => expect(lucrareaSalvata()?.id).toEqual(expect.any(String)));
    expect(lucrareaSalvata().order).toEqual([QUESTIONS[0]!.id, QUESTIONS[1]!.id]);
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
