const CACHE_NAME = 'ajuna-v5';

// ローカルファイル（インストール時にまとめてキャッシュ）
const LOCAL_FILES = [
  './',
  './index.html',
  './eawase.html',
  './hiragana.html',
  './kaimono.html',
  './karuta.html',
  './kazukazoe.html',
  './oekaki.html',
  './piano.html',
  './puzzle.html',
  './snow.html',
  './tebiki.html',
  './woodPuzzle.html',
  './manifest.json',
  './icon.png',
  './eawase.mp3',
  './kaimono_bgm.mp3',
];

// インストール時：ローカルファイルを全部キャッシュ
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(LOCAL_FILES))
  );
});

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// フェッチ時：キャッシュ優先、なければネットワーク取得してキャッシュ保存
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isExternal = url.origin !== self.location.origin;

  if (isExternal) {
    // 外部リソース（Tailwind CSS、Google Fonts）：キャッシュがあれば使う、なければ取得してキャッシュ
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok || response.type === 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  } else {
    // ローカルリソース：キャッシュ優先
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
  }
});
