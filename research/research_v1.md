# research_v1.md — 補助金検索ツール 技術調査 V1

作成日: 2026-07-22 / プロジェクト: hojokin-search（補助金・助成金検索ツール V1）

## 調査目的
無料・API課金ゼロで「Web公開して不特定多数に使われても運営者に費用が発生しない」補助金検索ツールを実現するための、データ入手先・アーキ制約の確定。

---

## EV-JGRANTS-001: jGrants 公開API（信頼度A：一次ソース＝デジタル庁開発者サイト）
- 提供: デジタル庁／中小企業庁「Jグランツ（jGrants）」
- 料金: **完全無料**。APIキー・利用登録不要（`/public/` エンドポイント＝**認証不要**）。
- エンドポイント（一次確認）:
  - 一覧: `GET https://api.jgrants-portal.go.jp/exp/v1/public/subsidies`
  - 詳細: `GET https://api.jgrants-portal.go.jp/exp/v2/public/subsidies/id/{id}`
- 一覧の主なパラメータ: `keyword`（**必須・2文字以上**）, `sort`, `order`, `acceptance`(0/1=募集中), `use_purpose`(目的), `industry`(業種), `target_number_of_employees`(従業員規模), `target_area_search`(地域) など。
- レスポンス: `metadata` + `result`（JSON）。
- ドキュメント: https://developers.digital.go.jp/documents/jgrants/api/

## EV-JGRANTS-002: 「全件取得」の制約と回避策（信頼度B：個人開発事例 zenn/blog）
- `keyword` 必須のため **「全件ください」ができない**。
- 実運用の定石: 「事業／補助／支援／促進…」等の**広域キーワード約20個を巡回**し、返ってきた補助金を**IDで重複排除**して全件相当（現時点 **約3,600件（募集中）**）を収集する。
- 出典: https://zenn.dev/shin_takaiwa/articles/aa0c54b4811a37

## EV-JGRANTS-003: レートリミット（信頼度B：個人開発事例）
- 150ms間隔でも **500リクエスト前後で制限**に当たる。詳細APIは連打で **429**。
- 対策: リクエスト間隔を空ける＋**指数バックオフ（2s→5s→10s）**リトライ。これで全件エラーゼロ取得の実績あり。
- 出典: https://zenn.dev/shin_takaiwa/articles/aa0c54b4811a37

## EV-JGRANTS-004: 利用規約・データ再利用（信頼度A：デジタル庁）
- 政府データは「**公共データ利用規約（第1.0版）**」＝実質 **CC BY**（**出典表示すれば再利用・改変・商用利用可**）。
- 対応: アプリ内に **出典表示（「出典: jGrants（デジタル庁）」＋取得日）** を明記する。
- 出典: https://www.digital.go.jp/（公共データ利用規約 解説PDF）

---

## 結論（V1に効く確定事項）

| 論点 | 結論 | 区分 |
|------|------|------|
| データ入手先 | jGrants 公開API（認証不要・無料） | 確定 |
| ブラウザ直接呼び出し | **不採用**。keyword必須＋レート制限＋CORS不確実のため非現実的 | 確定 |
| アーキ | **ビルド時に取得スクリプトで全件JSON化 → 静的配信 → ブラウザ内(JS)で検索** | 確定 |
| 公開時の運営者コスト | **ゼロ**。公開サイトは自前の静的JSONを読むだけ（API/サーバー/AI課金なし） | 確定 |
| データ更新 | 取得スクリプトを手動実行 → JSON差し替え → 再デプロイ（V2でGitHub Actions自動化） | 確定 |
| 規約 | 出典表示で再利用可 | 確定 |
| データ規模 | 募集中 約3,600件 → gzip後 数百KB〜数MB想定。ブラウザ内検索で十分実用 | 推奨 |

## 未解決点（V2でDeepdive）
- U-01: 自治体独自補助金（jGrants非掲載分）の収集方法（統一APIなし）→ V2でDEFER。
- U-02: 詳細API（金額上限・締切の厳密値）をどこまで取得するか＝取得時間とのトレードオフ。
- U-03: JSONサイズが大きい場合の分割・遅延読み込み要否（実データ計測後に判断）。
