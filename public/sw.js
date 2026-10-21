self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installato');
});

self.addEventListener('fetch', (e) => {
  // Questo comando vuoto è obbligatorio per sbloccare l'installazione PWA
});
