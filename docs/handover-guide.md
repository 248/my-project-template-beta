# 引き継ぎガイド

## 概要

このドキュメントは、Template Beta プロジェクトの開発引き継ぎのためのガイドです。現在の実装状況、設計思想、および残りのタスク（23, 24, 25, 27）について詳細に説明し、次の開発者がスムーズに作業を継続できるようにします。

## プロジェクトの現状

### 完了済み機能

プロジェクトは **フェーズ2（MVP-1）** まで完了しており、以下の機能が実装済みです：

#### ✅ 基盤機能（タスク1-12）

- **モノレポ構成**: pnpm workspaces による層分離アーキテクチャ
- **開発環境**: ESLint + Prettier + TypeScript + pre-commit hooks
- **OpenAPI契約駆動開発**: 型生成・クライアント生成・Lint・Breaking Change検知
- **ヘルスチェック機能**: Core層・BFF層・UI層の完全実装
- **CI/CD基盤**: GitHub Actions による自動ビルド・テスト・デプロイ
- **テスト基盤**: Vitest + Playwright による包括的テスト

#### ✅ 認証機能（タスク13-21）

- **Supabase認証**: OAuth認証・セッション管理・ミドルウェア保護
- **認証フロー**: ログイン・コールバック・ログアウトの完全実装
- **ホーム機能**: 認証必須ページ・ヘルスチェック実行・結果表示
- **エラーハンドリング**: 認証エラー・ネットワークエラーの適切な処理

#### ✅ 品質向上（タスク22, 25-26, 28）

- **パフォーマンス最適化**: p95 < 300ms 目標達成のための実装
- **ドキュメント整備**: README・開発ガイド・API仕様書の完備
- **型安全性向上**: orval生成クライアントの型アサーション問題解決
- **開発ツール整備**: 各種開発支援ツールの導入と設定

### 残りのタスク

以下の4つのタスクが未完了で、次の開発者に引き継がれます：

- **タスク23**: E2Eテストの実行と検証（先送り）
- **タスク24**: 最終統合テストとデプロイ準備
- **タスク25**: ドキュメント整備と Renovate 設定（一部完了）
- **タスク27**: パフォーマンステストの実行と検証

## 設計思想と実装方針

### 1. 層分離アーキテクチャ

```
UI層（apps/web） → BFF層 → Core層 → Adapter層
```

**設計原則**:

- **単方向依存**: 上位層から下位層への依存のみ許可
- **責務分離**: 各層の責務を明確に分離
- **テスタビリティ**: 依存性注入によるテスト容易性確保

**実装のポイント**:

- UI層はBFF層のみを呼び出し、Core層を直接呼び出さない
- Core層は外部依存を持たず、純粋なビジネスロジックのみ
- Adapter層で外部システム（Supabase等）との接続を抽象化

### 2. 契約駆動開発（OpenAPI-First）

**フロー**:

```
OpenAPI仕様定義 → 型生成 → クライアント生成 → 実装 → テスト
```

**実装のポイント**:

- `openapi/openapi.yaml` が単一の真実として機能
- `pnpm generate` で型・クライアントを自動生成
- Route Handlers は契約に準拠した実装のみ
- 生成ファイルの同期チェックで契約と実装のズレを防止

### 3. 2モード切替設計

**BACKEND_MODE による切替**:

- **monolith**: 同一Worker内でBFF層を直接呼び出し
- **service**: 外部サービスとして生成クライアント経由で呼び出し

**実装のポイント**:

- 将来のバックエンド分離に備えた設計
- UI層・Core層は無改修で切替可能
- CI/CDで両モードのテストを実行

### 4. エラーハンドリング統一

**エラー封筒形式**:

```typescript
{
  error: { code: string, message: string, details?: any },
  traceId: string
}
```

**実装のポイント**:

- 全APIレスポンスにtraceIdを含める
- PIIとシークレットの自動マスク（pino redact機能）
- 層ごとの適切なエラー変換

### 5. パフォーマンス重視

**目標値**:

- `/api/health` レスポンス時間: **p95 < 300ms**
- ページ読み込み時間: **LCP < 2.5s**

**実装のポイント**:

- パフォーマンス監視の実装
- キャッシュ戦略の検討
- バンドルサイズの最適化

## 残りタスクの実装想定

### タスク23: E2Eテストの実行と検証

**目的**: 実装済みのE2Eテストを実際に実行し、問題があれば修正する

**実装済み内容**:

