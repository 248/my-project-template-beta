# 開発環境セットアップガイド

## 前提条件

- Node.js 22
- pnpm 9.0.0以上

## セットアップ手順

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

#### Next.js開発環境用

`apps/web/.env.local`ファイルを作成：

```bash
# Next.js 開発環境用の環境変数
NODE_ENV=development
BACKEND_MODE=monolith
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase設定（実際の値に置き換えてください）
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

#### Cloudflare Workers開発環境用

`.dev.vars`ファイルを作成（`.dev.vars.example`をコピー）：

```bash
cp .dev.vars.example .dev.vars
```

### 3. 開発サーバーの起動

#### Next.js開発サーバー（推奨）

```bash
pnpm dev
```

または

```bash
pnpm --filter web dev:next
```

#### Cloudflare Workers開発サーバー

```bash
pnpm dev:wrangler
```

## 開発環境の確認

### ヘルスチェックAPI

```bash
curl http://localhost:3000/api/health
```

### トップページ

ブラウザで `http://localhost:3000` にアクセス

## トラブルシューティング

### 1. TypeScriptビルドエラー

```bash
pnpm run build:packages
```

### 2. 生成ファイルの同期エラー

```bash
pnpm run generate
```

### 3. 認証セッションエラー

開発環境では認証していない状態でのエラーは正常です。
`[MIDDLEWARE_SESSION_ERROR] { error: 'Auth session missing!' }`は無視してください。

### 4. Windowsでのシンボリックリンクエラー

```bash
# 開発用ビルドを使用
pnpm run build:dev
```

## 利用可能なコマンド

### 開発

- `pnpm dev` - Next.js開発サーバー起動
- `pnpm dev:monolith` - monolithモードで起動
- `pnpm dev:service` - serviceモードで起動

### ビルド

- `pnpm build` - 本番ビルド
- `pnpm build:dev` - 開発ビルド（Windows対応）
- `pnpm build:packages` - パッケージのみビルド

### テスト

- `pnpm test` - 全テスト実行
- `pnpm test:e2e` - E2Eテスト実行

### コード品質

- `pnpm lint` - ESLint実行
- `pnpm format` - Prettier実行
- `pnpm type-check` - TypeScript型チェック

### API生成

- `pnpm generate` - OpenAPIから型とクライアント生成
- `pnpm generate:check` - 生成ファイルの同期確認
