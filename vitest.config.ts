import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Două feluri de teste, separate după extensie ca să nu se încetinească unele
 * pe altele:
 *
 * - `*.test.ts`  — funcții pure, fără DOM. Rulează în `node`, în milisecunde.
 * - `*.test.tsx` — componente randate cu Testing Library, în `jsdom`.
 *
 * Regula „doar funcții pure" a ținut cât timp singura logică riscantă era
 * scorul. Bug-ul care a suprascris notița de capitol a fost însă pierdere de
 * date și trăia în interacțiunea dintre hook și componentă — genul de defect pe
 * care niciun test de funcție pură nu-l putea prinde.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          include: ['src/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
});
