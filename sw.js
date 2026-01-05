const CACHE_NAME = 'etm-v3.1.1.26-core';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Возвращаем из кэша, если есть
      if (cached) return cached;
      
      // Иначе идем в сеть и сохраняем результат
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic' && !event.request.url.includes('tailwindcss')) {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        return response;
      }).catch(() => {
        // Если совсем всё плохо — отдаем главную страницу
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});