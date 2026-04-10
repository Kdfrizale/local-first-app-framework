/**
 * Service Worker for Goal Tracker - Full Offline Support
 */

const CACHE_NAME = 'goal-tracker-v4';
const APP_SHELL = [
  './',
  './index.html',
  './app.js'
];

const FRAMEWORK_FILES = [
  '../../core/Storage.js',
  '../../core/State.js',
  '../../core/GitHubSync.js',
  '../../core/App.js',
  '../../core/ui/Toast.js',
  '../../core/ui/Modal.js'
];

const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Goal Tracker service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache app shell (critical)
      for (const url of APP_SHELL) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Failed to cache:', url);
        }
      }
      
      // Cache framework files (best effort)
      for (const url of FRAMEWORK_FILES) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Failed to cache framework:', url);
        }
      }
      
      // Cache CDNs (best effort)
      for (const url of CDN_URLS) {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) await cache.put(url, response);
        } catch (e) {
          console.warn('[SW] CDN not cached:', url);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(names => 
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (event.request.method !== 'GET') return;
  
  // Network-only for GitHub API
  if (url.hostname === 'api.github.com') {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }
  
  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
