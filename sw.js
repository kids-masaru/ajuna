const CACHE_NAME = 'ajuna-v127';

// ローカルファイル（インストール時にまとめてキャッシュ）
const LOCAL_FILES = [
  './',
  './index.html',
  './assets/kit.css',
  './assets/landscape-prompt.css',
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
  './ui_home_v2_256.png',
  './icon_oekaki.png',
  './icon_piano.png',
  './icon_snow.png',
  './icon_karuta.png',
  './karuta_animals_atlas.png',
  './karuta_vehicles_atlas.png',
  './karuta_produce_atlas.png',
  './karuta_nature_atlas.png',
  './karuta_things_atlas.png',
  './karuta_sun.png',
  './karuta_glasses.png',
  './icon_puzzle.png',
  './icon_kaimono.png',
  './kaimono_items_greengrocer_atlas.png',
  './kaimono_items_fish_atlas.png',
  './kaimono_items_sweets_atlas.png',
  './kaimono_items_bakery_atlas.png',
  './kaimono_items_toys_atlas.png',
  './kaimono_items_flowers_atlas.png',
  './kaimono_items_convenience_atlas.png',
  './kaimono_shop_scenes_v2.png',
  './ui_shopping_basket_v2.png',
  './icon_hiragana.png',
  './icon_eawase.png',
  './icon_woodpuzzle.png',
  './icon_kazukazoe.png',
  './kazukazoe_items_atlas.png',
  './snow_followers_v2.png',
  './icon_carrace.png',
  './icon_graingame.png',
  './icon_yukinokuni.png',
  './icon_programming.png',
  './icon_sushi.png',
  './icon_kart.png',
  './icon_waniwani.png',
  './icon_fishing.png',
  './icon_osewa.png',
  './toyfreeze.html',
  './toyfreeze_room.png',
  './toyfreeze_characters.png',
  './toyfreeze_stage_scenes_v2.png',
  './toyfreeze_friends_v2.png',
  './toyfreeze_mint_robot_walk_v3.png',
  './toyfreeze_blue_robot_walk_v3.png',
  './toyfreeze_bunny_walk_v3.png',
  './toyfreeze_car_roll_v3.png',
  './toyfreeze_dino_walk_v3.png',
  './toyfreeze_girl_turn_v3.png',
  './icon_toyfreeze.png',
  './slide.html',
  './slide_girl.png',
  './slide_park_bg_v2.png',
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
  './park_swing_icon_v2_512.png',
  './park_slide_icon_512.png',
  './ui_menu_clothes_256.png',
  './ui_menu_hair_256.png',
  './ui_menu_shoes_256.png',
  './ui_menu_food_256.png',
  './ui_menu_bath_256.png',
  './ui_menu_sleep_256.png',
  './ui_location_room_256.png',
  './ui_location_park_256.png',
  './ui_location_shop_256.png',
  './shop_items_bakery_atlas_768.png',
  './shop_items_toy_atlas_768.png',
  './shop_items_candy_atlas_768.png',
  './shop_items_flower_atlas_768.png',
  './ui_shop_basket_256.png',
  './ui_mood_heart_128.png',
  './ui_sparkle_128.png',
  './ui_sleep_star_128.png',
  './osewa_title_girl_512.png',
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
  './doll_bath_v2_512.png',
  './doll_sleep_v2_512.png',
  './eawase.mp3',
  './kaimono_bgm.mp3',
  './carrace.html',
  './carraceBGM.mp3',
  './graingame.html',
  './graingameBGM.mp3',
  './crane_atlas.png',
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
  './fish_atlas.png',
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
          cache.add(url).catch(error => {
            // 1ファイルの失敗でインストール全体を止めず、原因だけ確認できるようにする。
            console.warn(`キャッシュできませんでした: ${url}`, error);
          })
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
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone))
            .catch(error => console.warn('外部ファイルをキャッシュできませんでした。', error));
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
        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, clone))
          .catch(error => console.warn('ローカルファイルをキャッシュできませんでした。', error));
        return response;
      }).catch(() => caches.match(event.request))
    );
  }
});
