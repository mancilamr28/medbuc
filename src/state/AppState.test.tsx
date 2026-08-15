import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { AppProvider } from './AppState';
import { useApp } from './appContextValue';

function ComutatorTema() {
  const { theme, toggleTheme } = useApp();
  return (
    <button type="button" onClick={toggleTheme}>
      {theme}
    </button>
  );
}

const deschide = () =>
  render(
    <AppProvider questions={QUESTIONS}>
      <ComutatorTema />
    </AppProvider>,
  );

/**
 * Tema are doi scriitori care trebuie să rămână de acord: scriptul din
 * `index.html`, care vopsește pagina înainte de primul render, și `toggleTheme`.
 * Bug-ul de dinainte: hook-ul salva `"dark"` cu ghilimele (JSON), iar scriptul
 * compara cu `dark` fără ele — deci pagina se încărca mereu în alb, iar primul
 * clic pe buton părea să nu facă nimic.
 */
describe('tema', () => {
  it('scrie și în DOM, și în localStorage', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button'));

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('medbuc.theme')).toBe('"dark"');
  });

  it('se întoarce la temă luminoasă la al doilea clic', async () => {
    deschide();
    await userEvent.click(screen.getByRole('button'));
    await userEvent.click(screen.getByRole('button'));

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('medbuc.theme')).toBe('"light"');
  });

  it('pornește din tema pe care scriptul a pus-o deja pe document', () => {
    document.documentElement.dataset.theme = 'dark';
    deschide();

    expect(screen.getByRole('button')).toHaveTextContent('dark');
  });

  /**
   * Contractul dintre cei doi scriitori: valoarea salvată e JSON. Dacă scriptul
   * din `index.html` nu o mai parsează ca atare, tema salvată e ignorată tăcut.
   */
  it('scriptul de dinainte de primul render parsează valoarea ca JSON', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toMatch(/JSON\.parse/);
  });
});
