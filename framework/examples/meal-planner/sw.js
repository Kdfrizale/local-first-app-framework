/**
 * Service Worker for full offline functionality
 */

const CACHE_NAME = 'meal-planner-v2';

// All files needed for offline operation
const URLS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  // Framework core
  '../../core/github-sync.js',
  '../../core/local-storage.js',
  '../../core/sync-controller.js',
  '../../core/router.js',
  '../../core/state.js',
  '../../core/components/toast.js',
  '../../core/components/modal.js',
  '../../core/components/form.js',
  '../../core/components/list.js'
];

// External CDN resources to cache
const EXTERNAL_URLS = [
  'https://cdn.tailwindcss.com'
];

// Install event - cache all static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] Caching app files...');
        
        // Cache local files
        await cache.addAll(URLS_TO_CACHE);
        
        // Try to cache external CDN resources
        for (const url of EXTERNAL_URLS) {
          try {
            const response = await fetch(url, { mode: 'cors' });
            if (response.ok) {
              await cache.put(url, response);
              console.log('[SW] Cached external:', url);
            }
          } catch (e) {
            console.log('[SW] Could not cache external:', url);
          }
        }
        
        console.log('[SW] All files cached');
      })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip GitHub API requests (they should always go to network)
  if (url.hostname === 'api.github.com') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Cache the new response for future
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch((error) => {
            console.log('[SW] Fetch failed, serving offline fallback');
            // If both cache and network fail, return a basic offline response
            return new Response('Offline - Please check your connection', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});
