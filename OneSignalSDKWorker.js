// OneSignal SDK — push notifications
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

// === Magic Analysis: offline support ===
// Caches index.html on every successful page load.
// When user goes offline, serves the cached page so the React app loads
// and shows our friendly "Please check your internet connection" message
// instead of iOS Safari's ugly "save as document.txt" prompt.
const CACHE_NAME = 'magic-shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(['/', '/index.html']).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    Promise.all([
      // Clear old caches
      caches.keys().then((names) =>
        Promise.all(
          names
            .filter((n) => n !== CACHE_NAME && n.startsWith('magic-shell'))
            .map((n) => caches.delete(n))
        )
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle requests to our own domain
  if (url.origin !== self.location.origin) return;
  // Leave OneSignal's own files alone
  if (url.pathname.includes('OneSignal')) return;

  // Network-first, cache-fallback strategy for page loads
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // Cache the fresh HTML for offline use later
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone)).catch(() => {});
          return res;
        })
        .catch(() =>
          // Network failed → serve cached index.html
          caches.match('/index.html').then((cached) => cached || caches.match('/'))
        )
    );
  }
});
