# 開発ツールガイド

## 概要

このドキュメントでは、プロジェクトで使用している開発支援ツールの概要、用途、設定について説明します。これらのツールは開発体験の向上、コード品質の保証、継続的インテグレーションの実現を目的として導入されています。

## 開発ツール一覧

### テスト関連

| ツール     | 用途                 | 設定ファイル                  | 実行コマンド     |
| ---------- | -------------------- | ----------------------------- | ---------------- |
| Vitest     | 単体・統合テスト     | `vitest.config.ts`            | `pnpm test`      |
| Playwright | E2Eテスト            | `playwright.config.ts`        | `pnpm test:e2e`  |
| Autocannon | パフォーマンステスト | `scripts/performance-test.js` | `pnpm test:perf` |

### コード品質

| ツール      | 用途               | 設定ファイル       | 実行コマンド      |
| ----------- | ------------------ | ------------------ | ----------------- |
| ESLint      | 静的解析・Lint     | `.eslintrc.js`     | `pnpm lint`       |
| Prettier    | コードフォーマット | `.prettierrc`      | `pnpm format`     |
| TypeScript  | 型チェック         | `tsconfig.json`    | `pnpm type-check` |
| lint-staged | プレコミットフック | `.lintstagedrc.js` | 自動実行          |
| Husky       | Gitフック管理      | `.husky/`          | 自動実行          |

### API開発

| ツール             | 用途                       | 設定ファイル           | 実行コマンド           |
| ------------------ | -------------------------- | ---------------------- | ---------------------- |
| OpenAPI TypeScript | 型生成                     | `package.json` scripts | `pnpm generate:types`  |
| Orval              | APIクライアント生成        | `orval.config.ts`      | `pnpm generate:client` |
| Redocly CLI        | OpenAPI Lint・ドキュメント | `redocly.yaml`         | `pnpm openapi:lint`    |

### 依存関係管理

| ツール   | 用途             | 設定ファイル          | 実行頻度     |
| -------- | ---------------- | --------------------- | ------------ |
| Renovate | 依存関係自動更新 | `renovate.json`       | 週次自動実行 |
| pnpm     | パッケージ管理   | `pnpm-workspace.yaml` | 手動実行     |

### デプロイ・CI/CD

| ツール         | 用途                        | 設定ファイル         | 実行タイミング |
| -------------- | --------------------------- | -------------------- | -------------- |
| GitHub Actions | CI/CD                       | `.github/workflows/` | Push・PR時     |
| Wrangler       | Cloudflare Workers デプロイ | `wrangler.toml`      | デプロイ時     |

## 詳細説明

### Vitest - 単体・統合テスト

#### 用途

- Core層、BFF層、Adapter層の単体テスト
- API統合テスト
- 契約テスト（OpenAPI仕様との整合性確認）

#### 設定のポイント

```typescript
// packages/core/vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
    },
  },
});
```

#### 実行方法

```bash
# 全テスト実行
pnpm test

# 特定パッケージのテスト
pnpm --filter core test

# カバレッジ付きテスト
pnpm test --coverage

# ウォッチモード
pnpm test --watch
```

#### テストファイルの配置

- `packages/*/src/__tests__/` - 単体テスト
- `apps/web/__tests__/integration/` - 統合テスト
- `apps/web/__tests__/contract/` - 契約テスト

### Playwright - E2Eテスト

#### 用途

- ユーザーフローの自動テスト
- 認証フローのテスト
- ヘルスチェック機能のE2Eテスト
- クロスブラウザテスト

#### 設定のポイント

```typescript
// apps/web/playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:8787',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:8787',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 実行方法

```bash
# E2Eテスト実行
pnpm test:e2e

# 特定のテストファイル実行
pnpm exec playwright test auth-flow.spec.ts

# UIモードで実行
pnpm exec playwright test --ui

