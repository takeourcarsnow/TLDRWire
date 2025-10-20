/* Simple service worker for TLDRWire
   - Caches a small set of static assets on install
   - Serves cached responses when available (cache-first)
   - Falls back to network when not cached
   This is intentionally minimal and safe for local testing on localhost.
*/
const CACHE_NAME = 'tldrwire-static-v1';
const ASSETS = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Optionally cache same-origin GET requests
          try {
            const cloned = response.clone();
            if (event.request.url.startsWith(self.location.origin)) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
            }
          } catch (e) {
            // ignore caching errors
          }
          return response;
        })
        .catch(() => {
          // No network and not cached: for navigation requests, try to return cached '/'
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
