# Remap Keymap Typing

Remap / VIA対応の自作キーボードをWebHIDで読み取り、実際のキーマップ（レイヤー・レイアウトオプション込み）を表示してタイピング練習ができるWebアプリ。

## 使い方（ローカル実行）

```
start.cmd をダブルクリック  →  http://localhost:8137 が開く
```

WebHIDを使うため Chrome / Edge が必要（localhostはセキュアコンテキスト扱い）。

## 構成

フレームワーク・依存パッケージなし。素のES Modulesで、ビルドせずそのままブラウザで動く。

```
index.html        エントリ（マークアップ）
css/style.css     スタイル（テーマトークン + コンポーネント）
js/
  keycodes.js     QMKキーコード表・ラベル/文字変換（純粋）
  kle.js          KLEレイアウトのパースとレイアウトオプション適用（純粋）
  charmap.js      文字→物理キーの逆引き構築（純粋）
  textgen.js      練習テキスト生成: 英単語/ホームポジション/記号（純粋）
  snippets.js     OSSコード取得・コメント除去・断片抽出（純粋+fetch）
  via.js          WebHID/VIAプロトコル（deviceを引数に取る。DOM非依存）
  registry.js     VID/PID→定義JSON URLの自動取得レジストリ
  demo.js         デモ用60% ANSI定義・キーマップ
  app.js          状態・DOM描画・練習エンジン・イベント配線
build.mjs         単一ファイル版の生成（Node標準のみ）
dist/             生成物（コミット不要）
```

「純粋」なモジュールはDOMに触れないので、Nodeから直接importしてテストできる。

## ビルド（単一ファイル版が必要なとき）

```
node build.mjs
```

- `dist/index.html` … 1ファイル完結。配布やオフライン利用に
- `dist/app-body.html` … claude.ai Artifact 用（doctype/head/bodyなし）

ビルドはimport/export行を剥がして連結するだけの素朴な方式。**モジュール間で最上位の名前が重複しないこと**が前提（重複すると `new Function` チェックで落ちる）。

## テスト

スモークテストはセッションのscratchpadにある `smoke.mjs`（dist/app-body.htmlのスクリプトをDOMスタブ上で実行し、KLEパース・キーコード変換・逆引き・断片抽出・練習エンジンを検証）。変更したら `node build.mjs && node smoke.mjs`。

## メモ

- キーマップはVIAプロトコル（Remapと同じ）で `dynamic_keymap_get_buffer` から読む。旧FWは1キーずつ読むフォールバックあり
- 物理配列はVIA定義JSON（KLE形式 + `matrix` + `layouts.labels`）が必要。localStorageに保存・自動復元
- レジストリ（registry.js）に登録済みのキーボードは接続だけで定義を自動取得
