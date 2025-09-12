/* M16 Flow Service Worker */
const SW_VERSION = 'm16-flow-v1.0.0';
const STATIC_CACHE = `${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;

// Core assets for offline
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './space.js',
  './schedule.html',
  './schedule.js',
  './pay.html',
  './qr.html',
  './vendor/qrcode.min.js',
  './logo.png',
  './altlogo2.png',
  './quarterback pocketbook/real1.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => !k.startsWith(SW_VERSION)).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Strategy: Network-first for HTML/navigation; Cache-first for others
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // For navigation or HTML requests use network-first
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, network.clone());
          return network;
        } catch (err) {
          const cached = await caches.match(request);
          return cached || caches.match('./index.html');
        }
      })()
    );
    return;
  }

  // For static assets use cache-first
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const network = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, network.clone());
        return network;
      } catch (err) {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});

// Allow manual skip waiting
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
