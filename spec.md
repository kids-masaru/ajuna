# げーむのおへや - 技術仕様書

## 概要
4歳の女の子向けゲームプラットフォーム。GitHub Pages (kids-masaru/ajuna) でホスティング。

## バージョン
- 表示バージョン: v3.8
- SW キャッシュ: ajuna-v72
- SW 登録: sw.js?v=72

## 技術スタック
- 単一HTMLファイル構成（ビルドツールなし）
- CDN依存（全てバージョン固定）:
  - Tailwind CSS 3.4.1
  - React 18.2.0 / ReactDOM 18.2.0（一部ゲーム）
  - Babel Standalone 7.24.7（一部ゲーム）
- assets/kit.css: 共通デザインシステム（gp-* クラス）
- Service Worker: オフライン対応（ネットワーク優先、失敗時キャッシュ）
- Web Audio API: 効果音生成

## ゲーム一覧（19本）

| ファイル | ゲーム名 | 概要 |
|---------|---------|------|
| oekaki.html | おえかき | お絵かきツール |
| piano.html | ピアノ | ピアノ演奏 |
| snow.html | ゆきのまほう | 雪のエフェクト |
| karuta.html | かるた | かるたゲーム |
| puzzle.html | パズル | ジグソーパズル |
| kaimono.html | おかいもの | お買い物ごっこ |
| hiragana.html | ひらがな | ひらがな学習 |
| eawase.html | えあわせ | 絵合わせ（神経衰弱） |
| woodPuzzle.html | かたちパズル | 木製ブロックパズル |
| kazukazoe.html | かずかぞえ | 数の学習 |
| carrace.html | カーレース | カーレースゲーム |
| graingame.html | クレーンゲーム | クレーンゲーム |
| yukinokuni.html | 雪の国 | 雪の国アドベンチャー |
| programming.html | めいろ | プログラミング迷路 |
| sushi.html | かいてんずし | 回転寿司作り |
| waniwani.html | ワニワニ | ワニワニパニック（30秒制限） |
| fishing.html | さかなつり | 魚釣りゲーム（60秒制限） |
| kart.html | ドットカート | Mode 7 カートレース |
| osewa.html | おせわごっこ | お人形お世話ゲーム |

## おせわごっこ 詳細仕様

### レイヤー構成（下から順）
1. `img-base` (z-index:1) - 体のベース（doll_base.png）
2. `img-cloth` (z-index:2) - 服
3. `img-shoes` (z-index:2) - 靴
4. `img-hair` (z-index:3) - 髪型
5. `img-acc` (z-index:4) - アクセサリー（未使用）

### 画像仕様
- 人形パーツ: 500x750px 透過PNG
- 食べ物: 200x200px 透過PNG
- お風呂/おやすみ: 450x450px 透過PNG

### 服（CLOTHES）
| # | 名前 | ファイル |
|---|------|---------|
| 1 | ピンクドレス | doll_cloth_1.png |
| 2 | みずいろドレス | doll_cloth_2.png |
| 3 | オーバーオール | doll_cloth_3.png |
| 4 | パジャマ | doll_cloth_4.png |
| 5 | キラキラドレス | doll_cloth_5.png |

### 髪型（HAIRS）
| # | 名前 | ファイル |
|---|------|---------|
| 1 | ロングヘア | doll_hair_1.png |
| 2 | ポニーテール | doll_hair_2.png |
| 3 | ツインテール | doll_hair_3.png |

### 靴（SHOES）
| # | 名前 | ファイル |
|---|------|---------|
| 0 | はだし | なし（デフォルト） |
| 1 | ピンクくつ | doll_shoes_1.png |
| 2 | スニーカー | doll_shoes_2.png |
| 3 | ブーツ | doll_shoes_3.png |

### 食べ物（FOODS）
| # | 名前 | ファイル |
|---|------|---------|
| 1 | カレーライス | doll_food_1.png |
| 2 | おにぎり | doll_food_2.png |
| 3 | パンケーキ | doll_food_3.png |
| 4 | りんご | doll_food_4.png |

### その他画像
- doll_bath.png: お風呂シーン用（450x450px）
- doll_sleep.png: おやすみシーン用（450x450px）

### メニュー（6ボタン、position:fixed 画面下部）
1. 👗 おきがえ
2. 💇 かみがた
3. 👟 くつ
4. 🍽️ ごはん
5. 🛁 おふろ
6. 💤 おやすみ

### 機能
- おきがえ/かみがた/くつ: 選択パネルからアイテム選択 → レイヤー差し替え
- ごはん: 食べ物選択 → 4回タップで食べ終わり → ハート回復
- おふろ: 8回タップで洗い完了 → 「ぴかぴか！」
- おやすみ: 3秒後に「おはよう！」ボタン表示 → ハート全回復

## ワニワニパニック 詳細仕様
- ゲーム時間: 30秒
- 難易度4段階（8/16/24/30秒で切替）
- ワニ画像: wani_head.png (1536x1024)
- 穴: 3x2グリッド、clip-path: inset(0 -60% -15% -60%)
- ワニサイズ: width:280%（穴からはみ出す大きさ）
- ポップ位置: translateY(12%)

## ドットカート 詳細仕様
- Mode 7 テクスチャマッピング（1024x1024トラックマップ）
- 6キャラクター（猫/犬/ウサギ/キツネ/パンダ/トラ）
- 5アイテム: きのこ/炎/バナナ/スター/雷
- 敵キャラサイズ: 60 * scale
- アイテムサイズ: 24 * scale（バナナ/炎）
- アイテムボタン: overflow:visible、140x140px、margin-top:30px

## Service Worker (sw.js)
- キャッシュ戦略:
  - ローカル: ネットワーク優先 → 失敗時キャッシュ
  - 外部: ネットワーク優先 → 失敗時キャッシュ → 503
- install時: skipWaiting + 全LOCAL_FILESをキャッシュ
- activate時: 古いキャッシュ削除 + clients.claim
