import { describe, expect, it } from 'vitest';
import { mesajEroare } from './authErrors';

/**
 * Mesajele de la Supabase vin în engleză și nu au un cod stabil în `message`, deci
 * traducerea se face după text. Testele de aici țin șirurile reale, așa cum au fost
 * văzute pe proiect, nu cum ni le amintim.
 */
describe('mesajEroare', () => {
  it('traduce parola greșită', () => {
    expect(mesajEroare(new Error('Invalid login credentials'))).toBe('Email sau parolă greșită.');
  });

  it('traduce contul existent', () => {
    expect(mesajEroare(new Error('User already registered'))).toBe(
      'Există deja un cont cu acest email.',
    );
  });

  it('traduce emailul neconfirmat', () => {
    expect(mesajEroare(new Error('Email not confirmed'))).toContain('Confirmă');
  });

  /**
   * Cazul care a blocat primul cont real de pe site: cota de emailuri a proiectului,
   * nu ceva ce a greșit utilizatorul. Mesajul trebuie să spună „o oră" — cât timp
   * spunea doar „mai așteaptă puțin", reîncercarea la câteva secunde părea
   * rezonabilă și eșua de fiecare dată.
   */
  it('spune cât se așteaptă când s-a atins cota de emailuri', () => {
    const m = mesajEroare(new Error('email rate limit exceeded'));
    expect(m).toContain('o oră');
    expect(m).not.toContain('puțin');
  });

  it('recunoaște și codul, nu doar textul', () => {
    expect(mesajEroare(new Error('over_email_send_rate_limit'))).toContain('o oră');
  });

  /** Cealaltă limitare, complet diferită: secunde, nu ore. Se confundau. */
  it('dă secundele exacte la două cereri prea apropiate', () => {
    const m = mesajEroare(
      new Error('For security purposes, you can only request this after 41 seconds.'),
    );
    expect(m).toContain('41 de secunde');
    expect(m).not.toContain('o oră');
  });

  /** `numar()` din `lib/text`: „o secundă" nu primește „de", 41 primesc. */
  it('acordă numeralul', () => {
    expect(
      mesajEroare(new Error('For security purposes, you can only request this after 9 seconds.')),
    ).toContain('9 secunde');
  });

  it('nu lasă textul brut al Supabase să ajungă pe ecran', () => {
    expect(mesajEroare(new Error('some brand new upstream failure'))).toBe(
      'A apărut o eroare. Încearcă din nou.',
    );
  });

  it('suportă și ce nu e Error', () => {
    expect(mesajEroare('Invalid login credentials')).toBe('Email sau parolă greșită.');
  });
});