- `apps/web/e2e/auth-flow.spec.ts` - 認証フロー統合テスト
- `apps/web/e2e/auth-edge-cases.spec.ts` - 認証エッジケーステスト
- `apps/web/e2e/home-health-check.spec.ts` - ホームページヘルスチェックテスト
- Playwright設定ファイル（`playwright.config.ts`）

**想定作業**:

1. **開発サーバー起動確認**

   ```bash
   pnpm dev
   # http://localhost:8787 で起動することを確認
   ```

2. **E2Eテスト実行**

   ```bash
   pnpm test:e2e
   # または個別実行
   pnpm exec playwright test auth-flow.spec.ts
   ```

3. **テスト結果の確認と修正**
   - 失敗したテストの原因調査
   - 環境依存の問題解決
   - テストの安定性向上

4. **Playwright設定の最適化**
   - タイムアウト設定の調整
   - 並列実行数の最適化
   - レポート設定の改善

**注意点**:

- 開発サーバーが正常に起動していることが前提
- Supabase環境変数が適切に設定されていることを確認
- 認証フローはモック環境での動作を想定

### タスク24: 最終統合テストとデプロイ準備

**目的**: 全機能の統合テストを実行し、本番デプロイの準備を完了する

**想定作業**:

1. **全機能統合テスト**

   ```bash
   # 全テスト実行
   pnpm test
   pnpm test:e2e
   pnpm test:perf

   # 両モードでのビルド確認
   BACKEND_MODE=monolith pnpm build
   BACKEND_MODE=service pnpm build
   ```

2. **Cloudflare Workers環境テスト**

   ```bash
   # ローカルWorkers環境でのテスト
   pnpm dev:wrangler
   # 動作確認後、Preview環境でのテスト
   ```

3. **本番デプロイ用Secrets設定**
   - Wrangler secretsの設定確認
   - 環境変数の本番値設定
   - セキュリティ設定の確認

4. **ロールバック手順の確認**
   - 直前タグへの再デプロイ手順
   - 緊急時の対応フロー
   - 監視・アラート設定

**実装済み基盤**:

- GitHub Actions ワークフロー（`.github/workflows/`）
- Wrangler設定（`wrangler.toml`）
- 環境変数管理（`.dev.vars.example`）

### タスク25: ドキュメント整備と Renovate 設定

**目的**: 開発・運用ドキュメントの最終整備とRenovate設定の完了

**一部完了済み**:

- ✅ README.md の作成
- ✅ 開発者向けドキュメント整備
- ✅ Renovate設定ファイル（`renovate.json`）

**残り作業**:

1. **API仕様書のホスティング設定**

   ```bash
   # API仕様書の生成とホスティング
   pnpm openapi:build-docs
   # GitHub Pages または Cloudflare Pages での公開設定
   ```

2. **Renovate設定の最終調整**
   - 依存関係更新ルールの微調整
   - セキュリティ更新の優先度設定
   - 通知設定の確認

3. **運用ドキュメントの追加**
   - 監視・アラート設定手順
   - トラブルシューティングガイド
   - 緊急時対応手順

**設定済み内容**:

- Minor/Patch更新: 自動マージ
- Major更新: PR作成・手動レビュー
- 実行頻度: 毎週月曜日午前10時前

### タスク27: パフォーマンステストの実行と検証

**目的**: p95 < 300ms 目標の実測値での検証とパフォーマンス監視の確立

**実装済み内容**:

- `scripts/performance-test.js` - Autocannon によるパフォーマンステスト
- `apps/web/__tests__/performance/` - パフォーマンステストスイート
- `packages/adapters/src/performance/` - パフォーマンス監視機能

**想定作業**:

1. **開発サーバー起動エラーの修正**

   ```bash
   # 現在の問題を調査・修正
   pnpm dev
   # エラーログの確認と対応
   ```

2. **パフォーマンステストの実行**

   ```bash
   # ローカル環境でのテスト
   pnpm test:perf

   # CI環境でのテスト
   pnpm test:perf:ci
   ```

3. **目標値の検証**
   - `/api/health` の p95 < 300ms 確認
   - パフォーマンス統計の収集
   - ボトルネックの特定と改善

4. **CI/CDパイプラインでの実行確認**
   - GitHub Actions でのパフォーマンステスト実行
   - 性能劣化の自動検知設定
   - レポート生成の自動化

**注意点**:

- 開発サーバーの起動問題を先に解決する必要がある
- パフォーマンステストは安定した環境で実行する
- 目標値を満たさない場合は最適化が必要

## 技術的な注意事項

### 1. 開発環境の問題と対策

**Windows環境での注意点**:

