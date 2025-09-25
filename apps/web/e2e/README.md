# E2Eテスト

このディレクトリには、認証機能とヘルスチェック機能のE2E（End-to-End）テストが含まれています。

## テストファイル構成

```
e2e/
├── README.md                    # このファイル
├── helpers/
│   ├── auth-helpers.ts         # 認証関連のヘルパー関数
│   └── health-helpers.ts       # ヘルスチェック関連のヘルパー関数
├── auth-flow.spec.ts           # 認証フローの統合テスト
├── auth-edge-cases.spec.ts     # 認証エッジケースのテスト
└── home-health-check.spec.ts   # ホームページヘルスチェック機能のテスト
```

## テスト内容

### 1. 認証フローの統合テスト (`auth-flow.spec.ts`)

**要件: 10.2 - 認証フローの統合テスト（トップ → ログイン → ホーム → ログアウト）**

- 正常な認証フロー（Google/GitHub/Discord OAuth）
- 認証済み状態でのナビゲーション
- 複数回のログイン・ログアウト

### 2. 認証エッジケースのテスト (`auth-edge-cases.spec.ts`)

**要件: 10.3 - 認証エッジケースの E2E テスト**

- OAuth拒否・中断時の戻り先処理
- 期限切れCookie（部分セッション）の処理
- /home直リンク → ログイン → 元URL復帰
- ネットワークエラー時の再試行機能

### 3. ホームページヘルスチェック機能のテスト (`home-health-check.spec.ts`)

**要件: 10.4 - ホームページヘルスチェック機能の E2E テスト**

- 正常なヘルスチェック実行（healthy/degraded/unhealthy）
- ローディング状態とUI制御
- エラーハンドリングと再試行機能
- レスポンス時間とパフォーマンス

## テスト実行方法

### 前提条件

1. アプリケーションが起動していること
2. 必要な環境変数が設定されていること

### コマンド

```bash
# すべてのE2Eテストを実行
pnpm test:e2e

# UIモードでテストを実行（デバッグ用）
pnpm test:e2e:ui

# ヘッドありモードでテストを実行（ブラウザを表示）
pnpm test:e2e:headed

# 特定のテストファイルのみ実行
pnpm playwright test auth-flow.spec.ts

# 特定のブラウザでテスト実行
pnpm playwright test --project=chromium
```

## モック戦略

### 認証のモック

E2Eテストでは実際のOAuthプロバイダーを使用せず、以下の方法でモックします：

1. **OAuth認証URLの生成**: `/auth/login` APIをモックしてテスト用URLを返す
2. **認証コールバック**: `/auth/callback` をモックして成功レスポンスを返す
3. **セッション管理**: ローカルストレージにモックセッション情報を設定

### ヘルスチェックのモック

1. **正常レスポンス**: `healthy`/`degraded`/`unhealthy` の各状態をモック
2. **エラーレスポンス**: ネットワークエラー、タイムアウト、サーバーエラーをモック
3. **遅延レスポンス**: ローディング状態のテスト用に遅延を追加

## ヘルパー関数

### 認証ヘルパー (`auth-helpers.ts`)

- `mockOAuthLogin()`: モックOAuth認証を実行
- `performLogout()`: ログアウトを実行
- `expectAuthenticated()`: 認証状態を確認
- `expectUnauthenticated()`: 未認証状態を確認
- `expectErrorMessage()`: エラーメッセージを確認

### ヘルスチェックヘルパー (`health-helpers.ts`)

- `mockHealthCheckAPI()`: ヘルスチェックAPIレスポンスをモック
- `mockHealthCheckError()`: ヘルスチェックエラーをモック
- `executeHealthCheck()`: ヘルスチェックボタンをクリック
- `expectHealthCheckResult()`: ヘルスチェック結果を確認

## デバッグ方法

### 1. UIモードでの実行

```bash
pnpm test:e2e:ui
```

Playwrightの専用UIでテストを実行・デバッグできます。

### 2. ヘッドありモードでの実行

```bash
pnpm test:e2e:headed
```

実際のブラウザウィンドウでテストの実行過程を確認できます。

### 3. スクリーンショットとビデオ

テスト失敗時には自動的にスクリーンショットとビデオが保存されます：

- `test-results/` ディレクトリに保存
- 失敗したテストのみ記録

### 4. トレース機能

```bash
pnpm playwright show-trace test-results/[test-name]/trace.zip
```

詳細な実行トレースを確認できます。

## CI/CD環境での実行

GitHub Actionsでは以下の設定でE2Eテストを実行：

```yaml
- name: Run E2E tests
  run: pnpm test:e2e
  env:
    CI: true
```

- ヘッドレスモードで実行
- 失敗時のアーティファクト（スクリーンショット、ビデオ）を保存
- 複数ブラウザでのクロスブラウザテスト

## 注意事項

1. **テストの独立性**: 各テストは独立して実行できるよう設計
2. **データのクリーンアップ**: テスト前後でCookieやローカルストレージをクリア
3. **タイムアウト設定**: ネットワーク状況に応じてタイムアウトを調整
4. **モックの一貫性**: 実際のAPIレスポンスと一致するモックデータを使用

## トラブルシューティング

### よくある問題

1. **テストがタイムアウトする**
   - アプリケーションが正常に起動しているか確認
   - ネットワーク接続を確認

2. **認証テストが失敗する**
   - モック設定が正しいか確認
   - セッション情報がクリアされているか確認

3. **ヘルスチェックテストが失敗する**
   - APIモックが正しく設定されているか確認
   - レスポンス形式がOpenAPI仕様と一致しているか確認

### ログの確認

```bash
# 詳細ログ付きでテスト実行
DEBUG=pw:api pnpm test:e2e
```

Playwrightの詳細ログを確認できます。
