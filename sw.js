const CACHE_NAME = 'ajuna-v85';

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
  './icon_oekaki.png',
  './icon_piano.png',
  './icon_snow.png',
  './icon_karuta.png',
  './icon_puzzle.png',
  './icon_kaimono.png',
  './icon_hiragana.png',
  './icon_eawase.png',
  './icon_woodpuzzle.png',
  './icon_kazukazoe.png',
  './icon_carrace.png',
  './icon_graingame.png',
  './icon_yukinokuni.png',
  './icon_programming.png',
  './icon_sushi.png',
  './icon_kart.png',
  './slide.html',
  './slide_girl.png',
  './osewa.html',
  './osewa_room.png',
  './osewa_park.png',
  './osewa_shop.png',
  './osewa_shop_bakery.png',
  './osewa_shop_toy.png',
  './osewa_shop_candy.png',
  './osewa_shop_flower.png',
  './shop_icon_bakery.png',
  './shop_icon_toy.png',
  './shop_icon_candy.png',
  './shop_icon_flower.png',
  './park_swing_icon.png',
  './swing.html',
  './swing_bg.png',
  './swing_girl.png',
  './doll_base.png',
  './doll_hair_1.png',
  './doll_hair_2.png',
  './doll_hair_3.png',
  './doll_cloth_1.png',
  './doll_cloth_2.png',
  './doll_cloth_3.png',
  './doll_cloth_4.png',
  './doll_cloth_5.png',
  './doll_food_1.png',
  './doll_food_2.png',
  './doll_food_3.png',
  './doll_food_4.png',
  './doll_pinkshoes.png',
  './doll_sneakers.png',
  './doll_boots.png',
  './doll_bath.png',
  './doll_sleep.png',
  './eawase.mp3',
  './kaimono_bgm.mp3',
  './carrace.html',
  './carraceBGM.mp3',
  './graingame.html',
  './graingameBGM.mp3',
  './yukinokuni.html',
  './suno.mp3',
  './yuki_atlas.png',
  './programming.html',
  './sushi.html',
  './sushi_parts.png',
  './sushi_lane.png',
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

// インストール時：1つ失敗しても他はキャッシュする
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        LOCAL_FILES.map(url =>
          cache.add(url).catch(() => {})
        )
      )
    )
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

// フェッチ時：ネットワーク優先（HTTPキャッシュをバイパス）
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isExternal = url.origin !== self.location.origin;

  if (isExternal) {
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
    // ローカルリソース：HTTPキャッシュをバイパスして常にサーバーから取得
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' }).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
  }
});
