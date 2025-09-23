# バックエンド分離・移行プレイブック（Hono / Go / Python）

> 本書は **LiveTrip Diary** の将来的な「バックエンドを別サービスへ分離」する際の**実務手順書**です。現行は **OpenNext×Workers（monolith）**。ここで定義する切替は **`BACKEND_MODE=service`** への移行を指します。

---

## 0. 目的と前提

- **目的**: UI（Next.js）とバックエンド（BFF/core）を**論理境界**のまま物理分離し、Hono / Go / Python いずれでも運用可能にする。
- **前提**:
  - API契約は **OpenAPI** が単一の真実（contract first）。
  - UI→バックエンド呼び出しは **生成クライアント**経由（orval など）。
  - ドメインロジックは `packages/core` に閉じ、I/Oは `packages/bff`（または新サービス側）で実装。
  - 切替スイッチ: `BACKEND_MODE=monolith|service`。

---

## 1. 分離モードの選択肢（どれを採用してもOK）

| モード                 | 実体                           | 通信                          | 向き/特徴                                  |
| ---------------------- | ------------------------------ | ----------------------------- | ------------------------------------------ |
| **A. Hono on Workers** | Cloudflare Workers（別Worker） | **Service Bindings** or HTTPS | 同インフラ内・低レイテンシ、JSで移行が容易 |
| **B. Go サービス**     | Cloud Run / Fly.io / VPS 等    | HTTPS（S2S 認証）             | 高速・静的バイナリ、CPU/メモリの自由度     |
| **C. Python サービス** | Cloud Run / Functions          | HTTPS（S2S 認証）             | AI/データ処理との親和性、ライブラリ豊富    |

> どのモードでも **OpenAPI 合意**と **apiClient 実装差し替え**で UI は無改修。

---

## 2. 決定基準（クイック）

- **JS資産再利用重視** → A: Hono
- **低レイテンシ×簡便**（Workersで閉じる） → A: Hono + Service Bindings
- **CPU/メモリ自由度・ネイティブ性能** → B: Go
- **AI/データサイエンス堅牢化** → C: Python

---

## 3. 共通移行ステップ（全モード共通）

1. **契約の固定**: `openapi/openapi.yaml` を凍結（必要差分のみ）。Redoc/Scalarで確認。
2. **apiClient の切替点を1箇所に集約**: `packages/adapters/apiClient/{direct,http}` で実装を二系統用意。
3. **`BACKEND_MODE=service` のCI matrix** を追加（monolith と service の両方を常時テスト）。
4. **S2S 認証方式を決定**: OIDC JWT（推奨） or 固定API Key + IP allowlist。
5. **観測の共通化**: trace-id 相関ヘッダ（`x-trace-id` など）を UI→API→DB へ継承。
6. **段階リリース計画**: 1% → 10% → 50% → 100%（機能フラグ or ヘッダベースで分岐）。
7. **ロールバック手順**: `BACKEND_MODE=monolith` に戻すだけで復旧できることを事前検証。

---

## 4. A: Hono on Workers（Service Bindings）

### 4.1 概要

- バックエンドを **別Workersサービス**としてデプロイ。UI側 Workers から **Service Bindings** で内部呼び出し。
- CORS・認可はUI側で一元化でき、**外部非公開**運用が可能。

### 4.2 設定・配線

- Workers の `wrangler.toml` に `[[services]]` を追加（UI → backend）。
- `BACKEND_BASE_URL` は不要（Bindings 経由）。apiClient は **bindings 実装**で呼ぶ。

### 4.3 認証

- 内部呼び出しのため追加認証は省略可（監査上必要なら**署名ヘッダ**を付与）。

### 4.4 ロールアウト

- まず `/health` `/session/me` など**安全エンドポイント**だけルーティングを切替 → 徐々に /api を移行。

### 4.5 留意

- Workers 制限（サブリクエスト/CPU）を再確認。重い処理は Queues or 別言語に逃がす前段として有効。

---

## 5. B: Go サービス（例: Cloud Run）

