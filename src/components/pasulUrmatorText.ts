import { numar } from '../lib/text';

/**
 * Frazele cardului „Ce urmează", scoase din JSX ca să poată fi verificate la 1,
 * 2 și 20 — motivul din `CLAUDE.md`: un acord scris direct în JSX a scăpat de
 * cinci ori, mereu cu un cuvânt rămas la plural lângă un numeral de unu.
 */

/** Ce se întâmplă cu grilele ratate acum, spus la numărul lor. */
export const frazaGreseliInCoada = (gresite: number): string =>
  `${numar(gresite, 'grilă greșită', 'grile greșite')} intră în coada de recapitulare.`;
