import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../danish_numbers_learner';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Service Worker selbst registrieren statt über das Plugin.
// updateViaCache: 'none' umgeht den 10-Minuten-HTTP-Cache von GitHub Pages.
// Ohne das liefert nach einem Deploy der alte SW weiter seine alte index.html
// aus, deren gehashte Bundles es nicht mehr gibt — die Seite bleibt weiß.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none',
      })
      .then((reg) => {
        // Beim Zurückkehren in den Tab auf eine neue Version prüfen
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update();
        });
      })
      .catch(() => {});
  });
}
