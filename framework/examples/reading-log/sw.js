/**
 * Service Worker for Reading Log - Full Offline Support
 */

const CACHE_NAME = 'reading-log-v9';
const APP_SHELL = [
  './',
  './index.html',
  './app.js'
];

// Framework files - cached separately to handle potential path issues
const FRAMEWORK_FILES = [
  '../../core/Storage.js',
  '../../core/State.js',
  '../../core/GitHubSync.js',
  '../../core/App.js',
  '../../core/ui/Toast.js',
  '../../core/ui/Modal.js'
];

const CDN_URLS = [
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Reading Log service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache app shell (critical)
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
          console.log('[SW] Cached:', url);
        } catch (e) {
          console.warn('[SW] Failed to cache:', url, e);
        }
      }
      
      // Cache framework files (best effort)
      for (const url of FRAMEWORK_FILES) {
        try {
          await cache.add(url);
          console.log('[SW] Cached:', url);
        } catch (e) {
          console.warn('[SW] Failed to cache framework file:', url);
        }
      }
      
      // Cache CDNs (best effort)
      for (const url of CDN_URLS) {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) {
            await cache.put(url, response);
            console.log('[SW] Cached CDN:', url);
          }
        } catch (e) {
          console.warn('[SW] CDN not cached (will work when online):', url);
        }
      }
      
      console.log('[SW] Installation complete');
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => {
        console.log('[SW] Deleting old cache:', n);
        return caches.delete(n);
      }))
    ).then(() => {
      console.log('[SW] Now controlling all clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Network-only for external APIs
  if (url.hostname === 'api.github.com' || 
      url.hostname === 'openlibrary.org' || 
      url.hostname === 'covers.openlibrary.org') {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }
  
  // Cache-first strategy for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        console.log('[SW] Serving from cache:', event.request.url);
        return cached;
      }
      
      console.log('[SW] Fetching:', event.request.url);
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          console.log('[SW] Offline - serving cached index.html');
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
