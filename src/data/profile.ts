/**
 * Datele contului și ale examenului.
 *
 * Aici stăteau până acum și statisticile elevului — streak de 22 de zile, „1 407
 * grile rezolvate", punctaj estimat, grafic de evoluție, istoric de simulări.
 * Niciuna nu era calculată din ceva: erau literale scrise de mână, care nu se
 * schimbau oricâte grile ai fi rezolvat. Au fost scoase. Se întorc când există
 * `attempts` din care să fie calculate; până atunci ecranele arată stări goale.
 *
 * Ce a rămas e configurație: data examenului, punctajul țintă. Identitatea
 * contului (nume, email, rol) vine acum din `profiles`, prin `useAuth()` —
 * vezi `src/state/AuthContext.tsx` — nu mai are ce sta aici ca literal.
 */

/** Sesiunea de admitere pentru care se pregătește contul. */
export const EXAM_DATE = new Date(2027, 6, 25); // 25 iulie 2027
export const EXAM_DATE_LABEL = '25 iulie 2027';
export const EXAM_DATE_SHORT = '25 iul 2027';

export const EXAMEN_ROWS: { label: string; value: string }[] = [
  { label: 'Facultate', value: 'UMFCD „Carol Davila”, București' },
  { label: 'Specializare', value: 'Medicină generală' },
  { label: 'Sesiunea', value: EXAM_DATE_LABEL },
  { label: 'Probe', value: 'Biologie · Chimie organică' },
  { label: 'Punctaj țintă', value: '85 din 100' },
];

/** Obiectivul ales de elev, nu o măsurătoare — de aceea a rămas. */
export const SCORE_TARGET = 85;
