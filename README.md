# 補助金・助成金 検索ツール（hojokin-search）

jGrants（デジタル庁）の公開APIから募集中の補助金・助成金を取得し、**地域・業種・金額・締切・キーワード**で絞り込める検索サイトです。

- ✅ **完全無料**：無料の公的API（jGrants）＋静的サイト。**公開しても運営者に課金は発生しません**
- ✅ **サーバー不要**：公開サイトは同梱の `data/subsidies.json` を読むだけ（外部通信ゼロ）
- ✅ **依存ゼロ**：`npm install` 不要。フロントもライブラリ非使用

## 仕組み

```
[fetch-data.js]  jGrants公開API → 全件JSON化（このスクリプトだけがAPIを叩く）
      ↓ 生成
[public/data/subsidies.json]  静的データ
      ↓ 読み込み
[public/*]  ブラウザ内で検索・絞り込み（外部通信なし）
```

## 使い方

### 1. データを取得する（初回・更新時）

```bash
node fetch-data.js
```

`public/data/subsidies.json` が生成／更新されます。募集中の補助金を広域キーワード巡回＋ID重複排除で全件収集し、業種はキャッシュ付きで詳細APIから付与します。

オプション:

| コマンド | 用途 |
|---|---|
| `node fetch-data.js --dry-run` | 件数確認のみ（ファイル書換なし） |
| `node fetch-data.js --limit 50` | 動作確認用に50件に制限 |
| `node fetch-data.js --no-detail` | 業種エンリッチをskip（高速・業種空） |

> レート制限対策として自動で間隔＋指数バックオフを行うため、全件取得には数分〜十数分かかります。2回目以降は詳細キャッシュ（`data/detail-cache/`、7日有効）で高速化します。

### 2. ローカルで確認する

```bash
node server.js
```

ブラウザで <http://localhost:8787> を開く。

### 3. Web公開する（無料ホスティング）

`public/` フォルダをそのままアップロードするだけ（ビルド不要）。

- **GitHub Pages**：リポジトリに push し、Pages の公開元を `public/` に設定
- **Netlify / Cloudflare Pages**：publish directory を `public` に指定（ビルドコマンドは空）

### 4. データ更新の運用

`node fetch-data.js` を実行 → 生成された `public/data/subsidies.json` をコミット／アップロード → 再デプロイ。
（将来: GitHub Actions で定期自動化が可能。V2で対応予定）

## テスト

```bash
npm test
```

検索ロジック（`public/filters.js`）の単体テスト（API不要）。

## データの出典・ライセンス

- データ出典：**jGrants（デジタル庁）** <https://www.jgrants-portal.go.jp/>
- jGrantsの公共データは「公共データ利用規約（≒CC BY）」に基づき、出典表示のうえ再利用しています。
- 本ツールは非公式です。最新・正確な情報は各補助金の**公式詳細ページ**をご確認ください。

## 構成

```
hojokin-search/
  fetch-data.js         データ取得スクリプト（APIを叩く唯一の場所）
  server.js             ローカル確認用サーバー（本番不要）
  public/               ← これを静的ホスティングに上げる
    index.html
    app.js              UI・描画
    filters.js          検索ロジック（純関数・テスト対象）
    style.css
    data/subsidies.json 生成データ
  tests/                単体テスト
  docs/                 SRS / SDD / テスト計画 など
```
