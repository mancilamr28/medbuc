import { describe, expect, it } from 'vitest';
import { valideazaParolaNoua } from './valideazaParola';

describe('valideazaParolaNoua', () => {
  it('trece o schimbare în regulă', () => {
    expect(valideazaParolaNoua('veche1', 'noua12345', 'noua12345')).toBeNull();
  });

  it('cere parola actuală înaintea oricărei cereri', () => {
    expect(valideazaParolaNoua('', 'noua12345', 'noua12345')).toBe('Scrie parola actuală.');
  });

  it('spune lungimea minimă cu acordul făcut', () => {
    expect(valideazaParolaNoua('veche1', 'abc', 'abc')).toBe(
      'Parola nouă trebuie să aibă cel puțin 6 caractere.',
    );
  });

  it('refuză aceeași parolă', () => {
    expect(valideazaParolaNoua('aceeasi1', 'aceeasi1', 'aceeasi1')).toBe(
      'Parola nouă e aceeași cu cea de acum.',
    );
  });

  it('refuză o confirmare care nu se potrivește', () => {
    expect(valideazaParolaNoua('veche1', 'noua12345', 'noua1234')).toBe(
      'Confirmarea nu se potrivește cu parola nouă.',
    );
  });
});
