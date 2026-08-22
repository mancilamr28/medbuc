import type { ChapterId } from '../data/chapters';
import type { NotitaBaza } from './notite';
import { supabase } from './supabase';

/**
 * Notițele pe cont.
 *
 * Tabela `notes` exista de la prima migrație, dar nimic nu scria în ea: tot ce
 * scria elevul stătea în `localStorage`, pe un singur dispozitiv, și lipsea și
 * din exportul GDPR. E singurul lucru din aplicație pe care nu-l poate reface
 * nimeni dacă se pierde — răspunsurile se pot da din nou, textul scris de mână
 * nu.
 *
 * Cheia primară e `(user_id, chapter_id)`, deci scrierea e un `upsert` pe
 * pereche și rămâne idempotentă la reîncercări.
 */

/** Toate notițele contului. RLS le limitează oricum la ale lui. */
export async function citesteNotite(): Promise<NotitaBaza[]> {
  const { data, error } = await supabase.from('notes').select('chapter_id,body,updated_at');
  if (error) throw error;
  return (data ?? []) as NotitaBaza[];
}

export async function salveazaNotita(userId: string, capId: ChapterId, body: string): Promise<void> {
  const { error } = await supabase
    .from('notes')
    .upsert({ user_id: userId, chapter_id: capId, body }, { onConflict: 'user_id,chapter_id' });
  if (error) throw error;
}

/**
 * Șterge notița de pe cont.
 *
 * Ștergerea e explicită, nu un `body` gol: altfel o notiță ștearsă pe telefon
 * ar rămâne pe laptop și s-ar întoarce la prima sincronizare de acolo.
 */
export async function stergeNotitaDinBaza(capId: ChapterId): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('chapter_id', capId);
  if (error) throw error;
}

/** Notița unui singur capitol, sau `null` dacă nu s-a scris niciuna. */
export async function citesteNotita(capId: ChapterId): Promise<NotitaBaza | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('chapter_id,body,updated_at')
    .eq('chapter_id', capId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as NotitaBaza | null;
}
