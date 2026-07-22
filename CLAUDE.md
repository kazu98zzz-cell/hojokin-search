# CLAUDE.md — hojokin-search（補助金・助成金検索ツール）

## 1. 概要
jGrants公開APIの補助金データを取得しJSON化 → 静的サイトでブラウザ内検索するツール。V1。

## 2. 最重要制約（不変条件 / CONSTRAINTS.md）
- 公開サイト(public/)は外部APIを叩かない。同梱 `data/subsidies.json` のみ読む。
- 有料API・AI/LLM API・従量課金サービスを使わない（公開後の運営者コスト0）。
- jGrantsデータ利用時は出典表示（jGrants/デジタル庁＋取得日）必須。
- 依存ゼロ（npm install不要 / フロントもライブラリ非使用）。

## 3. アーキテクチャ
- `fetch-data.js` … 外部APIを叩く唯一の場所（ビルド時）。keyword巡回＋ID重複排除＋詳細エンリッチ（業種）＋バックオフ。
- `public/filters.js` … 検索ロジック（純関数・UI非依存・テスト対象）。
- `public/app.js` … データ読込＋描画（innerHTML禁止, textContentのみ = XSS対策）。
- `public/index.html` / `style.css` … 画面。
- `server.js` … ローカル確認用のみ（本番不要）。

## 4. データ構造（public/data/subsidies.json）
`{ fetched_at, source, count, items:[{id,code,title,max_limit,start,end,area,employees,industry,use_purpose,url}] }`
- area は一覧の target_area_search（詳細はnull混在のため一覧を正）。
- industry は日本標準産業分類の大分類を「 / 」連結（「、」は名称の一部＝分割禁止）。
- url は `https://www.jgrants-portal.go.jp/subsidy/{id}`（id から規則生成）。

## 5. jGrants API メモ
- 一覧 `GET /exp/v1/public/subsidies`（認証不要, keyword必須2文字以上, acceptance=1で募集中）。
- 詳細 `GET /exp/v2/public/subsidies/id/{id}`（industry/use_purpose）。
- レート制限あり（500req前後で制限、詳細連打で429）→ 間隔300ms＋指数バックオフ。日本語keywordはUTF-8で送る。

## 6. よく使うコマンド
- 取得: `node fetch-data.js`（`--dry-run` / `--limit N` / `--no-detail`）
- 確認: `node server.js` → http://localhost:8787
- テスト: `npm test`

## 7. テスト方針
- filters.js を fixtures JSON で単体テスト（API不要・決定論）。境界: ゆらぎ吸収/地域=全国/業種の、非分割/締切境界。

## 8. 変更時の注意
- コード修正時は docs/SRS.md・docs/SDD.md・CONSTRAINTS.md の該当も更新（黄金ルール#6）。
- API仕様変更に備え、fetch-data.js の正規化(normalize)を単一箇所に集約している。

## 9. V2 バックログ（DEFER）
- 自治体独自サイト収集 / GitHub Actions自動更新 / 詳細全項目の取得・キャッシュ / お気に入り(localStorage)。
