import type { CerereTest } from './lucrari';

export type ModSelectieTest = 'fix' | 'dupa_regula';
export type NivelAcces = 'liber' | 'premium';

export interface TestPredefinitPublic {
  id: string;
  centru_id: string;
  colectie_id: string | null;
  nume: string;
  descriere: string;
  mod_selectie: ModSelectieTest;
  nr_grile: number;
  durata_minute: number | null;
  acces: NivelAcces;
  disponibil: boolean;
}

export interface TestPredefinitAdmin extends Omit<TestPredefinitPublic, 'disponibil'> {
  regula: Omit<CerereTest, 'mod' | 'test_id'>;
  publicat: boolean;
  position: number;
  grile: string[];
}

export interface TestPredefinitDeSalvat {
  id: string;
  centru_id: string;
  colectie_id?: string | null;
  nume: string;
  descriere?: string;
  mod_selectie: ModSelectieTest;
  regula?: Omit<CerereTest, 'mod' | 'test_id'>;
  grile?: string[];
  durata_minute?: number | null;
  acces: NivelAcces;
  publicat: boolean;
  position?: number;
}

const rpc = async <T>(nume: string, args: Record<string, unknown>): Promise<T> => {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase.rpc(nume, args);
  if (error) throw new Error(error.message);
  return data as T;
};

/** Metadatele publicate pe care le poate alege elevul; fără lista fixă de grile. */
export const listaTestePredefinite = () =>
  rpc<TestPredefinitPublic[]>('lista_teste_predefinite', {});

/** Inventarul complet folosit de constructorul din Administrare. */
export const citesteTestePredefiniteAdmin = () =>
  rpc<TestPredefinitAdmin[]>('citeste_teste_predefinite_admin', {});

/** Creează sau înlocuiește atomic definiția unui test. */
export const salveazaTestPredefinit = (payload: TestPredefinitDeSalvat) =>
  rpc<string>('salveaza_test_predefinit', { payload });
