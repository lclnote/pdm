# PDM システムフロー図

```mermaid
graph TB
  subgraph "認証・権限"
    A[ログイン] --> B{ロール判定}
    B -->|管理者| C[全操作可能]
    B -->|PM| D[自プロジェクト管理]
    B -->|サブリーダー| E[配下タスク管理]
    B -->|作業者| F[自身のタスク操作]
    B -->|閲覧者| G[閲覧のみ]
  end

  subgraph "プロジェクト管理"
    C --> H[プロジェクト作成]
    D --> H
    H --> I[フェーズ定義]
    I --> J{直列/並列}
    J -->|直列| K[Phase1→Phase2→...]
    J -->|並列| L[Phase1 & Phase2 同時実行]
  end

  subgraph "タスク管理"
    K --> M[ルートタスク作成]
    L --> M
    M --> N[子タスク作成]
    N --> O[孫タスク作成]
    O --> P{状態遷移}
    P -->|依存完了| Q[未着手→着手可能]
    P -->|担当者| R[着手可能→着手]
    P -->|成果物完了＋承認| S[着手→完了]
    P -->|PM| T[保留/中断]
  end

  subgraph "依存関係・スケジュール"
    Q --> U[依存関係設定 FS/SS/FF/SF]
    U --> V[ガントチャート表示]
    V --> W[クリティカルパス算出]
    W --> X[日程調整]
  end

  subgraph "成果物・リスク"
    S --> Y[成果物アップロード]
    Y --> Z[レビュー→承認]
    Z --> S
    R --> RA[リスク登録]
    RA --> RB[対応策設定]
    RB --> RC[ヒートマップ表示]
    RC -->|顕在化| RD[課題変換]
  end

  subgraph "ダッシュボード・レポート"
    V --> DB[進捗ダッシュボード]
    S --> DB
    RC --> DB
    DB --> RE[週次レポート自動生成]
    DB --> EX[CSV/PDFエクスポート]
  end

  style A fill:#4a90d9,color:#fff
  style H fill:#4a90d9,color:#fff
  style M fill:#4a90d9,color:#fff
  style DB fill:#4a90d9,color:#fff
```
