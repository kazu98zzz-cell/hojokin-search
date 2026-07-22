# TEST_PLAN — 補助金検索ツール V1（IEEE 829 簡約）

## テストピラミッド
- 単体（多）: filters.js の検索ロジック（API不要・決定論）。→ tests/filters.test.js
- 結合（中）: fetch-data.js の正規化＋一覧/詳細のスキーマ整合（実API 1回 or 記録レスポンス）。
- E2E（少）: 静的サイトを起動しブラウザで検索操作を検証。→ E2E_SCENARIOS.md

## Entry Criteria
- SRS/SDDのMust要件にTC接続済み。実装が一通り完了。

## Exit Criteria
- 単体テスト全PASS（カバレッジ目標: filters.jsの分岐80%以上）。
- E2E 正常系全PASS＋主要異常系（データ読込失敗）確認。
- 黄金ルールチェックリスト全項目クリア。

## トレーサビリティ（Must要件 ↔ TC）
| 要件 | TC | 種別 | 状態 |
|---|---|---|---|
| FR-SEARCH-001 キーワード | TC-FR-SEARCH-001（名称/目的/ゆらぎ吸収） | 単体 | PASS |
| FR-SEARCH-002 地域 | TC-FR-SEARCH-002（全国＋県） | 単体 | PASS |
| FR-SEARCH-003 金額・締切 | TC-FR-SEARCH-003（下限/募集中） | 単体 | PASS |
| FR-SEARCH-004 業種 | TC-FR-SEARCH-004（大分類完全一致/、非分割） | 単体 | PASS |
| FR-VIEW-001 一覧 | TC-FR-VIEW-001（件数・カード描画） | E2E | PASS |
| FR-VIEW-002 公式リンク | TC-FR-VIEW-002（/subsidy/{id}） | E2E | PASS |
| FR-VIEW-003 出典表示 | TC-FR-VIEW-003（出典＋取得日） | E2E | PASS |
| FR-FETCH-001 全件取得 | TC-FR-FETCH-001（キーワード巡回・重複排除） | 結合 | PASS(実行確認) |
| FR-FETCH-002 レート制御 | TC-FR-FETCH-002（バックオフ/中断なし完了） | 結合 | PASS(実行確認) |
| FR-FETCH-003 業種エンリッチ | TC-FR-FETCH-003（キャッシュ動作） | 結合 | PASS(実行確認) |
| NFR-COST-001 課金ゼロ | TC-NFR-COST-001（public/に外部URL fetchなし） | 静的検査 | PASS |
| NFR-SEC-001 XSS | TC-NFR-SEC-001（innerHTML不使用） | 静的検査 | PASS |

## 静的検査（grep）
- TC-NFR-COST-001: `public/` 配下に `api.jgrants-portal` や外部 `fetch(` がないこと（app.jsのfetchは相対 `data/subsidies.json` のみ）。
- TC-NFR-SEC-001: `public/app.js` に `innerHTML` が無いこと。
