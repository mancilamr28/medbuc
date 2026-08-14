import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/medbuc/',
  // Portul fix rămâne implicit, dar poate fi mutat cu `PORT`: două sesiuni de
  // lucru pe același proiect nu se mai bat pe 5173.
  server: { port: Number(process.env.PORT) || 5173 },
});
