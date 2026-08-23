import { construiesteTipuri, type RandTip, type TipuriGrile } from '../lib/tipuriGrile';

/**
 * Tipurile de grilă cu care pornește un proiect — **nu** adevărul de la runtime.
 *
 * Aplicația le citește din `question_types`. Fișierul ăsta e fixtura testelor
 * pure: acolo unde o funcție cere acum `TipuriGrile`, testul îi dă asta în loc
 * să inventeze un tip.
 *
 * Rândurile de aici oglindesc inserarea din migrarea `0010_tipuri_de_grile.sql`.
 * Fiind două locuri, pot diverge — de aceea `schema.test.ts` compară fixtura cu
 * ce a intrat efectiv în bază după rularea migrărilor. Dacă se schimbă una fără
 * cealaltă, pică acolo, nu într-un ecran.
 */
export const TIPURI_SEED_RANDURI: RandTip[] = [
  {
    id: 'simplu',
    nume: 'Complement simplu',
    descriere: 'Cinci variante, un singur răspuns corect.',
    sablon_optiuni: null,
    nr_optiuni_min: 2,
    nr_optiuni_max: 5,
    permite_amestecare: true,
    cere_enunturi: false,
    nr_enunturi: null,
    hint_randare: 'lista',
    position: 0,
  },
  {
    id: 'grupat',
    nume: 'Complement grupat',
    descriere: 'Patru afirmații numerotate; varianta corectă e combinația lor.',
    sablon_optiuni: ['1, 2, 3', '1, 3', '2, 4', 'doar 4', 'toate'],
    nr_optiuni_min: 5,
    nr_optiuni_max: 5,
    permite_amestecare: false,
    cere_enunturi: true,
    nr_enunturi: 4,
    hint_randare: 'enunturi_numerotate',
    position: 1,
  },
];

export const TIPURI_SEED: TipuriGrile = construiesteTipuri(TIPURI_SEED_RANDURI);
