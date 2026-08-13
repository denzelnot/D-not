// D-Not — Service Worker: кэширует само приложение (index.html),
// чтобы оно открывалось даже без интернета. Данные (IndexedDB) и так
// локальные — не хватало только «тела» страницы.
//
// При каждом обновлении файла увеличивайте CACHE_NAME (v1 -> v2 -> ...),
// иначе браузер будет упрямо показывать старую закэшированную версию.
const CACHE_NAME = 'dnot-shell-v1';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Внешние ресурсы (шрифты, Google) — не трогаем, пусть идут в сеть напрямую.
  // Без интернета они просто не подгрузятся, а приложение всё равно откроется.
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((resp) => {
          if (resp && resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
