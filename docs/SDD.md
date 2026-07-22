# SDD — 補助金検索ツール V1（IEEE 1016準拠・簡約版）

- プロジェクト: hojokin-search / 版: 1.0 / 日付: 2026-07-22

## 1. 論理ビュー（コンポーネント）
```
[fetch-data.js]  ── Node取得スクリプト（ビルド時のみ・APIを叩く唯一の場所）
     │  jGrants一覧(keyword巡回) → dedupe → 詳細エンリッチ(業種) → 正規化
     ▼
[public/data/subsidies.json]  ── 静的データ（{fetched_at, count, items[]}）
     ▲
[public/index.html + app.js + style.css]  ── ブラウザ内検索UI（fetchはローカルJSONのみ）
```
- 責務分離: **外部API接続は fetch-data.js に限定**（NFR-COST-001を構造で保証）。公開物 public/ はAPIを一切知らない。

## 2. プロセスビュー（取得フロー / FR-FETCH）
1. 広域キーワード配列（例: 事業,補助,支援,促進,導入,設備,研究,雇用,創業,IT,省エネ,環境,人材,販路,ものづくり,観光,農業,福祉,教育,地域…）を巡回。
2. 各キーワードで一覧API（acceptance=1）→ 結果を `id` でMapに統合（重複排除）。
3. リクエスト間隔 300ms + 指数バックオフ（2s→5s→10s, 429/5xx時）。
4. 未取得 or キャッシュ切れ(既定7日)の各 `id` を詳細APIで industry/use_purpose 付与。`data/detail-cache/{id}.json` に増分キャッシュ（再実行を高速化＝FR-FETCH-003）。
5. 正規化して `public/data/subsidies.json` 出力。`--dry-run` で件数のみ表示しファイル書換なし（既定は書換）。

## 3. データビュー（DATA-001）
```jsonc
{ "fetched_at":"2026-07-22", "count":3600, "items":[
  { "id":"a0WJ...", "code":"S-00009406", "title":"...の公募",
    "max_limit":100000, "start":"2026-06-19T06:00:00Z", "end":"2026-07-24T08:30:00Z",
    "area":"全国", "employees":"従業員数の制約なし",
    "industry":"製造業、情報通信業", "use_purpose":"設備投資を行いたい",
    "url":"https://www.jgrants-portal.go.jp/subsidy/a0WJ..." } ]}
```
- 地域は一覧の `target_area_search`（詳細はnull混在のため一覧を正とする）。
- URLは `id` から規則生成（詳細API不要）。

## 4. 物理ビュー（デプロイ）
- `public/` をそのまま静的ホスティング（GitHub Pages / Netlify / Cloudflare Pages）へ。ビルド不要。
- 更新運用: `node fetch-data.js` → 生成された public/data/subsidies.json をコミット/アップロード → 再デプロイ。
- コスト: ホスティング無料枠、公開後の外部通信なし → **0円**。

## 5. モジュールIF
- `fetch-data.js`: CLI。`--dry-run`（書換なし）, `--limit N`（動作確認用に件数制限）, `--no-detail`（業種エンリッチskip・高速）。
- `app.js`: `loadData()`, `applyFilters(state)`, `render(items)`。状態は素のオブジェクト、依存ライブラリなし。

## 6. ADR
- ADR-001: ブラウザ直接API呼び出しを**不採用** → 事前JSON化。理由: keyword必須＋レート制限＋CORS不確実＋公開後課金ゼロ要件。代替(直接呼び)はNFR-COST/PERFを満たせず却下。
- ADR-002: フレームワーク不採用（素のHTML/JS）。理由: NFR-PORT（ビルド不要・依存ゼロ・どの無料ホスティングでも動く）。代替(React等)はビルド前提で過剰。
- ADR-003: 業種は詳細APIでエンリッチ＋増分キャッシュ。代替(一覧のindustryパラメータ巡回)はkeyword×業種で請求数増大のため却下。

## 7. トレーサビリティ（要件↔モジュール↔TC）
| 要件 | モジュール | TC |
|---|---|---|
| FR-FETCH-001/002/003/004 | fetch-data.js | TC-FR-FETCH-00x |
| FR-SEARCH-001..004 | app.js applyFilters | TC-FR-SEARCH-00x |
| FR-VIEW-001..004 | app.js render / index.html | TC-FR-VIEW-00x |
| NFR-COST-001 | 構造分離(public/はAPI非依存) | TC-NFR-COST-001 |

## 8. 実装容易性・安全
- 外部書き込み・課金・削除操作: **なし**（読み取り専用API＋ローカルファイル生成のみ）。破壊的操作ゼロ＝dry-run対象は「JSON書換」のみで `--dry-run` 提供。
- キー無しで全テスト通過: 検索ロジック(app.js)は fixtures JSON で単体テスト可能（API不要）。
