# review-log.md — 非対称レビュー & GO判定（V1）

## Round 1

### Codex役（実装可能性/テスト可能性/破壊防止/CI破綻）
| ID | 指摘 | 分類 | 対応 |
|---|---|---|---|
| REV-R1-001 | 業種の区切りを「、」で分割すると正式名称（例「医療、福祉」）が壊れる | Blocker | 修正済: スラッシュ区切りに変更＋テスト追加（filters.js/tests） |
| REV-R1-002 | ブラウザ直接API呼び出しはレート制限/CORSで破綻リスク | Must | 設計で回避済: 事前JSON化（ADR-001）。public/に外部fetchなしをgrep検証 |
| REV-R1-003 | 取得スクリプトの429で処理が中断しうる | Must | 指数バックオフ＋増分キャッシュ実装（FR-FETCH-002/003）。全件取得を実走で確認 |
| REV-R1-004 | ユーザー入力のDOM挿入でXSS | Must | textContentのみ使用（innerHTML不使用をgrep検証, NFR-SEC-001） |

### Opus役（事業/運用/法務/MVP境界/非エンジニア運用）
| ID | 指摘 | 分類 | 対応 |
|---|---|---|---|
| REV-R1-005 | データが古くなると誤解を招く | Must | 取得日をフッターに常時表示（FR-VIEW-003）＋非公式ディスクレーマ |
| REV-R1-006 | jGrantsデータの再利用可否（法務） | Must | 公共データ利用規約（≒CC BY）＝出典表示で可。出典表示を実装（EV-JGRANTS-004） |
| REV-R1-007 | 運営者が更新手順を回せるか | Should | README/CLAUDE.mdに更新運用手順を明記。`node fetch-data.js`のみで完結 |
| REV-R1-008 | 募集中対象で325件はカバレッジ十分か | Later | V1は妥当。V2でキーワード拡張・自治体追加（DEFER） |

## Round 2
- Round1のBlocker(REV-R1-001)修正後、単体12/12・E2E全PASSを再確認。新規Blockerなし。

## 再リサーチ変換（黄金ルール#5）
- REV-R1-001 → 業種データ構造を実データで再確認（日本標準産業分類の大分類・区切りは「 / 」）→ SDD/CLAUDE.mdに反映。
- REV-R1-003 → レート制限の実挙動を一次調査（EV-JGRANTS-003）→ バックオフ値に反映。

## GO判定チェック（全て満たすまで進まない）
- [x] Blocker = 0
- [x] 全Must要件にAC・TC接続（TEST_PLANトレーサビリティ）
- [x] 外部依存の規約確認済（公共データ利用規約＝出典表示で可）
- [x] 破壊的操作の制御（本ツールは読み取り専用GET＋ローカル生成のみ。JSON書換に--dry-run提供）
- [x] CI最低ゲート: 単体テスト緑（12/12）、依存ゼロでbuild不要、lint相当=静的検査PASS
- [x] E2E全PASS（E2E_SCENARIOS）
- [x] 法令整合（出典表示・非公式明示）

## 判定: **GO / RYG=Green**
- 但し書き: 本番公開前に `node fetch-data.js` で全件データを生成し `public/data/subsidies.json` を最新化すること（運用手順）。
