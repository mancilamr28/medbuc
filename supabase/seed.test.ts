import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `seed.sql` e generat din `src/data/`. Dacă cineva adaugă o grilă și uită
 * `npm run seed`, fișierul rămâne în urmă tăcut — iar baza ar primi o
 * bibliotecă mai veche decât aplicația. Testul regenerează și compară.
 */
describe('seed.sql', () => {
  it('e la zi față de datele din aplicație', () => {
    const salvat = readFileSync('supabase/seed.sql', 'utf8');
    execFileSync('node', ['scripts/genereaza-seed.mjs'], { stdio: 'pipe' });
    const regenerat = readFileSync('supabase/seed.sql', 'utf8');

    expect(regenerat).toBe(salvat);
  });

  it('nu e editat de mână', () => {
    expect(readFileSync('supabase/seed.sql', 'utf8')).toMatch(/^-- GENERAT DE/);
  });
});
