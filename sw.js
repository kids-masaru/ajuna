const CACHE_NAME = 'oekaki-v1';
const urlsToCache = [
  './',
  './index.html',     // メニュー
  './manifest.json',
  './icon.png',
  './oekaki.html',    // ← おえかきを追加！
  './game2.html'      // ← 新しいゲームを作ったらここにも追加！
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
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
