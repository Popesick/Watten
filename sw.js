// Service Worker für die Watten-PWA.
//
// Strategie: "Network-first, Cache als Fallback" für alles im Scope. Das
// Projekt wird noch aktiv weiterentwickelt (häufige Deploys) - ein
// Cache-first-Ansatz würde Spielern leicht veraltete Spiellogik ausliefern.
// Network-first bedeutet: online gibt's immer die aktuelle Version, offline
// (oder bei Netzwerkfehler) springt der zuletzt gecachte Stand ein.

const CACHE_NAME = 'watten-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/main.js',
  './js/engine.js',
  './js/ui.js',
  './js/ai.js',
  './js/players.js',
  './js/rules.js',
  './js/cards.js',
  './js/chat.js',
  './js/variants.js',
  './js/audio.js',
  './js/install.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // externe Requests (keine bei uns) ignorieren

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
