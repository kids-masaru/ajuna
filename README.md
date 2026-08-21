# げーむのおへや

4歳の女の子向けのゲーム集。GitHub Pages で公開している PWA（インストールできる Web アプリ）。

- 公開URL: https://kids-masaru.github.io/ajuna/
- リポジトリ: https://github.com/kids-masaru/ajuna
- 現在のバージョン: **v6.7**（Service Worker キャッシュ: `ajuna-v102`）

---

## ゲーム一覧（19本）

トップ画面（`index.html`）から遊べるゲーム。すべてアイコン画像をタップするとすぐ始まる。

| # | ファイル | ゲーム名 | 内容 |
|---|---|---|---|
| 1 | `oekaki.html` | おえかき | 自由に絵が描けるお絵かきツール |
| 2 | `piano.html` | ピアノ | 鍵盤をタップして音を鳴らす |
| 3 | `snow.html` | ゆきのまほう | 画面をなぞると雪が舞うエフェクト |
| 4 | `karuta.html` | かるた | 読み札に合う絵札をさがす |
| 5 | `puzzle.html` | パズル | ジグソーパズル |
| 6 | `kaimono.html` | おかいもの | お買い物ごっこ（React） |
| 7 | `hiragana.html` | ひらがな | 指でなぞってひらがなを練習 |
| 8 | `eawase.html` | えあわせ | 神経衰弱 |
| 9 | `woodPuzzle.html` | かたちパズル | 木製ブロックのはめこみパズル |
| 10 | `kazukazoe.html` | かずかぞえ | 数をかぞえる練習 |
| 11 | `carrace.html` | カーレース | 横スクロールのレース |
| 12 | `graingame.html` | クレーンゲーム | ぬいぐるみをアームでつかむ |
| 13 | `yukinokuni.html` | 雪の国 | 雪の国を進むアクション |
| 14 | `programming.html` | めいろ | 命令をならべてゴールをめざす迷路 |
| 15 | `sushi.html` | かいてんずし | シャリにネタをのせてお寿司を作る（React） |
| 16 | `waniwani.html` | ワニワニ | ワニワニパニック（30秒） |
| 17 | `fishing.html` | さかなつり | 注文どおりの色の魚を釣る |
| 18 | `kart.html` | ドットカート | Mode 7 の3Dカートレース |
| 19 | `osewa.html` | おせわごっこ | お人形の着せかえ・お世話ごっこ |

### ゲームの中から行くページ

トップ画面には出てこない、ゲーム内から移動するページ。

| ファイル | 内容 |
|---|---|
| `slide.html` | すべりだいめいろ（おせわごっこ → こうえん から） |
| `swing.html` | ブランコ（おせわごっこ → こうえん から） |
| `tebiki.html` | つかいかたせつめい |

---

## ファイル構成

```
index.html          トップ画面（ゲーム一覧）
manifest.json       PWA の設定（アプリ名・アイコン）
sw.js               Service Worker（オフライン対応）
assets/kit.css      共通デザインシステム（gp-* クラス）
spec.md             技術仕様書
task.md             タスク管理

*.html              各ゲーム
icon_*.png          トップ画面のアイコン画像（19枚）
*_atlas.png         スプライトシート（魚・クレーン・雪の国など）
doll_*.png          おせわごっこの人形パーツ
kart_*.png          ドットカートのキャラ・素材
*.mp3               BGM
```

---

## PWA（オフライン対応）について

Service Worker でファイルをキャッシュしているので、一度オンラインで開けば以降はオフラインでも遊べる。

### ファイルを追加・変更したときのルール（重要）

新しいページや画像を追加したとき、または既存ファイルを更新したときは、**必ず以下の3つを行うこと**。

#### 1. `sw.js` の `LOCAL_FILES` に追加

```js
const LOCAL_FILES = [
  // ...既存のファイル...
  './newgame.html',    // ← 追加したファイルはここに書く
  './newgame_atlas.png',
];
```

#### 2. `sw.js` の `CACHE_NAME` のバージョンを上げる

```js
const CACHE_NAME = 'ajuna-v102';   // → 'ajuna-v103' のように数字を1つ上げる
```

#### 3. `index.html` の登録URLも同じ番号に合わせる

```html
navigator.serviceWorker.register('./sw.js?v=102');   <!-- → v=103 -->
```

あわせて、画面右上に出ているバージョン表示（`v6.7`）も更新する。

この3つがズレていると、**修正したのに端末に反映されない**という状態になるので注意。

### 反映されないときは

1. ブラウザを完全に閉じてから開き直す
2. それでもダメなら、ホーム画面のアイコンを一度削除して入れ直す

`index.html` は起動時に古い Service Worker を登録解除してキャッシュを消す処理を入れているので、通常は自動で新しくなる。

---

## 外部リソース

全ページで以下を読み込んでいる（オフライン時は初回アクセス時のキャッシュを利用）。

- Tailwind CSS 3.4.1 — `https://cdn.tailwindcss.com/3.4.1`
- Google Fonts（M PLUS Rounded 1c）— `https://fonts.googleapis.com`
- React 18.2.0 / ReactDOM 18.2.0 / Babel Standalone 7.24.7 — `sushi.html` と `kaimono.html` のみ

バージョンはすべて固定してある。勝手に上がって壊れるのを防ぐため、固定を外さないこと。

---

## 手元のバックアップを最新にする方法

このリポジトリ（GitHub の `main` ブランチ）が**常に最新**。手元のフォルダは控え。

手元のコピーを最新にしたいときは、以下の手順で入れ替える。

1. https://github.com/kids-masaru/ajuna/archive/refs/heads/main.zip をダウンロード
2. ZIP を解凍する（`ajuna-main` フォルダができる）
3. 手元の `ajuna` フォルダを `ajuna_old` に名前変更（保険として残す）
4. `ajuna-main` を同じ場所に移動し、名前を `ajuna` に変更
5. 問題なければ `ajuna_old` を削除

> **⚠️ 注意：逆方向は絶対にやらないこと**
>
> 手元のフォルダの中身を GitHub にアップロードし直すと、古い内容で上書きされてしまう。
> 同期は必ず **GitHub → 手元** の一方向だけ。
