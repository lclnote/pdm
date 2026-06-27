# PDM 実装状況・難易度順リスト

凡例: ✅ 完了 / 🔶 一部実装 / ❌ 未着手

---

## Level 0: 最優先

| # | 機能 | Backend | Frontend | 作業内容 |
|---|------|---------|----------|----------|
| 0 | **多言語化 (i18n)** | ✅ | ✅ | react-i18next導入、全UI文字列をkey管理、en/ja対応、言語切替UI追加 |

## Level 1: 超簡単（既存画面の小修正のみ）

| # | 機能 | Backend | Frontend | 作業内容 |
|---|------|---------|----------|----------|
| 1 | **課題 編集・削除** | ✅ | ✅ | IssuesPageにEditモーダル・Deleteボタン・担当者選択・状態変更・多言語化・モバイルカード表示追加 |
| 2 | **リスク 編集・削除** | ✅ | ✅ | RisksPageにEditモーダル・Deleteボタン・ステータス管理・多言語化・モバイルカード表示追加 |
| 3 | **タスク重み表示** | ✅ | 🔶 | TasksPageの詳細パネル・編集モーダルにweight表示/編集追加 |
| 4 | **タスク実績工数** | ✅ | 🔶 | TasksPageの編集モーダルにactual_hours入力追加 |
| 5 | **Phaseゲート申請ボタン** | ✅ | 🔶 | PhasesPageにGate Requestボタン追加 |

## Level 2: 簡単（新規endpoint + 既存画面拡張）

| # | 機能 | Backend | Frontend | 作業内容 |
|---|------|---------|----------|----------|
| 6 | **タスク協力者** | 🔶 | ❌ | TaskCollaboratorルーター追加（モデル・スキーマ既存）→ TasksPageに協力者追加UI |
| 7 | **リスク対応策** | 🔶 | ❌ | RiskCountermeasureルーター追加（モデル・スキーマ既存）→ RisksPageに対応策UI |
| 8 | **進捗計算方式切替** | ✅ | 🔶 | Project編集画面にprogress_calc_method選択追加（task_count/hour） |

## Level 3: 中程度（新規ページ、APIは概ね既存）

| # | 機能 | Backend | Frontend | 作業内容 |
|---|------|---------|----------|----------|
| 9 | **申請管理画面** | ✅ | ❌ | ApplicationsPage新規作成（一覧・承認/却下UI） |
| 10 | **プロジェクトメンバー管理** | ✅ | ❌ | ProjectMembersPage新規作成（招待・ロール割当） |
| 11 | **成果物管理画面** | ✅ | ❌ | DeliverablesPage新規作成（一覧・作成・レビュー提出） |
| 12 | **課題コメントUI** | ✅ | ❌ | IssuesPageにコメントスレッド追加 |

## Level 4: やや難しい（新規機能・非自明）

| # | 機能 | Backend | Frontend | 作業内容 |
|---|------|---------|----------|----------|
| 13 | **フェーズ並べ替えUI** | ✅ | 🔶 | PhasesPageにドラッグ&ドロップ並び替え（sort_order更新） |
| 14 | **検索・フィルタ** | 🔶 | ❌ | 横断検索バー + 状態/担当者/期限フィルタ（backend要エンドポイント追加） |
| 15 | **タスクテンプレート** | ❌ | ❌ | テンプレート保存/適用機能（モデル・API・画面すべて新規） |

## Level 5: 難しい（大規模・外部ライブラリ依存）

| # | 機能 | Backend | Frontend | 作業内容 |
|---|------|---------|----------|----------|
| 16 | **ガントチャート** | ✅ | ❌ | dhtmlx-gantt導入 + 依存関係矢線 + クリティカルパス |
| 17 | **課題カンバン** | ✅ | ❌ | 状態別カンバンボード（react-beautiful-dnd等） |
| 18 | **レポート/エクスポート** | ❌ | ❌ | PDF/CSV生成API、メール配信機能 |
| 19 | **通知機能** | ❌ | ❌ | WebSocket/DBポーリング + 通知一覧画面 |
| 20 | **リスク→課題自動変換** | ❌ | ❌ | リスク状態="発生"時にIssue自動作成トリガー |
| 21 | **カレンダー連携** | ❌ | ❌ | 営業日カレンダー、休日設定、稼働日計算 |
| 22 | **SSO連携** | ❌ | ❌ | OAuth/OpenID Connect対応 |

---

## 全機能サマリー

### バックエンド
| モジュール | 状態 | 備考 |
|-----------|------|------|
| User CRUD | ✅ | 全エンドポイント実装済み |
| Auth (JWT) | ✅ | ログイン・トークン認証 |
| Project CRUD | ✅ | メンバー管理含む |
| Phase CRUD | ✅ | ゲート申請含む |
| Task CRUD | ✅ | 3階層、状態機械、依存関係 |
| TaskCollaborator | 🔶 | モデル・スキーマのみ、ルーターなし |
| Risk CRUD | ✅ | 優先度自動計算 |
| RiskCountermeasure | 🔶 | モデル・スキーマのみ、ルーターなし |
| Issue CRUD | ✅ | コメント含む |
| Application | ✅ | 作成・承認・却下 |
| Deliverable CRUD | ✅ | レビュー提出含む |
| Dashboard | ✅ | 進捗率・統計サマリー |

### フロントエンド
| ページ | 状態 | 備考 |
|-------|------|------|
| LoginPage | ✅ | JWT認証、localStorage保存 |
| Layout (Sidebar) | ✅ | レスポンシブ、ハンバーガーメニュー |
| ProjectsPage | ✅ | CRUD + 日付警告 + 開始日ソート |
| ProjectDashboardPage | ✅ | 進捗バー + 統計 + フェーズ一覧 + 日付警告 |
| PhasesPage | ✅ | CRUD + 日付警告 + 開始日ソート |
| TasksPage | ✅ | ツリー表示 + CRUD + 状態変更 + 日付警告 + 親タスク自動補完 + 開始日ソート |
| RisksPage | ✅ | CRUD + ステータス管理 + 多言語化 + モバイルカード表示 |
| IssuesPage | ✅ | CRUD + 担当者選択 + 多言語化 + モバイルカード表示 |
| ApplicationsPage | ❌ | 未作成 |
| DeliverablesPage | ❌ | 未作成 |
| MembersPage | ❌ | 未作成 |
| i18n (多言語化) | ✅ | react-i18next導入、全UI文字列キー管理、en/ja対応、言語切替ボタン実装済み |
