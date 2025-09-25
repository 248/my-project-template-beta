# 要件文書

## はじめに

この機能は、Next.js（App Router）をOpenNextでビルドし、Cloudflare Workers上で動作するWebアプリケーション開発用のプロジェクトテンプレートを構築することです。Supabase（Auth + Postgres + Storage）をバックエンドの中核とし、OpenAPI定義から型安全なAPIを生成する方針を採用します。段階的な開発により、最初はヘルスチェック機能のみを提供し、次段階で認証機能を導入します。

## 要件

### 要件1：基本システム構成の確立

**ユーザーストーリー:** 開発者として、Cloudflare Workers上で動作するNext.jsアプリケーションの基盤を構築したい。これにより、効率的なWebアプリケーション開発のテンプレートを提供できる。

#### 受け入れ基準

1. WHEN Next.jsアプリケーションをOpenNextでビルドする THEN Cloudflare Workers上で1つのWorkerとして稼働すること
2. WHEN 静的ファイルを配信する THEN Cloudflare CDN経由で配信されること
3. WHEN システム構成を確認する THEN UI/極薄API（apps/web）と業務ロジック（packages/{bff,core}）の論理的二層構成が維持されていること
4. WHEN 依存関係を確認する THEN web → bff → coreの一方向依存が保たれていること

### 要件2：フェーズ1（MVP-0）のヘルスチェック機能

**ユーザーストーリー:** システム管理者として、アプリケーションの稼働状況を確認したい。これにより、システムの健全性を監視できる。

#### 受け入れ基準

1. WHEN `/health`にアクセスする THEN SSR形式でヘルスチェック結果が表示されること
2. WHEN `/api/health`にアクセスする THEN JSON形式でヘルスチェック結果が返却されること
3. WHEN Supabaseとの接続をチェックする THEN 接続状況がON/OFF切替可能であること

### 要件3：CI/CDとSecrets管理の確立

**ユーザーストーリー:** 開発者として、自動化されたデプロイメントパイプラインを利用したい。これにより、安全で効率的な開発・運用ができる。

#### 受け入れ基準

1. WHEN コードをプッシュする THEN GitHub Actionsによる自動ビルドが実行されること
2. WHEN デプロイを実行する THEN WranglerによりPreview/Productionにデプロイされること
3. WHEN Secretsを管理する THEN Wrangler側で安全に管理されること
4. WHEN 依存関係を更新する THEN Renovateによりminorは自動、majorはPRで管理されること

### 要件4：フェーズ2（MVP-1）の認証機能

**ユーザーストーリー:** エンドユーザーとして、安全にログインしてアプリケーションを利用したい。これにより、個人化されたサービスを受けられる。

#### 受け入れ基準

1. WHEN トップページにアクセスする THEN ログインボタンが表示されること
2. WHEN ログインボタンをクリックする THEN `/auth/login` → Supabase OAuth → `/auth/callback` → セッション発行の流れが実行されること
3. WHEN 未認証で`/home`にアクセスする THEN `/`にリダイレクトされること
4. WHEN 認証済みで`/home`にアクセスする THEN ホームページが表示されること
5. WHEN ログアウトする THEN `/auth/logout`でセッションが削除されること

### 要件5：ホーム拡張機能

**ユーザーストーリー:** 認証済みユーザーとして、システムのヘルスチェックを実行したい。これにより、システム状況をリアルタイムで確認できる。

#### 受け入れ基準

1. WHEN ホームページにアクセスする THEN バックエンド・ヘルスチェック実行ボタンが表示されること
2. WHEN ヘルスチェックボタンを押下する THEN `/api/health`が呼び出されること
3. WHEN ヘルスチェック結果を受信する THEN OK/Degraded/Downの結果が画面に表示されること

### 要件6：OpenAPI契約とAPI生成

**ユーザーストーリー:** 開発者として、型安全なAPI開発を行いたい。これにより、フロントエンドとバックエンド間の契約を明確にし、開発効率を向上させる。

#### 受け入れ基準

1. WHEN OpenAPI定義を作成する THEN 単一の真実として機能すること
2. WHEN API型を生成する THEN openapi-typescriptにより型が生成されること
3. WHEN APIクライアントを生成する THEN orvalによりfetchクライアントが生成されること
4. WHEN フロントエンドでAPIを呼び出す THEN 生成されたクライアントを利用すること
5. WHEN Route Handlersを実装する THEN OpenAPI契約に準拠すること

### 要件7：セキュリティとセッション管理

**ユーザーストーリー:** システム管理者として、安全なセッション管理を実装したい。これにより、ユーザーデータを保護できる。

#### 受け入れ基準

1. WHEN 認証チェックを実行する THEN Next.js middlewareで実施されること

### 要件8：入力検証機能

**ユーザーストーリー:** 開発者として、堅牢な入力検証を実装したい。これにより、システムの信頼性を向上させる。

#### 受け入れ基準

1. WHEN 入力検証を実行する THEN Zodを利用した型と実行時バリデーションが統一されること