### 5.1 概要

- Goで OpenAPI 契約準拠のHTTPサーバを実装。Cloud Run へデプロイ。

### 5.2 S2S 認証（推奨: OIDC）

- UI(Workers) → Cloud Run へ **OIDC 署名付きJWT** を付与。
- Cloud Run 側で受信JWTの **audience/issuer** を検証。

### 5.3 配線

- `BACKEND_BASE_URL=https://<service-url>` をUIに設定。
- apiClient を **HTTP実装**に切替（生成クライアントを用い、`Authorization: Bearer <jwt>`）。

### 5.4 リリース

- カナリア（ヘッダ or ユーザーグループ）で一部のみ Cloud Run 経路へ。

### 5.5 観測

- 構造化ログ（jsonl）に `trace_id`, `user_id(匿名化)` を出力。Workers 側と相関できるようにする。

---

## 6. C: Python サービス（例: Cloud Run / Functions）

### 6.1 概要

- FastAPI / Flask などで OpenAPI 契約に準拠。Cloud Run もしくは Functions に配置。

### 6.2 S2S 認証

- B と同じく OIDC/JWT が基本。短寿命トークン・時刻スキュー許容を明示設定。

### 6.3 配線と依存

- 画像/AI系は Python サービスで処理し、結果だけ返す。大きいファイルは **署名URL** を発行して**直アップロード**を徹底。

---

## 7. コントラクトと型安全

- **OpenAPI を凍結→生成→実装**。PR で breaking change を検知（Redocly）。
- UI/Server双方で **orval 生成クライアント**を使用し、型不一致時はビルド失敗。
- I/O境界で **Zod 検証**（`openapi-zod-client` のスキーマ活用可）。

---

## 8. CI/CD 差分

- **UI**: monolith と service の **matrix ビルド**。service では `BACKEND_BASE_URL` と認証ヘッダ生成を有効化。
- **Backend**: 言語別のビルド＆セキュリティスキャン。OpenAPI 準拠の **E2E 契約テスト**を必須化。

---

## 9. ロールアウト計画（テンプレ）

1. `BACKEND_MODE=service` を **影響の少ない1エンドポイント**で試験（/health）。
2. 内部ユーザーだけに 10% トラフィックを切替（ヘッダ or cookie ベース）。
3. エラーレート/p95/CPUを監視し、閾値を満たせば 50%→100% へ段階拡大。
4. 不良時は `BACKEND_MODE=monolith` へ即時ロールバック（切替の所要時間は<1分を目安に）。

---

## 10. 監視・運用

- **SLO**: エラー率 < 1%、p95 < 300ms（/api/health 基準）。
- **ログ**: 構造化（json）、`trace_id` で UI/Backend を横断可視化。PII は匿名化。
- **メトリクス**: RPS、p50/p95、外形監視（Global/Region）。
- **アラート**: 5分窓でエラー率閾値超過、レイテンシ悪化、5xx急増、認証失敗率。

---

## 11. ロールバック手順（チェックリスト）

- [ ] `BACKEND_MODE=monolith` に戻す。
- [ ] apiClient を direct 実装に固定（feature flag で強制）。
- [ ] 失敗トラフィックの再送要否（冪等性）を確認。
- [ ] 障害事象をタイムライン化し、契約逸脱/負荷/ネットワークを切り分け。

---

## 12. 付録（よくある落とし穴）

- **契約の先祖返り**: UIだけ先に型を更新して serverが未対応 → CIの contract test で防止。
- **CORS/認証の二重管理**: UI側に集約（BFF思想）。
- **巨大ペイロード**: 署名URLで直送。APIはメタデータのみ。
- **trace 断絶**: `traceparent`（W3C Trace Context）を継承する。
- **時刻ズレ**: JWT検証で `clockSkew` を許容。

---

### 最終メモ

- 分離は**構造を変える**のではなく、**配線を切り替える**だけ——この前提を守るために、日常の実装でも **I/O境界の薄さ** と **契約遵守** を徹底すること。
