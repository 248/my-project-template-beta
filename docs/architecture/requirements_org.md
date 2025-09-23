# 要件定義書（v0.4）— Template Beta（OpenNext × Cloudflare × Supabase）

## 0. 目的 / 背景

* Web アプリケーション開発用のプロジェクトテンプレートとして活用し、後続の開発の効率化を図る。
* フロントとバックを **Cloudflare Workers** 上に集約し、**Supabase (Auth + Postgres + Storage)** をバックエンドの中核に据える。
* 最初は **「結合（1 Worker）」＋ヘルスチェックのみ**で稼働。
* 次段階として **Supabase 認証を導入**し、「トップページ→ログイン→認証必須のホーム」までを実現する。
* 型安全性を担保するために **OpenAPI 定義から API を生成し、フロントとバックで共通利用**する方針を採用する。
* 境界を曖昧にせず、将来 Go / Python / Hono 等へ移行できるように **論理的二層構成（UI/BFF vs Core）** を維持する。

---

## システム構成（想定）

* **実行基盤**: Next.js (App Router) を OpenNext でビルドし、Cloudflare Workers 上で **1 Worker（結合）** として稼働。静的ファイルは Cloudflare CDN 経由で配信。
* **境界/層**: UI/極薄 API = `apps/web`、業務ロジック = `packages/{bff,core}`。依存は `web → bff → core` の一方向。API 境界は **OpenAPI** が単一の真実。
* **認証/DB/ストレージ**: Supabase (Auth + Postgres + Storage)。RLS を前提に Edge クライアントから呼び出し。
* **キャッシュ/非同期**: 初期は利用しないが、将来的に **KV**（ISR/JSON キャッシュ）と **Queues**（再生成や軽量バッチ処理）を採用可能。
* **画像処理**: 最小構成。必要に応じて Cloudflare Images または Supabase Storage + Next.js loader を追加。
* **ロギング**: pino による構造化ログ。`trace_id`/`user_id` を付与。開発環境は pretty、本番/CI は JSONL。Workers 環境では console.log 互換で出力。
* **型安全**: OpenAPI-First + Zod による契約駆動。契約→生成（型/クライアント）→実装。CI で差分と破壊的変更を検知。
* **デプロイ/CI**: Wrangler + GitHub Actions を利用し、Preview/Production にデプロイ。Secrets は Wrangler 側で管理。
* **将来分離**: `BACKEND_MODE=monolith|service` により、BFF を外部サービス（Hono/Go/Python 等）へ切替可能（HTTP or Service Bindings）。UI/Core は無改修。

---

## 1. スコープ（段階的）

### フェーズ1（MVP-0）

* `/health` (SSR) と `/api/health` (JSON) のみ提供
* CI/CD（Wrangler, GitHub Actions）と Secrets 管理を確立
* Supabase は接続チェックのみに利用可能（ON/OFF可）

### フェーズ2（MVP-1: 認証 + ホーム拡張）

* **認証フロー**: トップページ → ログイン → コールバック → ホーム → ログアウト
* **挙動**: 未認証で `/home` にアクセスすると `/` にリダイレクト。ログイン後は `/home` 表示。
* **ホーム拡張**: `/home` に **バックエンド・ヘルスチェック実行ボタン**を配置。押下で `/api/health` を呼び、結果を画面表示。
* **API 生成**: OpenAPI 契約から型とクライアントを生成し、フロントは生成クライアントを利用。Route Handlers は契約準拠。

### 将来フェーズ

* Cloudflare Queues / KV / Images を利用開始
* バックエンド分離（Service Bindings）や GCP 移行を選択的に実施

---

## 2. 機能要件（MVP-1）

* トップページ: ログインボタン表示
* ログイン: `/auth/login` → Supabase OAuth → `/auth/callback` → セッション発行
* ホームページ: 認証必須、ログイン済のみ閲覧可。ヘルスチェックボタン付き。
* ログアウト: `/auth/logout` でセッション削除
* API 契約: `/api/health` と `/auth/*` は OpenAPI 準拠

---

## 3. 非機能要件

* セッション管理は **Supabase Auth Cookie** を利用
* 認証チェックは **Next.js middleware** で実施
* セキュリティ: Cookie は `HttpOnly, Secure, SameSite=Lax`。Service Role Key はサーバ専用。
* 型安全性（OpenAPI-First）:

  * 契約→生成→実装の順で作業
  * 生成物をフロント/バックで共通利用
  * CI で Lint と Breaking Change 検知を実施
