import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Die App liegt unter https://lukaszimmerli.github.io/number-game/,
  // nicht auf der Domain-Wurzel — ohne base zeigen alle Asset-Pfade ins Leere.
  base: '/number-game/',
  plugins: [react(), tailwindcss()],
});