# レポート表示
pnpm exec playwright show-report
```

#### テストファイルの配置

- `apps/web/e2e/` - E2Eテストファイル
- `apps/web/e2e/helpers/` - テストヘルパー関数

### ESLint - 静的解析・Lint

#### 用途

- コード品質の保証
- 依存方向の検証（boundaries plugin）
- import順序の統一
- TypeScript型安全性の強化

#### 主要な設定

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['import', 'prettier', 'boundaries'],
  rules: {
    // 依存方向チェック
    'boundaries/element-types': [
      'error',
      {
        rules: [
          { from: 'web', allow: ['bff', 'generated', 'adapters'] },
          { from: 'bff', allow: ['core', 'generated', 'adapters'] },
          { from: 'core', allow: ['adapters'] },
        ],
      },
    ],
    // Import整形
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
  },
};
```

#### 実行方法

```bash
# Lint実行
pnpm lint

# 自動修正
pnpm lint:fix

# 特定ファイルのLint
pnpm exec eslint src/components/Button.tsx
```

### Prettier - コードフォーマット

#### 用途

- コードスタイルの統一
- 改行コードの統一（LF固定）
- インデント・クォートの統一

#### 設定のポイント

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "endOfLine": "lf"
}
```

#### 実行方法

```bash
# フォーマット実行
pnpm format

# フォーマットチェック
pnpm format:check

# 特定ファイルのフォーマット
pnpm exec prettier --write src/components/Button.tsx
```

### OpenAPI TypeScript - 型生成

#### 用途

- OpenAPI仕様からTypeScript型定義を生成
- フロントエンド・バックエンド間の型安全性確保
- 契約駆動開発の実現

#### 実行方法

```bash
# 型生成
pnpm generate:types

# 生成ファイルの確認
cat packages/generated/src/types.ts
```

#### 生成される型の例

```typescript
// packages/generated/src/types.ts
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: ServiceHealth[];
}
```

### Orval - APIクライアント生成

#### 用途

- OpenAPI仕様からfetchベースのAPIクライアント生成
- 型安全なAPI呼び出しの実現
- レスポンス形式の統一

#### 設定のポイント

```typescript
// orval.config.ts
export default defineConfig({
  api: {
    input: './openapi/openapi.yaml',
    output: {
      target: './packages/generated/src/client.ts',
      client: 'fetch',
      override: {
        mutator: {
          path: './packages/generated/src/orval-fetcher.ts',
          name: 'orvalFetch',
        },
      },
    },
  },
});
```

#### 実行方法

```bash
# クライアント生成
pnpm generate:client

# 生成物の確認
pnpm generate:check
```

### Redocly CLI - OpenAPI管理

#### 用途

- OpenAPI仕様のLint
- Breaking Change検知
- APIドキュメント生成
- 仕様の品質保証

#### 実行方法

```bash
# OpenAPI Lint
pnpm openapi:lint

# ドキュメント生成
pnpm openapi:build-docs

# プレビュー表示
pnpm openapi:preview

# Breaking Change検知（CI）
redocly diff origin/main:openapi/openapi.yaml openapi/openapi.yaml
```

### Renovate - 依存関係自動更新

#### 用途

- npm パッケージの自動更新
- セキュリティ脆弱性の早期発見
- メジャーバージョンアップの管理
- 開発効率の向上

#### 設定のポイント

```json
// renovate.json
{
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["major-update"]
    }
  ],
  "schedule": ["before 10am on monday"]
}
```

#### 動作パターン

- **Minor・Patch更新**: 自動マージ
- **Major更新**: PR作成、手動レビュー
- **セキュリティ更新**: 高優先度で即座にPR作成
- **実行頻度**: 毎週月曜日の午前10時前

### lint-staged - プレコミットフック

#### 用途

- コミット前の自動品質チェック
- 変更ファイルのみの効率的な検証
- 品質問題の早期発見

#### 設定内容

```javascript
// .lintstagedrc.js
module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,yaml,yml,md}': ['prettier --write'],
  'openapi/**/*.{yaml,yml}': ['redocly lint'],
  '*.{ts,tsx}': () => ['pnpm type-check'],
};
```

#### 実行タイミング

- `git commit` 実行時に自動実行
- `.husky/pre-commit` フックから呼び出し

### GitHub Actions - CI/CD

#### 用途

- 自動ビルド・テスト
- コード品質チェック
- セキュリティ監査
- 自動デプロイ

#### ワークフロー構成

```yaml
# .github/workflows/ci.yml
jobs:
  openapi-lint: # OpenAPI仕様チェック
  generate-check: # 生成ファイル同期チェック
  lint-and-format: # コード品質チェック
  build-and-test: # ビルド・テスト（マトリクス実行）
  security: # セキュリティ監査
