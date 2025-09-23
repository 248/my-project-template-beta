# GitHub リポジトリセットアップガイド

## 概要

このドキュメントでは、CI/CD パイプラインを有効にするための GitHub リポジトリの設定手順を説明します。

## GitHub Environments の設定

### 1. Environment の作成

GitHub リポジトリの **Settings > Environments** で以下の環境を作成：

#### Preview Environment

- **Name**: `preview`
- **Protection rules**: なし（PR で自動デプロイするため）
- **Environment secrets**: なし（Wrangler secrets を使用）

#### Production Environment

- **Name**: `production`
- **Protection rules**:
  - ✅ Required reviewers: 1人以上
  - ✅ Wait timer: 0 minutes
  - ✅ Restrict pushes to protected branches: `main`
- **Environment secrets**: なし（Wrangler secrets を使用）

### 2. Branch Protection Rules

**Settings > Branches** で `main` ブランチの保護ルールを設定：

```yaml
Branch name pattern: main

Protect matching branches:
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale PR approvals when new commits are pushed
  ✅ Require review from code owners

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  Required status checks:
    - OpenAPI Lint & Breaking Changes
    - Generated Files Sync Check
    - Lint & Format Check
    - Build & Test (monolith)
    - Build & Test (service)
    - Security Audit

✅ Require conversation resolution before merging
✅ Restrict pushes that create files larger than 100MB
✅ Do not allow bypassing the above settings
```

## Secrets の設定

### Repository Secrets

**Settings > Secrets and variables > Actions > Repository secrets** で設定：

| Secret Name             | 説明                     | 取得方法                                       |
| ----------------------- | ------------------------ | ---------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare API トークン  | Cloudflare Dashboard > My Profile > API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID | Cloudflare Dashboard > 右サイドバー            |

### Cloudflare API Token の作成

1. [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) にアクセス
2. "Create Token" をクリック
3. "Custom token" を選択
4. 以下の設定で作成：

```yaml
Token name: GitHub Actions Deploy

Permissions:
  - Cloudflare Workers:Script:Edit
  - Account:Cloudflare Workers:Edit
  - Zone:Zone Settings:Read
  - Zone:Zone:Read

Account Resources:
  - Include: Your Account

Zone Resources:
  - Include: All zones (または特定のドメインのみ)
```

### Cloudflare Account ID の確認

1. Cloudflare Dashboard にログイン
2. 右サイドバーの "Account ID" をコピー

## Wrangler Secrets の設定

### 前提条件

```bash
# Wrangler CLI のインストール
npm install -g wrangler

# Cloudflare にログイン
wrangler login
```

### Preview 環境の設定

```bash
# Supabase URL
wrangler secret put SUPABASE_URL --env preview
# 入力: https://your-project-id.supabase.co

# Supabase Anonymous Key
wrangler secret put SUPABASE_ANON_KEY --env preview
# 入力: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env preview
# 入力: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Production 環境の設定

```bash
# Supabase URL
wrangler secret put SUPABASE_URL --env production
# 入力: https://your-project-id.supabase.co

# Supabase Anonymous Key
wrangler secret put SUPABASE_ANON_KEY --env production
# 入力: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
# 入力: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Secrets の確認

```bash
# 設定済み Secrets の一覧
wrangler secret list --env preview
wrangler secret list --env production
```

## Worker サブドメインの設定

### カスタムサブドメインの設定（オプション）

1. Cloudflare Dashboard > Workers & Pages
2. "Manage custom domains" をクリック
3. カスタムドメインを追加：
   - Preview: `preview.your-domain.com`
   - Production: `app.your-domain.com`

### デフォルトサブドメインの使用

Workers のデフォルト URL を使用する場合：

- Preview: `template-beta-cloudflare-supabase-preview.your-subdomain.workers.dev`
- Production: `template-beta-cloudflare-supabase-prod.your-subdomain.workers.dev`

### ワークフローファイルのURL更新

**重要**: 以下のファイルで `your-subdomain` を実際のCloudflare Workers サブドメインに更新してください：

1. `.github/workflows/deploy-preview.yml`

   ```yaml
   env:
     PREVIEW_URL: 'https://template-beta-cloudflare-supabase-preview.your-actual-subdomain.workers.dev'
   ```

2. `.github/workflows/deploy-production.yml`

   ```yaml
   env:
     PRODUCTION_URL: 'https://template-beta-cloudflare-supabase-prod.your-actual-subdomain.workers.dev'
   ```

