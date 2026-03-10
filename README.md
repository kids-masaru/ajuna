# げーむのひろば

子ども向けゲームアプリ。GitHub Pages で公開中。

---

## ページ一覧

| ファイル | 内容 |
|---|---|
| index.html | ホーム画面 |
| eawase.html | えあわせ |
| hiragana.html | ひらがな |
| kaimono.html | かいもの |
| karuta.html | かるた |
| kazukazoe.html | かずかぞえ |
| oekaki.html | おえかき |
| piano.html | ピアノ |
| puzzle.html | パズル |
| snow.html | ゆき |
| tebiki.html | てびき |
| woodPuzzle.html | もくせいパズル |

---

## PWA（オフライン対応）について

このアプリはオフラインでも動くよう Service Worker でキャッシュしています。

### 仕組み

- `sw.js`：Service Worker。キャッシュするファイルを管理する
- `manifest.json`：アプリ名・アイコンなどの設定
- ユーザーは最初に一度オンラインでアクセスするだけでOK。以降はオフラインで遊べる

### ファイルを追加・変更したときのルール（重要）

新しいページや音声ファイルを追加したとき、または既存ファイルを更新したときは、**必ず以下の2つを行うこと**。

#### 1. `sw.js` のキャッシュリストに追加

新しいファイルを `LOCAL_FILES` 配列に追加する。

```js
const LOCAL_FILES = [
  // ...既存のファイル...
  './newpage.html',   // ← 追加したファイルはここに書く
  './newbgm.mp3',
];
```

#### 2. `CACHE_NAME` のバージョンを上げる

```js
// 変更前
const CACHE_NAME = 'ajuna-v1';

// 変更後（数字を1つ上げる）
const CACHE_NAME = 'ajuna-v2';
```

バージョンを上げると、ユーザーが次回アクセスしたときに自動で新しいキャッシュに切り替わる。ユーザー側の操作は不要。

### ユーザー側の手順

1. Wi-Fi がある状態でURLを開く（初回のみ）
2. 以降はオフラインでも遊べる
3. アプリ更新時も、次にURLを開いたとき自動で更新される

---

## 外部リソース

全ページで以下を使用（オフライン時は初回アクセス時のキャッシュを利用）。

- Tailwind CSS：`https://cdn.tailwindcss.com`
- Google Fonts（M PLUS Rounded 1c）：`https://fonts.googleapis.com`
