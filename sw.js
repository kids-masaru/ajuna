// バージョンを v5 に上げました
const CACHE_NAME = 'oekaki-v5';

// 保存するファイルの一覧
const urlsToCache = [
  './',
  './index.html',
  './oekaki.html',
  './piano.html',
  './snow.html',      // ← ★ここに追加しました！
  './manifest.json',
  './icon.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