### 要件9：ローカル開発環境

**ユーザーストーリー:** 開発者として、効率的なローカル開発環境を利用したい。これにより、開発生産性を向上させる。

#### 受け入れ基準

1. WHEN OpenAPI同期を確認する THEN 契約→生成の自動実行または事前実行が可能であること
2. WHEN 生成物にズレがある THEN 起動時に警告または失敗が表示されること

### 要件10：テスト機能

**ユーザーストーリー:** 開発者として、包括的なテストを実行したい。これにより、システムの品質を保証できる。

#### 受け入れ基準

1. WHEN ヘルスチェックをテストする THEN `/health` SSR/JSONが応答すること
2. WHEN 認証フローをテストする THEN トップ→ログイン→ホーム→ログアウトが機能すること
3. WHEN ホーム機能をテストする THEN ヘルスチェックボタンが`/api/health`を呼び、結果表示（Loading, OK/Degraded/Down, 再試行）が機能すること
4. WHEN OpenAPIコントラクトをテストする THEN 生成クライアントで型安全に呼べること
5. WHEN Zodバリデーションをテストする THEN 不正入力が422で弾かれること

## 非機能要件

### 性能

- `/api/health`呼び出しは**p95 < 300ms**を目標とする
- ホーム画面のヘルスチェックボタンは**Loading表示・再試行制御**を実装する

### セキュリティ

- セッション管理は**Supabase Auth Cookie**を利用
- Cookie設定は**HttpOnly / Secure / SameSite=Lax**とする
- Service Role Keyはサーバー専用で管理する
- ログ出力は**pino**を利用し、**PIIやシークレットはredact機能でマスク**する

### 信頼性・保守性

- OpenAPI-Firstで契約→生成→実装を統一
- Zodによる**入力/出力バリデーションを必須化**

### 運用・開発体験

- **改行コードはLF統一**（ビルド環境間での互換性のため）
- **pnpmワークスペース運用**（モノレポ管理の効率化）
- **Node 22固定**、Wrangler compatibility_date固定（環境統一）
- ローカル開発は**単一コマンド起動** + **環境変数によるモード切替**
- **ホットリロード機能**でコード変更が即時反映
- **.dev.vars**でローカル専用変数を管理

### テスト・品質保証

- **Vitest**を使用したテスト実行
- ESLint + Prettier + lint-stagedによりコード品質を担保
- CI/CDで**Breaking Change検知・層違反検出**を行う

> **注記**: 本非機能要件はMVP-1（フェーズ2）までを対象とします。将来フェーズでの拡張要件は別途定義します。

## 開発規約

### コーディング規約

1. **UI/デザイン**: Tailwind CSSを利用し、https://atlassian.design/components/ を参考にしたモダンなデザインとすること
2. **実装ルール**: .gitattributesでLF改行コードを強制、ESLint + Prettier + import整形、lint-staged+pre-commit
3. **CI検証**: CIマトリクスでBACKEND_MODE=monolith|serviceを両方検証

### 開発コマンド

1. **開発起動**: `pnpm dev`でwrangler dev + OpenAPI生成チェック
2. **依存関係管理**: Renovate導入（minor自動、majorはPR）

## 境界設計ポリシー

### 層構造と依存方向

```
openapi/                 # 契約
packages/generated/      # 契約から生成された型/クライアント
packages/core/           # ドメイン/ユースケース（UI/HTTPに非依存）
packages/adapters/       # 環境依存（Supabase, Cache, Logger 等）
packages/bff/            # API I/O（契約 ←→ core）
apps/web/                # Next.js（UI と極薄API）
```

### 禁止事項

1. `apps/web`からcoreを直接呼ばない
2. coreからNext.jsやfetch等を import しない
3. Route Handlers内にビジネスロジックを書かない（I/O変換＋Zod検証のみ）
4. 外部I/Oはadaptersに退避

### 2モード切替

- `BACKEND_MODE=monolith|service`を導入
  - monolith: `/api/*`はbffを直呼び（同一Worker内）
  - service: `/api/*`は生成クライアントで外部サービス呼び出し（Hono/Go/Python等）またはService Bindings
- 切替は**apiClient adapter**に集約。UI/coreは無改修

### CI/レビュー担保

1. 依存方向リンターで層違反検出
2. OpenAPI breaking changeチェック
3. コントラクトテストで型一致検証
4. monolith/service両モードでビルド・テスト

## 将来フェーズ

### フェーズ3以降の拡張

1. **Cloudflare機能拡張**
   - KV（ISR/JSONキャッシュ）
   - Queues（再生成や軽量バッチ処理）
   - Images（画像処理）

2. **バックエンド分離**
   - Service Bindingsによる外部サービス連携
   - Hono/Go/Python等への移行対応

3. **プラットフォーム移行**
   - GCP移行の選択的実施
   - マルチクラウド対応

### 拡張時の設計原則

1. UI/Core層は無改修で拡張可能
2. 契約（OpenAPI）の後方互換性維持
3. 段階的移行によるリスク最小化
