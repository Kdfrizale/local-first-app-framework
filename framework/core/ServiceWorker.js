/**
 * Service Worker Factory for Local-First Apps
 * 
 * Usage: Import and call createServiceWorker with your app config
 * This file provides the template - each app creates its own sw.js
 */

// Service worker template (copy this to your app's sw.js and customize)
const SW_TEMPLATE = `
const CACHE_NAME = 'APP_NAME-v1';
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  // Framework core
  '../../core/Storage.js',
  '../../core/State.js',
  '../../core/GitHubSync.js',
  '../../core/App.js',
  '../../core/ui/Toast.js',
  '../../core/ui/Modal.js'
];

// External CDNs (will be cached on first load)
const CDN_URLS = [
  'https://cdn.tailwindcss.com'
];

// Install - cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache local files
      try {
        await cache.addAll(APP_SHELL);
        console.log('[SW] App shell cached');
      } catch (e) {
        console.error('[SW] Failed to cache app shell:', e);
      }
      
      // Try to cache CDNs (non-blocking)
      for (const url of CDN_URLS) {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (e) {
          console.log('[SW] CDN not cached (will work online):', url);
        }
      }
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - cache-first for app shell, network-first for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET
  if (event.request.method !== 'GET') return;
  
  // Network-only for GitHub API (sync should always try network)
  if (url.hostname === 'api.github.com') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }
  
  // Network-only for Open Library API
  if (url.hostname === 'openlibrary.org' || url.hostname === 'covers.openlibrary.org') {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  
  // Cache-first for everything else (app shell, CDNs)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      
      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
`;

// Export for reference
if (typeof module !== 'undefined') {
  module.exports = { SW_TEMPLATE };
}
