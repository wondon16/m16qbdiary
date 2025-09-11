const CACHE_VERSION = 'm16flow-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/media.js',
  '/schedule.html',
  '/schedule.js',
  '/pay.html',
  '/altlogo2.png',
  '/manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await cache.addAll(CORE_ASSETS.filter(Boolean));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => { if (k !== CACHE_VERSION) return caches.delete(k); }));
    self.clients.claim();
  })());
});

// Network-first for navigations; cache-first for static assets
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(req) || await cache.match('/index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // cache-first for same-origin GET
  if (req.method === 'GET' && url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return cached || Response.error();
      }
    })());
  }
});