3. `.github/workflows/rollback.yml`
   ```yaml
   env:
     PRODUCTION_URL: 'https://template-beta-cloudflare-supabase-prod.your-actual-subdomain.workers.dev'
   ```

**Cloudflare Workers サブドメインの確認方法**:

1. Cloudflare Dashboard > Workers & Pages
2. 既存のWorkerを確認するか、テストデプロイを実行
3. 表示されるURL（例：`your-account.workers.dev`）の `your-account` 部分を使用

## Supabase プロジェクトの設定

### 1. Supabase プロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. "New project" をクリック
3. プロジェクト設定：
   - **Name**: `template-beta-app`
   - **Database Password**: 強力なパスワードを設定
   - **Region**: 最寄りのリージョンを選択

### 2. API Keys の取得

**Settings > API** で以下をコピー：

- **Project URL**: `https://your-project-id.supabase.co`
- **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **service_role**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. OAuth プロバイダーの設定

**Authentication > Providers** で OAuth プロバイダーを設定：

#### GitHub OAuth の例

1. "GitHub" を選択
2. GitHub OAuth App を作成：
   - **Application name**: `Template Beta App`
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-project-id.supabase.co/auth/v1/callback`
3. Client ID と Client Secret を Supabase に設定

### 4. データベーススキーマの設定

```sql
-- ヘルスチェック用のテーブル（オプション）
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ok',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期データの挿入
INSERT INTO health_check (status) VALUES ('ok');
```

## CI/CD パイプラインのテスト

### 1. 初回セットアップの確認

```bash
# リポジトリをクローン
git clone https://github.com/your-username/your-repo.git
cd your-repo

# 依存関係のインストール
pnpm install

# 生成ファイルの作成
pnpm run generate

# ローカルビルドのテスト
pnpm run build

# テストの実行
pnpm run test
```

### 2. PR ワークフローのテスト

1. 新しいブランチを作成
2. 軽微な変更をコミット
3. PR を作成
4. GitHub Actions が自動実行されることを確認
5. Preview 環境にデプロイされることを確認

### 3. Production デプロイのテスト

1. PR を `main` ブランチにマージ
2. Production デプロイが自動実行されることを確認
3. ヘルスチェック URL にアクセスして動作確認

## トラブルシューティング

### よくある設定エラー

#### 1. Cloudflare API Token の権限不足

```
Error: Authentication error [Code: 10000]
```

**解決方法**: API Token の権限を確認し、必要な権限を追加

#### 2. Wrangler Secrets が認識されない

```
Error: Environment variable SUPABASE_URL is not defined
```

**解決方法**:

```bash
wrangler secret list --env production
wrangler secret put SUPABASE_URL --env production
```

#### 3. GitHub Actions の権限エラー

```
Error: Resource not accessible by integration
```

**解決方法**: Repository の Settings > Actions > General で権限を確認

#### 4. Supabase 接続エラー

```
Error: Invalid API key
```

**解決方法**: Supabase の API Keys を再確認し、正しい値を設定

### デバッグ方法

#### GitHub Actions のログ確認

1. Actions タブでワークフロー実行を選択
2. 失敗したジョブをクリック
3. ログを詳細に確認

#### ローカルでの動作確認

```bash
# 環境変数の確認
cat .dev.vars

# ローカル開発サーバーの起動
pnpm dev

# ヘルスチェックの確認
curl http://localhost:8787/api/health
```

#### Wrangler でのデバッグ

```bash
# ログの確認
wrangler tail --env production

# 環境変数の確認
wrangler dev --env development --local --show-interactive-dev-session
```

## セキュリティチェックリスト

- [ ] GitHub Repository が Private に設定されている
- [ ] Branch Protection Rules が設定されている
- [ ] Required status checks が設定されている
- [ ] Environment protection rules が設定されている
- [ ] Cloudflare API Token が最小権限で作成されている
- [ ] Supabase Service Role Key が適切に管理されている
- [ ] `.dev.vars` が `.gitignore` に含まれている
- [ ] Secrets が GitHub Actions と Wrangler の両方で設定されている

## 次のステップ

1. ✅ GitHub リポジトリの設定完了
2. ✅ CI/CD パイプラインの動作確認
3. ✅ Preview 環境での動作テスト
4. ✅ Production 環境での動作テスト
5. 🔄 監視とアラートの設定（将来のタスク）
6. 🔄 パフォーマンス最適化（将来のタスク）