- シンボリックリンク権限問題: `pnpm build:dev` で回避可能
- 改行コード統一: `.gitattributes` でLF強制設定済み
- パス区切り文字: cross-env を使用して互換性確保

**よくある問題**:

```bash
# 生成ファイルの同期エラー
pnpm generate

# 型チェックエラー
pnpm type-check

# ビルドエラー
pnpm clean && pnpm install
```

### 2. 環境変数管理

**優先順位**:

1. CI環境変数
2. wrangler secret
3. .dev.vars（ローカル開発用）
4. process.env

**必要な環境変数**:

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# モード切替
BACKEND_MODE=monolith  # または service

# その他
NODE_ENV=development
```

### 3. デプロイメント

**デプロイフロー**:

```
PR作成 → CI実行 → Preview Deploy → レビュー → Main Merge → Production Deploy
```

**ロールバック手順**:

```bash
# 直前バージョンへのロールバック
wrangler deploy --compatibility-date=<previous-date>

# 特定バージョンへのロールバック
git checkout <previous-tag>
wrangler deploy
```

### 4. 監視・ログ

**ログ設定**:

- 構造化ログ（pino）
- traceId による追跡
- PII/シークレットの自動マスク

**パフォーマンス監視**:

- `/api/health/performance` エンドポイント
- レスポンス時間の統計情報
- エラー率の監視

## 開発継続のためのチェックリスト

### 事前準備

- [ ] Node.js 22 のインストール確認
- [ ] pnpm 9.0.0以上のインストール確認
- [ ] Cloudflare アカウントの準備
- [ ] Supabase プロジェクトの設定確認

### 環境セットアップ

- [ ] リポジトリのクローン
- [ ] `pnpm install` の実行
- [ ] `.dev.vars` の設定
- [ ] `pnpm generate` の実行
- [ ] `pnpm dev` での起動確認

### タスク実行前の確認

- [ ] 全テストの実行（`pnpm test`）
- [ ] 型チェックの実行（`pnpm type-check`）
- [ ] Lintの実行（`pnpm lint`）
- [ ] ビルドの確認（`pnpm build`）

### 各タスクの完了基準

**タスク23（E2Eテスト）**:

- [ ] 開発サーバーの正常起動
- [ ] 全E2Eテストの成功
- [ ] テスト実行時間の最適化
- [ ] CI/CDでのE2Eテスト実行確認

**タスク24（統合テスト・デプロイ準備）**:

- [ ] 全機能の統合テスト成功
- [ ] monolith/service両モードでの動作確認
- [ ] Preview環境での動作確認
- [ ] 本番Secrets設定の完了
- [ ] ロールバック手順の文書化

**タスク25（ドキュメント整備）**:

- [ ] API仕様書のホスティング設定
- [ ] Renovate設定の最終調整
- [ ] 運用ドキュメントの追加
- [ ] 開発者向けドキュメントの最終確認

**タスク27（パフォーマンステスト）**:

- [ ] 開発サーバー起動問題の解決
- [ ] パフォーマンステストの実行成功
- [ ] p95 < 300ms 目標の達成確認
- [ ] CI/CDでのパフォーマンステスト実行

## 参考資料

### プロジェクト内ドキュメント

- [README.md](../README.md) - プロジェクト概要・クイックスタート
- [アーキテクチャガイド](./architecture-guide.md) - システム設計・層分離
- [開発ツールガイド](./development-tools.md) - 開発支援ツールの詳細
- [テストガイド](./testing-guide.md) - テスト戦略・実装方法
- [API開発ガイド](./api-development.md) - OpenAPI契約駆動開発

### 仕様書

- [要件仕様書](../.kiro/specs/template-beta-cloudflare-supabase/requirements.md)
- [設計仕様書](../.kiro/specs/template-beta-cloudflare-supabase/design.md)
- [実装計画](../.kiro/specs/template-beta-cloudflare-supabase/tasks.md)

### 外部リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

## 連絡先・サポート

### 質問・相談

- **GitHub Issues**: 技術的な問題や質問
- **GitHub Discussions**: 設計・実装方針の相談
- **プロジェクトドキュメント**: 詳細な技術情報

### 緊急時対応

1. **ビルド・デプロイ失敗**: ロールバック手順の実行
2. **パフォーマンス問題**: 監視ダッシュボードの確認
3. **セキュリティ問題**: Secrets の即座なローテーション

---

このドキュメントが次の開発者の作業継続に役立つことを願います。不明な点があれば、プロジェクト内のドキュメントを参照するか、GitHub Issues で質問してください。
