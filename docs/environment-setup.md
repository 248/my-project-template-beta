# 環境設定ガイド

## 概要

このドキュメントでは、Cloudflare Workers環境での開発・デプロイに必要な環境設定について説明します。

## 環境変数の優先順位

環境変数は以下の優先順位で適用されます：

1. **CI環境変数** (GitHub Actions secrets)
2. **wrangler secret** (本番/プレビュー環境)
3. **.dev.vars** (ローカル開発環境)
4. **process.env** (システム環境変数)
5. **wrangler.toml [vars]** (デフォルト値)

## ローカル開発環境の設定

### 1. .dev.vars ファイルの作成

```bash
# .dev.vars.example をコピーして .dev.vars を作成
cp .dev.vars.example .dev.vars
```

### 2. 必要な環境変数の設定

`.dev.vars` ファイルを編集して、実際の値を設定してください：

```bash
# アプリケーション設定
NODE_ENV=development
BACKEND_MODE=monolith
NEXT_PUBLIC_APP_URL=http://localhost:8787

# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ログ設定
LOG_LEVEL=info
PINO_LOG_LEVEL=info

# パフォーマンス設定
DEFAULT_TIMEOUT_MS=5000
HEALTH_CHECK_TIMEOUT_MS=3000

# 開発用設定
ENABLE_PERFORMANCE_LOGGING=true
ENABLE_DEBUG_LOGGING=true
```

## BACKEND_MODE の切替

### monolith モード（デフォルト）

```bash
# 同一Worker内でBFFサービスを直接呼び出し
pnpm dev:monolith
```

### service モード

```bash
# 外部APIサービスを呼び出し（将来のマイクロサービス分離用）
pnpm dev:service
```

## 開発コマンド

### 基本的な開発

```bash
# OpenAPI生成チェック + wrangler dev
pnpm dev

# monolithモードで開発
pnpm dev:monolith

# serviceモードで開発
pnpm dev:service
```

### ビルドとテスト

```bash
# 開発用ビルド（Windows環境対応）
pnpm build:dev

# 本番用ビルド
pnpm build

# 型チェック
pnpm type-check

# テスト実行
pnpm test
```

### OpenAPI関連

```bash
# OpenAPI生成
pnpm generate

# OpenAPI生成チェック
pnpm generate:check

# OpenAPI Lint
pnpm openapi:lint
```

## デプロイ環境の設定

### プレビュー環境

```bash
# プレビュー環境にデプロイ
wrangler deploy --env preview

# Secretsの設定
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env preview
```

### 本番環境

```bash
# 本番環境にデプロイ
wrangler deploy --env production

# Secretsの設定
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
```

## トラブルシューティング

### Windows環境でのシンボリックリンクエラー

```bash
# 開発用ビルドを使用（standaloneモードを無効化）
NODE_ENV=development pnpm --filter web build

# または
pnpm build:dev
```

### 環境変数の確認

```bash
# 環境設定の検証
node -e "
const { validateEnvConfig } = require('./packages/adapters/dist/index.js');
validateEnvConfig();
"
```

### wrangler dev の問題

```bash
# wranglerのログレベルを上げる
wrangler dev --env development --log-level debug

# ポートが使用中の場合
wrangler dev --env development --port 8788
```

## CI/CD設定

### GitHub Actions Secrets

以下のSecretsをGitHub Actionsに設定してください：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 環境別設定

```yaml
# .github/workflows/deploy.yml
env:
  BACKEND_MODE: ${{ matrix.backend-mode }}
  NODE_ENV: ${{ matrix.environment }}

strategy:
  matrix:
    backend-mode: [monolith, service]
    environment: [preview, production]
```

## セキュリティ注意事項

1. **.dev.vars は .gitignore に含まれています** - 機密情報を安全に管理
2. **Service Role Key は wrangler secret で管理** - 本番環境では必須
3. **ログ出力時のPII/シークレットマスク** - pino redact機能を使用
4. **環境変数の検証** - 起動時に必須変数をチェック

## 参考リンク

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenNext Documentation](https://open-next.js.org/)