```

#### マトリクス実行

- `BACKEND_MODE=monolith` と `BACKEND_MODE=service` の両方でテスト
- 将来のバックエンド分離に対応

### Autocannon - パフォーマンステスト

#### 用途

- API レスポンス時間の測定
- p95 < 300ms 目標の検証
- パフォーマンス回帰の検知

#### 実行方法

```bash
# パフォーマンステスト実行
pnpm test:perf

# CI環境での実行
pnpm test:perf:ci
```

#### 測定項目

- レスポンス時間（平均・最小・最大・p95）
- スループット（RPS）
- エラー率

## 開発ワークフロー

### 1. 日常的な開発

```bash
# 1. 開発サーバー起動
pnpm dev

# 2. コード変更

# 3. テスト実行
pnpm test

# 4. コミット（自動的にlint-stagedが実行される）
git add .
git commit -m "feat: add new feature"
```

### 2. API変更時

```bash
# 1. OpenAPI仕様を更新
vim openapi/openapi.yaml

# 2. 仕様のLint
pnpm openapi:lint

# 3. 型・クライアント生成
pnpm generate

# 4. 実装更新

# 5. 契約テスト実行
pnpm test --run apps/web/__tests__/contract/
```

### 3. リリース前

```bash
# 1. 全テスト実行
pnpm test

# 2. E2Eテスト実行
pnpm test:e2e

# 3. パフォーマンステスト実行
pnpm test:perf

# 4. ビルド確認
pnpm build

# 5. 依存関係監査
pnpm deps:audit
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. 生成ファイルの同期エラー

```bash
# エラー: Generated files are out of sync
pnpm generate
git add packages/generated/
git commit -m "chore: update generated files"
```

#### 2. ESLint の依存方向エラー

```bash
# エラー: Dependency direction violation
# 解決: 適切な層から import するように修正
# 例: apps/web から packages/core を直接 import しない
```

#### 3. Playwright テストの失敗

```bash
# 開発サーバーが起動していることを確認
pnpm dev

# 別ターミナルでテスト実行
pnpm test:e2e
```

#### 4. TypeScript 型エラー

```bash
# 型チェック実行
pnpm type-check

# 生成ファイルの更新
pnpm generate
```

#### 5. Renovate PR の処理

- Minor/Patch更新: 自動マージされる
- Major更新: 手動でレビュー・マージが必要
- セキュリティ更新: 優先的に対応

## 設定ファイル一覧

### テスト関連

- `packages/core/vitest.config.ts` - Core層テスト設定
- `packages/bff/vitest.config.ts` - BFF層テスト設定
- `packages/adapters/vitest.config.ts` - Adapter層テスト設定
- `apps/web/vitest.config.ts` - Web層テスト設定
- `apps/web/playwright.config.ts` - E2Eテスト設定

### コード品質

- `.eslintrc.js` - ESLint設定
- `.prettierrc` - Prettier設定
- `.lintstagedrc.js` - lint-staged設定
- `.husky/pre-commit` - プレコミットフック

### API開発

- `orval.config.ts` - APIクライアント生成設定
- `redocly.yaml` - OpenAPI設定
- `openapi/openapi.yaml` - API仕様定義

### 依存関係・CI/CD

- `renovate.json` - 依存関係自動更新設定
- `.github/workflows/ci.yml` - CI/CDワークフロー
- `wrangler.toml` - Cloudflare Workers設定

## 参考リンク

### 公式ドキュメント

- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Renovate](https://docs.renovatebot.com/)
- [Redocly CLI](https://redocly.com/docs/cli/)
- [Orval](https://orval.dev/)

### プロジェクト内ドキュメント

- [テストガイド](./testing-guide.md)
- [開発環境セットアップ](./development-setup.md)
- [API開発ガイド](./api-development.md)
- [アーキテクチャガイド](./architecture-guide.md)
