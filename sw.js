// バージョンを v4 に上げました！
const CACHE_NAME = 'oekaki-v4';

// 保存するファイルの一覧
const urlsToCache = [
  './',
  './index.html',     // メニュー
  './oekaki.html',    // おえかき
  './piano.html',     // ピアノ（←追加！）
  './manifest.json',
  './icon.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700&display=swap'
];

// 1. インストール（データを保存する）
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 2. 有効化（古いデータを消して、新しいデータに置き換える）
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // 今のバージョン(v4)じゃないものは全部消す！
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. 通信（オフラインなら保存したデータを出す）
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
