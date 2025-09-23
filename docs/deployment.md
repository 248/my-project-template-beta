# デプロイメントガイド

## 概要

このドキュメントでは、Cloudflare Workers へのデプロイメント手順、Secrets 管理、ロールバック手順について説明します。

## 環境構成

### 環境一覧

| 環境        | Worker名                                    | 用途         | デプロイトリガー        |
| ----------- | ------------------------------------------- | ------------ | ----------------------- |
| Development | `template-beta-cloudflare-supabase-dev`     | ローカル開発 | 手動 (`wrangler dev`)   |
| Preview     | `template-beta-cloudflare-supabase-preview` | PR レビュー  | PR 作成・更新時         |
| Production  | `template-beta-cloudflare-supabase-prod`    | 本番環境     | main ブランチプッシュ時 |

### 環境変数の優先順位

1. **CI/CD環境**: GitHub Actions Secrets
2. **Wrangler Secrets**: `wrangler secret put`
3. **ローカル開発**: `.dev.vars` ファイル
4. **デフォルト値**: `wrangler.toml` の `[vars]` セクション

## Secrets 管理

### 必要な Secrets

#### Cloudflare 関連

```bash
# GitHub Actions で必要
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id
```

#### Supabase 関連

```bash
# 各環境で設定が必要
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Secrets 設定手順

#### 1. GitHub Actions Secrets の設定

```bash
# GitHub リポジトリの Settings > Secrets and variables > Actions で設定
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
```

#### 2. Wrangler Secrets の設定

```bash
# Preview 環境
wrangler secret put SUPABASE_URL --env preview
wrangler secret put SUPABASE_ANON_KEY --env preview
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env preview

# Production 環境
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production
wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
```

#### 3. ローカル開発用 Secrets

```bash
# .dev.vars ファイルを作成（.dev.vars.example をコピー）
cp .dev.vars.example .dev.vars

# .dev.vars を編集
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Secrets の確認

```bash
# 設定済み Secrets の一覧表示
wrangler secret list --env preview
wrangler secret list --env production

# 特定の Secret の削除
wrangler secret delete SECRET_NAME --env production
```

## デプロイメント手順

### 自動デプロイ

#### Preview 環境

1. PR を作成または更新
2. GitHub Actions が自動実行
3. Preview 環境にデプロイ
4. PR にプレビュー URL がコメントされる

#### Production 環境

1. `main` ブランチにマージ
2. GitHub Actions が自動実行
3. 本番環境にデプロイ
4. デプロイタグが自動作成される

### 手動デプロイ

```bash
# Preview 環境への手動デプロイ
pnpm run build
wrangler deploy --env preview

# Production 環境への手動デプロイ
pnpm run build
wrangler deploy --env production
```

### デプロイ前チェックリスト

- [ ] OpenAPI 仕様の Lint チェック通過
- [ ] 生成ファイルが最新の契約と同期済み
- [ ] 全テストが通過
- [ ] セキュリティ監査で高リスク脆弱性なし
- [ ] 必要な Secrets が設定済み

## ロールバック手順

### 自動ロールバック（GitHub Actions）

1. GitHub リポジトリの Actions タブを開く
2. "Rollback Production" ワークフローを選択
3. "Run workflow" をクリック
4. ロールバック対象のタグと理由を入力
5. ワークフローを実行

### 手動ロールバック

```bash
# 1. ロールバック対象のタグを確認
git tag | grep deploy- | tail -5

# 2. 対象タグをチェックアウト
git checkout deploy-20241201-123456-abc1234

# 3. ビルドとデプロイ
pnpm install
pnpm run build
wrangler deploy --env production

# 4. ロールバック記録の作成
ROLLBACK_TAG="rollback-$(date +%Y%m%d-%H%M%S)-deploy-20241201-123456-abc1234"
git tag -a "$ROLLBACK_TAG" -m "Emergency rollback due to critical issue"
git push origin "$ROLLBACK_TAG"
```

### 緊急時の直前バージョンロールバック

```bash
# 最新のデプロイタグを取得
LATEST_TAG=$(git tag | grep deploy- | tail -2 | head -1)
echo "Rolling back to: $LATEST_TAG"

# ロールバック実行
git checkout $LATEST_TAG
pnpm install --frozen-lockfile
pnpm run build
wrangler deploy --env production
```

## モニタリングとヘルスチェック

### ヘルスチェック URL

```bash
# Production
https://template-beta-cloudflare-supabase-prod.your-subdomain.workers.dev/health
https://template-beta-cloudflare-supabase-prod.your-subdomain.workers.dev/api/health

# Preview
https://template-beta-cloudflare-supabase-preview.your-subdomain.workers.dev/health
https://template-beta-cloudflare-supabase-preview.your-subdomain.workers.dev/api/health
```

### パフォーマンス監視

```bash
# API レスポンス時間の測定
curl -w "@curl-format.txt" -o /dev/null -s "https://your-domain.workers.dev/api/health"

# curl-format.txt の内容:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#           time_total:  %{time_total}\n
```

### ログ監視

```bash
# リアルタイムログの確認
wrangler tail --env production

# 特定期間のログ確認
wrangler tail --env production --since 2024-12-01T10:00:00Z
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. デプロイが失敗する

```bash
# ビルドエラーの確認
pnpm run build

# 依存関係の問題
pnpm install --frozen-lockfile

# 生成ファイルの同期
pnpm run generate:check
```

#### 2. Secrets が認識されない

```bash
# Secrets の設定確認
wrangler secret list --env production

# 環境変数の確認
wrangler dev --env development --local
```

#### 3. パフォーマンスが悪い

```bash
# ローカルでのパフォーマンステスト
pnpm run test:performance

# 本番環境での確認
curl -w "%{time_total}" -o /dev/null -s "https://your-domain.workers.dev/api/health"
```

#### 4. ヘルスチェックが失敗する

```bash
# Supabase 接続の確認
curl "https://your-domain.workers.dev/api/health" | jq .

# ログの確認
wrangler tail --env production | grep health
```

## セキュリティ考慮事項

### Secrets の管理

- **絶対に** `.dev.vars` をコミットしない
- Service Role Key は本番環境でのみ使用
- 定期的な API キーのローテーション
- 最小権限の原則に従った権限設定

### アクセス制御

- Cloudflare API Token は必要最小限の権限のみ
- GitHub Actions の環境保護ルールを設定
- 本番デプロイには承認プロセスを導入

### 監査ログ

- デプロイ履歴の記録（Git タグ）
- ロールバック履歴の記録
- Secrets 変更履歴の管理

## 参考リンク

- [Wrangler CLI ドキュメント](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions ドキュメント](https://docs.github.com/en/actions)
- [Cloudflare Workers ドキュメント](https://developers.cloudflare.com/workers/)
- [Supabase ドキュメント](https://supabase.com/docs)