* 入力検証: **Zod** を利用し、OpenAPI スキーマから生成または手動定義して **型と実行時バリデーション**を統一
* ログ: **pino** を利用した構造化ロガーを標準化

  * JSON 出力を基本とし、`trace_id` / `user_id` / `session_id` を付与
  * 開発環境では pretty-print、本番/CI では JSONL 出力
  * Workers 環境では `console.log` 互換で動作
  * PII やシークレットは redact 機能でマスク
* パフォーマンス: `/api/health` 呼び出しは p95 < 300ms を目標。ホームのボタンは Loading/再試行制御を実装。
* 改行コード: **LF** に統一すること（`.gitattributes` で強制）
* テスト: **Vitest** を使用すること
* UI/デザイン: **Tailwind CSS** を利用し、<https://atlassian.design/components/> を参考にしたモダンなデザインとすること
* パッケージ管理: **pnpm** を使用すること（ワークスペース運用）
* Node 22、Wrangler compatibility\_date 固定
* ESLint + Prettier + import整形、lint-staged+pre-commit
* Renovate 導入（minor 自動、major は PR）
* `pnpm dev` で wrangler dev + OpenAPI 生成チェック
* CI matrix で BACKEND\_MODE=monolith|service を両方検証

---

## 4. ディレクトリ構成（MVP-1 時点）

```
openapi/
  openapi.yaml            # API 定義（単一の真実）

apps/web/                 # Next.js (UI + 極薄API)
  app/
    page.tsx              # トップ
    home/page.tsx         # 認証必須（ヘルスチェックボタン付き）
    api/health/route.ts   # JSONヘルス（契約準拠, bff経由）
    health/page.tsx       # SSRヘルス
    auth/
      login/route.ts
      callback/route.ts
      logout/route.ts
  middleware.ts
  next.config.js
  open-next.config.ts
  wrangler.toml

packages/core/             # ビジネスロジック (UI/HTTP非依存, 関数群)
packages/bff/              # BFF層 (OpenAPI契約 ←→ core)
packages/adapters/         # 環境依存実装 (Supabase, Cache, Logger 等)
  supabase-server.ts
packages/contracts/        # 運用ルールや契約規約
packages/generated/
  api-types/               # openapi から生成された型
  api-client/              # openapi から生成されたクライアント
```

---

## 5. 境界管理思想（重要）

* **論理的二層**: UI+極薄API (apps/web) と BFF+Core (packages)
* **契約の単一ソース**: OpenAPI = フロントとバックの境界
* **依存方向**: `web → bff → core` 一方向。逆流禁止
* **禁止事項**:

  * `apps/web` から core を直接呼ばない
  * core から Next.js や fetch など環境依存を import しない
  * Route Handlers 内にビジネスロジックを書かない（必ず bff 経由）
* **モード切替**:

  * `BACKEND_MODE=monolith` → bff を直呼び（同一Worker）
  * `BACKEND_MODE=service` → 生成クライアントで外部サービス呼び出し（Hono/Go/Python 等）
  * 将来の分離は apiClient 実装切替で完結
* **CIガード**:

  * import ルールで依存方向違反を検出
  * OpenAPI の breaking change 検出
  * Zod による入出力バリデーションの自動テスト

---

## 6. テスト観点

* `/health` SSR/JSON が応答
* 認証フロー（トップ→ログイン→ホーム→ログアウト）が機能
* ホームのヘルスチェックボタンが `/api/health` を叩き、結果表示（Loading, OK/Degraded/Down, 再試行）
* OpenAPI コントラクトテスト: 生成クライアントで型安全に呼べること
* Zod バリデーション: 不正入力が 422 で弾かれる

---

## 7. マイルストーン

**M1: ヘルスチェック**

* `/health` と `/api/health` が稼働
* CI/CD 整備（Wrangler一本化）
* OpenAPI 初期化と型/クライアント生成

**M2: 認証 + ホーム拡張**

* Supabase Auth が疎通
* 認証フローが機能
* ホームにヘルスチェックボタン実装
* OpenAPI に `/auth/*` を追加し型付け
* Zod 検証を組み込み

---

