const CACHE_NAME = 'workout-tracker-v1';
const CDN_CACHE = 'cdn-assets-v1';
const IMAGE_CACHE = 'exercise-images-v1';

const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CDN_CACHE).then((cache) => cache.addAll(CDN_URLS))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.hostname === 'cdn.tailwindcss.com' || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.open(CDN_CACHE).then((cache) =>
        cache.match(request).then((response) =>
          response || fetch(request).then((fetchResponse) => {
            cache.put(request, fetchResponse.clone());
            return fetchResponse;
          })
        )
      )
    );
  } else if (request.url.includes('imageUrl=') || /\.(jpg|jpeg|png|gif|webp)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(request).then((response) => {
          if (response) return response;
          return fetch(request).then((fetchResponse) => {
            if (fetchResponse.ok) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          }).catch(() => {
            return new Response('', { status: 404 });
          });
        })
      )
    );
  }
});
