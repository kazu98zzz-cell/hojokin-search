# SRS — 補助金・助成金検索ツール V1（IEEE 29148準拠・簡約版）

- プロジェクト: hojokin-search / 版: 1.0 / 日付: 2026-07-22 / 状態: Approved

## 1. 目的・スコープ
補助金・助成金を条件で絞り込める検索ツールを、**無料の公的API（jGrants）＋静的サイト**で提供する。
Web公開して不特定多数が使っても**運営者に費用が発生しない**こと（サーバー従量課金・AI課金・有料APIを一切持たない）を最重要制約とする。
- In: jGrants掲載（国＋一部自治体）の募集中補助金の検索。
- Out: 電子申請、ユーザー登録/サーバー保存、AI要約。
- Defer(V2): 自治体独自サイト収集、GitHub Actions自動更新、詳細全項目のキャッシュ。

## 2. 成功指標（数値）
- SM-01: 公開後の運営者ランニングコスト = **0円/月**（サーバー・API課金なし）。
- SM-02: 4条件（キーワード/地域/金額・締切/業種）で絞り込み、結果0.5秒以内に表示（3,600件・一般PC）。
- SM-03: 各結果からjGrants公式詳細ページへ1クリックで遷移可能。

## 3. ステークホルダー / 利用者
- USR-001: 補助金を探す事業者（中小企業・個人事業主等）。エンドユーザー。
- USR-002: 運営者（社長）。データ更新スクリプトを手動実行し再デプロイする。

## 4. 外部インターフェース
- API-JGRANTS-001: jGrants一覧 `GET /exp/v1/public/subsidies`（認証不要, keyword必須2文字以上, レート制限あり）。根拠: EV-JGRANTS-001/003。
- API-JGRANTS-002: jGrants詳細 `GET /exp/v2/public/subsidies/id/{id}`（industry/use_purpose取得, 連打で429）。
- **重要**: これら外部API呼び出しは**ビルド時の取得スクリプトのみ**が行い、公開サイト（ブラウザ）は呼ばない。

## 5. 機能要件（Must＝Mを中心に）

| ID | 要件名 | 要件本文（1文） | 優先 | 根拠 | ACC | TC |
|----|-------|------|----|----|----|----|
| FR-FETCH-001 | 全件取得 | 取得スクリプトは広域キーワード巡回とID重複排除で募集中補助金を全件収集する | M | EV-JGRANTS-002 | ACC-FR-FETCH-001 | TC-FR-FETCH-001 |
| FR-FETCH-002 | レート制御 | 取得はリクエスト間隔と指数バックオフでレート制限/429を回避し中断なく完了する | M | EV-JGRANTS-003 | ACC-FR-FETCH-002 | TC-FR-FETCH-002 |
| FR-FETCH-003 | 業種エンリッチ | 各補助金を詳細APIでindustry/use_purposeを付与する（キャッシュで再実行を高速化） | M | 詳細API確認 | ACC-FR-FETCH-003 | TC-FR-FETCH-003 |
| FR-FETCH-004 | JSON出力 | 取得結果を静的配信用の単一JSON（+取得日メタ）に出力する | M | — | ACC-FR-FETCH-004 | TC-FR-FETCH-004 |
| FR-SEARCH-001 | キーワード検索 | 補助金名・概要・業種・目的への部分一致（大小/全半角ゆらぎ吸収）で絞り込む | M | Q3 | ACC-FR-SEARCH-001 | TC-FR-SEARCH-001 |
| FR-SEARCH-002 | 地域絞り込み | 都道府県（＋全国）で絞り込む | M | Q3 | ACC-FR-SEARCH-002 | TC-FR-SEARCH-002 |
| FR-SEARCH-003 | 金額・締切絞り込み | 上限額の下限、締切（募集中のみ/期限日以降）で絞り込む | M | Q3 | ACC-FR-SEARCH-003 | TC-FR-SEARCH-003 |
| FR-SEARCH-004 | 業種絞り込み | 業種カテゴリで絞り込む | M | Q3 | ACC-FR-SEARCH-004 | TC-FR-SEARCH-004 |
| FR-VIEW-001 | 結果一覧 | 補助金名・上限額・締切・地域・業種を一覧表示し件数を示す | M | SM-02 | ACC-FR-VIEW-001 | TC-FR-VIEW-001 |
| FR-VIEW-002 | 公式リンク | 各結果からjGrants公式詳細ページ（/subsidy/{id}）へ遷移できる | M | SM-03 | ACC-FR-VIEW-002 | TC-FR-VIEW-002 |
| FR-VIEW-003 | 出典・取得日表示 | 出典（jGrants/デジタル庁）とデータ取得日を明示する | M | EV-JGRANTS-004 | ACC-FR-VIEW-003 | TC-FR-VIEW-003 |
| FR-VIEW-004 | 空状態 | 該当0件時に「条件に合う補助金は見つかりませんでした」と操作誘導を表示する | S | UX | ACC-FR-VIEW-004 | TC-FR-VIEW-004 |

### 受入基準（Given-When-Then 抜粋）
- ACC-FR-SEARCH-002: Given 3,600件のデータ / When 地域=「東京都」を選択 / Then 対象地域が東京都または全国の補助金のみ表示される。
- ACC-FR-SEARCH-003: Given データ / When 「募集中のみ」ON / Then 締切日時が現在以降のもののみ表示。
- ACC-FR-VIEW-002: Given 任意の結果行 / When 「詳細（公式）」を押す / Then `https://www.jgrants-portal.go.jp/subsidy/{id}` が新規タブで開く。
- ACC-FR-FETCH-002: Given 取得実行 / When 500件超のリクエストでレート制限が発生 / Then バックオフ再試行で最終的に全件取得しエラー0で完了。

## 6. データ（DATA-001: subsidy レコード）
`id, code(name), title, subsidy_max_limit, acceptance_start, acceptance_end, target_area(target_area_search), employees, industry, use_purpose, detail_url` ＋ ルートに `fetched_at`。

## 7. 非機能（ISO 25010）
- NFR-COST-001(Must): 公開後の外部呼び出しは0（ブラウザは自前JSONのみ読む）。根拠SM-01。→ TC-NFR-COST-001。
- NFR-PERF-001: 3,600件で初期表示<1.5s、絞り込み<0.5s。→ TC-NFR-PERF-001。
- NFR-PORT-001: 素のHTML/JSで動作（ビルド不要、file://でも各無料ホスティングでも動く）。依存ゼロ。
- NFR-SEC-001: 外部送信なし・入力はDOMに安全に反映（XSS対策：textContent/エスケープ）。→ TC-NFR-SEC-001。
- NFR-AVAIL-001: データはスナップショット。API障害時も公開サイトは動作継続（取得時のみAPI依存）。

## 8. 制約・法令
- C-01: jGrantsデータは公共データ利用規約（≒CC BY）→ 出典表示必須（FR-VIEW-003で担保）。
- C-02: 取得スクリプトはレート制限順守（過負荷アクセス禁止）。

## 9. リスク
- RISK-001: API仕様変更で取得スクリプトが壊れる → 取得部を関数分離＋スキーマ検証で早期検知。
- RISK-002: データ古さ（手動更新）→ 取得日を明示＋V2で自動化。
- RISK-003: 429多発で取得長時間化 → 増分キャッシュ＋バックオフ（FR-FETCH-002/003）。
