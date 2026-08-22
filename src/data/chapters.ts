/**
 * Identitatea unei materii.
 *
 * A fost `'bio' | 'chim'` — o uniune compilată peste o listă scrisă de mână. Baza
 * a căpătat între timp o a treia materie (`ant`, „Subiecte anterioare") cu 8
 * capitole, iar uniunea n-avea cum s-o numească: grilele ei nu se puteau atribui
 * niciunei materii, iar capitolele ei se afișau cu id-ul brut. Un `string` nu e
 * o slăbire a tipului din lene — e recunoașterea că lista trăiește în bază, unde
 * un administrator o poate schimba fără build.
 */
export type MaterieId = string;

/**
 * Identitatea unui capitol, la fel ca `QuestionId` pentru grile.
 *
 * `nr` nu poate ține locul unui id — nu e garantat unic în afara materiei lui.
 * Nici eticheta nu poate — pe ea se sprijineau cheile notițelor
 * (`medbuc.note.03. Sistemul nervos`), așa că o simplă corectare de titlu
 * orfaniza notița elevului.
 */
export type ChapterId = string;

export interface Chapter {
  id: ChapterId;
  materie: MaterieId;
  /** Numărul capitolului, ex. "04". */
  nr: string;
  name: string;
}

export interface Materie {
  id: MaterieId;
  name: string;
  list: Chapter[];
}

/** Eticheta completă a unui capitol, ex. „03. Sistemul nervos”. */
export const chapterLabel = (c: Chapter): string => `${c.nr}. ${c.name}`;
