import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Die App liegt unter https://lukaszimmerli.github.io/number-game/,
  // nicht auf der Domain-Wurzel — ohne base zeigen alle Asset-Pfade ins Leere.
  base: '/number-game/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Dänische Zahlen lernen',
        short_name: 'Dansk Tal',
        description: 'Dänische Zahlen hören, tippen und spielen.',
        lang: 'de',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8fafc',
        theme_color: '#dc2626',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Launcher/Tablet-Icons werden bis zu 10% pro Kante weggeschnitten.
          // Diese Variante zeichnet das Kreuz deshalb in der inneren 80%-Safe-Zone,
          // sonst rutscht der Dannebrog-Balken nach dem Zuschnitt sichtbar zu weit
          // nach links. Arme laufen weiter randlos aus, damit kein Rand entsteht.
          { src: 'pwa-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App-Shell offline verfügbar machen
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
});
