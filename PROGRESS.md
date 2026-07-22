# PROGRESS.md — 補助金検索ツール V1

## フェーズ進捗
| Phase | 内容 | 状態 |
|---|---|---|
| 0 | ヒアリング（intake/scope/open items） | ✅ 完了 |
| 1 | リサーチ（jGrants API実態・規約） | ✅ 完了（research_v1.md） |
| 2 | SRS | ✅ 完了（docs/SRS.md） |
| 3 | SDD + CLAUDE.md | ✅ 完了 |
| 4 | テスト計画/E2E/CONSTRAINTS | ✅ 完了 |
| 5 | レビュー・GO判定 | ✅ GO / RYG=Green（harness/review-log.md） |
| 6 | 実装 | ✅ 完了（fetch-data.js / public/*） |
| 7 | E2E検証 | ✅ 単体12/12・E2E全PASS |
| 8 | 本番移行 | ⏳ 全件データ生成→デプロイ（運営者作業） |

## DoD チェックリスト
- [x] 4フィルタ（キーワード/地域/金額・締切/業種）が動作
- [x] 公式詳細ページへのリンク
- [x] 出典・取得日表示
- [x] 公開後の運営者コスト0（public/に外部fetchなしをgrep検証）
- [x] 依存ゼロ・ビルド不要
- [x] 単体テスト全PASS
- [x] E2E全PASS
- [x] 本番全件データで最終確認（325件・JSON 251KB・全件業種あり・E2E全PASS）

## 残作業（本番移行 Phase 8）
1. `node fetch-data.js` を最後まで実行し public/data/subsidies.json を全件で更新。
2. public/ を無料静的ホスティング（GitHub Pages/Netlify/Cloudflare Pages）へ公開。
3. （V2）GitHub Actionsで定期自動更新、自治体独自補助金の追加、キーワード拡張。

## 既知の注記
- 現時点の募集中件数は使用キーワード42語で約325件ユニーク。網羅性を上げるにはキーワード拡張（V2）。
- area は一覧APIの target_area_search を採用（詳細はnull混在）。
