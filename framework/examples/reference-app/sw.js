/**
 * Service Worker for Reference App
 */

const CACHE_NAME = 'reference-app-v1';
const URLS_TO_CACHE = [
  'index.html',
  'app.js',
  'manifest.json',
  '../../core/Storage.js',
  '../../core/State.js',
  '../../core/GitHubSync.js',
  '../../core/SyncController.js',
  '../../core/App.js',
  '../../core/ui/Toast.js',
  '../../core/ui/Modal.js',
  '../../core/ui/Form.js',
  '../../core/ui/List.js',
  '../../styles/core.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip GitHub API requests (we want these to always go to network)
  if (event.request.url.includes('api.github.com')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        // Return cached version or fetch from network
        const fetchPromise = fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache successful responses
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));
            
            return response;
          })
          .catch(() => cached); // If network fails, use cached
        
        return cached || fetchPromise;
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});
