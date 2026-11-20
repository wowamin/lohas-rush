/* Generated at build time. A new release waits until all old game windows close. */
const BUILD = '__BUILD__';
const FILES = /* precache */ [];
const ROOT = self.registration.scope;
const PREFIX = `lohas-rush-offline:${ROOT}:`;
const CACHE = PREFIX + BUILD;
const INDEX = new URL('index.html', ROOT).href;
const URLS = FILES.map(file => new URL(file, ROOT).href);
const PRECACHED = new Set(URLS);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = ''; url.hash = '';
  const isGameNavigation = request.mode === 'navigate' && (url.href === ROOT || url.href === INDEX);
  if (!isGameNavigation && !PRECACHED.has(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(isGameNavigation ? INDEX : url.href);
    return cached || fetch(request);
  })());
});