## 8. API 契約/型安全性（OpenAPI-First + Zod）

* **変更手順**: 契約 → 生成 → 実装 → テスト
* **ツールチェーン**:

  * openapi-typescript（型）
  * orval（fetchクライアント）
  * @redocly/cli（Lint/差分検出）
  * openapi-zod-client（Zodスキーマ生成, 必要に応じて）
* **検証**:

  * Route Handlers で Zod による入力/出力バリデーションを必須化
  * 生成クライアントでコントラクトテストを実施
* **バージョニング**: SemVer。破壊的変更はメジャー＋deprecated 期間
* **公開**: Redoc/Scalar プレビューを任意で提供

---

## 9. 境界設計ポリシー（BFF/層分離と2モード）

### 9.1 層構造と依存方向

```
openapi/                 # 契約
packages/generated/      # 契約から生成された型/クライアント
packages/core/           # ドメイン/ユースケース（UI/HTTPに非依存）
packages/adapters/       # 環境依存（Supabase, Cache, Logger 等）
packages/bff/            # API I/O（契約 ←→ core）
apps/web/                # Next.js（UI と極薄API）
```

* **apps/web** は UI と薄い I/O のみ。ビジネスロジックは **bff** に置く。
* **core** は純粋関数。HTTP/Next を import しない。
* 依存方向は \`\` の一方向。ESLint でガード。

### 9.2 2モード切替

* `BACKEND_MODE=monolith|service` を導入。

  * monolith: `/api/*` は bff を直呼び（同一Worker内）
  * service: `/api/*` は 生成クライアントで外部サービス呼び出し（Hono/Go/Python 等）または Service Bindings
* 切替は **apiClient adapter** に集約。UI/core は無改修。

### 9.3 禁止事項

* `apps/web` から core を直接呼ばない
* core から Next.js や fetch 等を import しない
* Route Handlers 内にビジネスロジックを書かない（I/O変換＋Zod検証のみ）
* 外部 I/O は adapters に退避

### 9.4 CI/レビュー担保

* 依存方向リンターで層違反検出
* OpenAPI breaking change チェック
* コントラクトテストで型一致検証
* monolith/service 両モードでビルド・テスト

---

## 10. ローカル開発要件（Workers ローカル起動）

* **単一コマンド起動**: ローカルで **Workers を起動**し、\*\*フロント（`/`、`/home`）とバック（`/api/*`）を同一プロセスで動作確認できること。

  * 例: `wrangler dev` 相当。ホットリロード（UI/Route Handlers の変更が即時反映）。
* **実行モード切替**: 環境変数だけで `BACKEND_MODE=monolith|service` を切替可能。コード改変なしで両モード検証できること。
* **環境変数の取り回し**: ローカル専用の変数定義（例: `.dev.vars`）で以下を管理できること。

  * `SUPABASE_URL`, `SUPABASE_ANON_KEY`（未設定時は **モック/疎通スキップ** が選べる）
  * `BACKEND_BASE_URL`（service モード時の呼び先。未設定なら失敗が明示される）
  * `LOG_LEVEL`, `CHECK_SUPABASE`, `BACKEND_MODE`
* **OpenAPI 同期**: ローカル起動時に **契約→生成（型/クライアント）** を自動 or 事前に実行し、生成物のズレがあれば起動を警告/失敗にできること。
* **Zod 検証**: Route Handlers で **入力/出力の Zod バリデーション**が有効（開発時に型乖離を早期検知）。
* **ログ**: `pino` を **pretty-print** で出力（本番差異は JSONL）。`trace_id` を開発時にも付与。
* **CORS/同一オリジン**: ローカルは同一オリジン前提。必要に応じて `localhost` の複数ポートを許可できること。
* **KV/Queues エミュレーション（任意）**: 将来利用に備え、ローカルで **KV/Queues をエミュレート**できること（無効でも起動成功）。

### 受け入れ基準（Local Dev）

* [ ] 1コマンドで起動し、`/health` と `/api/health` が動作する
* [ ] 認証フロー（Supabase 実 or モック）がローカルで通る
* [ ] `BACKEND_MODE` を切り替えても UI 側のコード変更なしで挙動が変わる
* [ ] pino のログがコンソールに整形表示され、`trace_id` が出力される
* [ ] OpenAPI 生成物の未更新がある場合は起動時に検知できる
