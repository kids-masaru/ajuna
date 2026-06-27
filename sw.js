const CACHE_NAME = 'ajuna-v56';

// ローカルファイル（インストール時にまとめてキャッシュ）
const LOCAL_FILES = [
  './',
  './index.html',
  './assets/kit.css',
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
  './carrace.html',
  './carraceBGM.mp3',
  './graingame.html',
  './graingameBGM.mp3',
  './yukinokuni.html',
  './suno.mp3',
  './yuki.png',
  './teki1.png',
  './teki2.png',
  './boss.png',
  './haikei.png',
  './programming.html',
  './sushi.html',
  './waniwani.html',
  './wani_head.png',
  './fishing.html',
  './kart.html',
  './kart_sprites.png',
  './kart_cat_front.png',
  './kart_cat_back.png',
  './kart_dog_front.png',
  './kart_dog_back.png',
  './kart_panda_front.png',
  './kart_panda_back.png',
  './kart_tiger_front.png',
  './kart_tiger_back.png',
  './kart_rabbit_front.png',
  './kart_rabbit_back.png',
  './item_mushroom.png',
  './item_fire.png',
  './kart_fox_front.png',
  './kart_fox_back.png',
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
    // 外部リソース：ネットワーク優先、失敗時のみキャッシュ
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok || response.type === 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
  } else {
    // ローカルリソース：ネットワーク優先、失敗時のみキャッシュ（オフライン対応）
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
  }
});
