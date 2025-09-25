/**
 * Service Worker for TLDRWire
 * Provides offline caching and performance improvements
 */

const CACHE_NAME = 'tldrwire-v1.2.2';
const API_CACHE_NAME = 'tldrwire-api-v1.0.1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/sw.js',
  'https://cdn.jsdelivr.net/npm/marked@12/marked.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.1.7/dist/purify.min.js'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing...');
  
  // Cache assets one-by-one so a single failing fetch (eg. 401) doesn't
  // reject the whole install via addAll. This also allows skipping
  // non-HTTP(s) schemes and logging useful diagnostics.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    console.log('📁 Caching static assets');

    for (const asset of STATIC_ASSETS) {
      try {
        // Use Request so absolute and relative URLs are handled the same
        const req = new Request(asset, { credentials: 'same-origin' });
        const resp = await fetch(req);

        if (!resp || !resp.ok) {
          console.warn('⚠️ Skipping asset (fetch failed or non-OK):', asset, resp && resp.status);
          continue;
        }

        // Only cache http/https responses (avoid chrome-extension:// etc).
        try {
          const proto = new URL(resp.url).protocol;
          if (proto === 'http:' || proto === 'https:') {
            await cache.put(req, resp.clone());
            console.log('🗂️ Cached:', resp.url);
          } else {
            console.warn('⚠️ Skipping non-HTTP asset:', asset, resp.url);
          }
        } catch (err) {
          console.warn('⚠️ Skipping cache.put due to invalid URL or non-HTTP asset:', asset, err);
        }
      } catch (err) {
        console.warn('❌ Failed to fetch or cache asset, skipping:', asset, err);
      }
    }

    console.log('✅ Static assets caching complete (partial success allowed)');
    return self.skipWaiting();
  })());
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests
  // Always fetch fresh JS modules to avoid stale code
  if (url.origin === location.origin && url.pathname.startsWith('/js/')) {
    event.respondWith(fetch(request).catch(async () => {
      // Fallback to cache if offline and cached exists
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      throw new Error('JS fetch failed and no cache available');
    }));
  } else if (url.pathname === '/api/tldr') {
    // API requests - network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (url.pathname === '/api/healthz') {
    // Health check - always network
    event.respondWith(fetch(request));
  } else if (url.origin === location.origin && STATIC_ASSETS.some(asset => request.url.includes(asset))) {
    // Static assets (same-origin) - cache first
    event.respondWith(handleStaticAsset(request));
  } else if (url.origin === location.origin) {
    // Same origin requests - stale while revalidate
    event.respondWith(handleStaleWhileRevalidate(request));
  }
});

/**
 * Handle API requests with network-first strategy
 */
async function handleApiRequest(request) {
  const apiCache = await caches.open(API_CACHE_NAME);
  
  try {
    // Always try network first for fresh data
    const networkResponse = await fetch(request, {
      headers: {
        ...request.headers,
        'SW-Cache': 'network-first'
      }
    });
    
    // Cache successful responses
    if (networkResponse.ok) {
      apiCache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('🌐 Network failed, trying cache:', error.message);
    
    // Fallback to cache if network fails
    const cachedResponse = await apiCache.match(request);
    if (cachedResponse) {
      // Add header to indicate cache source
      const response = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...cachedResponse.headers,
          'SW-Cache-Source': 'fallback'
        }
      });
      return response;
    }
    
    // No cache available, throw error
    throw error;
  }
}

/**
 * Handle static assets with cache-first strategy
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fallback to network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Only cache http/https responses. Some requests in the page (eg. from
      // browser extensions) use chrome-extension:// and the Cache API
      // doesn't support that scheme which throws. Guard to avoid the error.
      try {
        const proto = new URL(request.url).protocol;
        if (proto === 'http:' || proto === 'https:') {
          await cache.put(request, networkResponse.clone());
        }
      } catch (err) {
        // If URL parsing fails or put throws, skip caching for this request.
        console.warn('Skipping cache.put for non-HTTP request or invalid URL', request.url, err);
      }
    }
    return networkResponse;
  } catch (error) {
    console.error('❌ Failed to fetch static asset:', request.url, error);
    throw error;
  }
}

/**
 * Handle other requests with stale-while-revalidate strategy
 */
async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  
  // Get cached response
  const cachedResponse = await cache.match(request);
  
  // Update cache in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      try {
        const proto = new URL(request.url).protocol;
        if (proto === 'http:' || proto === 'https:') {
          cache.put(request, response.clone());
        }
      } catch (err) {
        // ignore non-HTTP requests
      }
    }
    return response;
  }).catch(() => {
    // Ignore network errors for background updates
  });
  
  // Return cached response immediately, or wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Handle background sync for offline functionality
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

/**
 * Perform background synchronization
 */
async function doBackgroundSync() {
  try {
    // Could implement offline request queuing here
    console.log('📡 Performing background sync...');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

/**
 * Handle push notifications (for future use)
 */
self.addEventListener('push', (event) => {
  console.log('📬 Push notification received');
  
  const options = {
  body: 'New TLDRWire summary available!',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    actions: [
      {
        action: 'view',
        title: 'View Summary'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
  self.registration.showNotification('TLDRWire', options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

/**
 * Periodic background sync (if supported)
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'news-update') {
    event.waitUntil(updateNewsCache());
  }
});

/**
 * Update news cache in background
 */
async function updateNewsCache() {
  try {
    console.log('📰 Updating news cache...');
    // Could prefetch common news queries here
  } catch (error) {
    console.error('❌ News cache update failed:', error);
  }
}

/**
 * Cache management - clean up old API responses
 */
async function cleanupApiCache() {
  const apiCache = await caches.open(API_CACHE_NAME);
  const keys = await apiCache.keys();
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const request of keys) {
    const response = await apiCache.match(request);
    const dateHeader = response.headers.get('date');
    
    if (dateHeader) {
      const responseAge = now - new Date(dateHeader).getTime();
      if (responseAge > maxAge) {
        await apiCache.delete(request);
      }
    }
  }
}

// Cleanup old cache entries every hour
setInterval(cleanupApiCache, 60 * 60 * 1000);

console.log('🚀 Service Worker loaded successfully');