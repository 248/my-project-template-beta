import { test, expect } from '@playwright/test';

import { mockOAuthLogin } from './helpers/auth-helpers';
import {
  mockHealthCheckAPI,
  mockHealthCheckError,
  executeHealthCheck,
  expectHealthCheckResult,
  expectHealthCheckError,
  expectHealthCheckLoading,
  clickRetryButton,
  expectServiceDetails,
} from './helpers/health-helpers';

/**
 * ホームページヘルスチェック機能のE2Eテスト
 * 要件: 10.4 - ホームページヘルスチェック機能の E2E テスト
 */
test.describe('ホームページヘルスチェック機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();

    // 認証済み状態でホームページにアクセス
    await page.goto('/');
    await mockOAuthLogin(page, 'google');
    await page.waitForURL('/home');
  });

  test.describe('正常なヘルスチェック実行', () => {
    test('健全なシステム状態のヘルスチェック', async ({ page }) => {
      // 健全な状態のAPIレスポンスをモック
      await mockHealthCheckAPI(page, {
        status: 'healthy',
        services: [
          {
            name: 'supabase',
            status: 'up',
            responseTime: 120,
          },
        ],
      });

      // ヘルスチェックを実行
      await executeHealthCheck(page);

      // 結果を確認
      await expectHealthCheckResult(page, 'OK');
      await expectServiceDetails(page, [
        {
          name: 'supabase',
          status: 'UP',
          responseTime: 120,
        },
      ]);

      // トレースIDが表示されることを確認
      await expect(page.getByText('Trace ID: test-trace-id')).toBeVisible();
    });

    test('劣化状態のヘルスチェック', async ({ page }) => {
      // 劣化状態のAPIレスポンスをモック
      await mockHealthCheckAPI(page, {
        status: 'degraded',
        services: [
          {
            name: 'supabase',
            status: 'up',
            responseTime: 800, // 遅いレスポンス
          },
          {
            name: 'cache',
            status: 'down',
            error: 'Connection timeout',
          },
        ],
      });

      await executeHealthCheck(page);

      // 劣化状態の結果を確認
      await expectHealthCheckResult(page, 'Degraded');
      await expectServiceDetails(page, [
        {
          name: 'supabase',
          status: 'UP',
          responseTime: 800,
        },
        {
          name: 'cache',
          status: 'DOWN',
        },
      ]);
    });

    test('異常状態のヘルスチェック', async ({ page }) => {
      // 異常状態のAPIレスポンスをモック
      await mockHealthCheckAPI(page, {
        status: 'unhealthy',
        services: [
          {
            name: 'supabase',
            status: 'down',
            error: 'Database connection failed',
          },
        ],
      });

      await executeHealthCheck(page);

      // 異常状態の結果を確認
      await expectHealthCheckResult(page, 'Down');
      await expectServiceDetails(page, [
        {
          name: 'supabase',
          status: 'DOWN',
        },
      ]);
    });
  });

  test.describe('ローディング状態とUI制御', () => {
    test('ヘルスチェック実行中のローディング表示', async ({ page }) => {
      // 遅延のあるAPIレスポンスをモック
      await mockHealthCheckAPI(page, {
        status: 'healthy',
        delay: 2000, // 2秒遅延
      });

      // ヘルスチェックを実行
      const healthCheckButton = page.getByTestId('health-check-button');
      await healthCheckButton.click();

      // ローディング状態を確認
      await expectHealthCheckLoading(page);

      // ボタンが無効化されることを確認
      await expect(healthCheckButton).toBeDisabled();

      // 結果が表示されるまで待機
      await expectHealthCheckResult(page, 'OK');

      // ボタンが再度有効化されることを確認
      await expect(healthCheckButton).toBeEnabled();
    });

    test('複数回のヘルスチェック実行', async ({ page }) => {
      // 1回目のヘルスチェック
      await mockHealthCheckAPI(page, {
        status: 'healthy',
      });

      await executeHealthCheck(page);
      await expectHealthCheckResult(page, 'OK');

      // 2回目のヘルスチェック（異なる結果）
      await mockHealthCheckAPI(page, {
        status: 'degraded',
      });

      await executeHealthCheck(page);
      await expectHealthCheckResult(page, 'Degraded');
    });
  });

  test.describe('エラーハンドリングと再試行機能', () => {
    test('ネットワークエラー時の再試行機能', async ({ page }) => {
      // ネットワークエラーをモック
      await mockHealthCheckError(page, 'network');

      await executeHealthCheck(page);

      // エラーメッセージを確認
      await expectHealthCheckError(page, 'ネットワークエラーが発生しました');

      // 再試行ボタンが表示されることを確認
      const retryButton = page.getByText('再試行');
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toBeEnabled();

      // 再試行時は正常なレスポンスをモック
      await mockHealthCheckAPI(page, {
        status: 'healthy',
      });

      await clickRetryButton(page);
      await expectHealthCheckResult(page, 'OK');
    });

    test('タイムアウトエラーの処理', async ({ page }) => {
      // タイムアウトエラーをモック
      await mockHealthCheckError(page, 'timeout');

      await executeHealthCheck(page);

      // タイムアウトエラーメッセージを確認
      await expectHealthCheckError(
        page,
        'ヘルスチェックがタイムアウトしました'
      );
    });

    test('サーバーエラーの処理', async ({ page }) => {
      // サーバーエラーをモック
      await mockHealthCheckError(page, 'server_error');

      await executeHealthCheck(page);

      // サーバーエラーメッセージを確認
      await expectHealthCheckError(page);
    });

    test('再試行回数の制限', async ({ page }) => {
      // 常にネットワークエラーをモック
      await mockHealthCheckError(page, 'network');

      // 1回目の実行
      await executeHealthCheck(page);
      await expectHealthCheckError(page);

      // 1回目の再試行
      await clickRetryButton(page);
      await expectHealthCheckError(page);
      await expect(page.getByText('再試行回数: 1/3')).toBeVisible();

      // 2回目の再試行
      await clickRetryButton(page);
      await expectHealthCheckError(page);
      await expect(page.getByText('再試行回数: 2/3')).toBeVisible();

      // 3回目の再試行
      await clickRetryButton(page);
      await expectHealthCheckError(page);
      await expect(page.getByText('再試行回数: 3/3')).toBeVisible();

      // 再試行ボタンが無効化されることを確認
      const retryButton = page.getByText('再試行上限に達しました');
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toBeDisabled();
    });
  });

  test.describe('レスポンス時間とパフォーマンス', () => {
    test('レスポンス時間の表示', async ({ page }) => {
      await mockHealthCheckAPI(page, {
        status: 'healthy',
        services: [
          {
            name: 'supabase',
            status: 'up',
            responseTime: 250,
          },
          {
            name: 'cache',
            status: 'up',
            responseTime: 50,
          },
        ],
      });

      await executeHealthCheck(page);

      // レスポンス時間が表示されることを確認
      await expect(page.getByText('250ms')).toBeVisible();
      await expect(page.getByText('50ms')).toBeVisible();
    });

    test('タイムスタンプの表示', async ({ page }) => {
      await mockHealthCheckAPI(page, {
        status: 'healthy',
      });

      await executeHealthCheck(page);

      // タイムスタンプが表示されることを確認
      await expect(page.getByText(/最終チェック:/)).toBeVisible();
    });
  });

  test.describe('UI/UXの詳細テスト', () => {
    test('ヘルスチェックカードの基本表示', async ({ page }) => {
      // ヘルスチェックカードの要素を確認
      await expect(page.getByText('システムヘルスチェック')).toBeVisible();
      await expect(
        page.getByText('システムの稼働状況をリアルタイムで確認できます')
      ).toBeVisible();

      const healthCheckButton = page.getByTestId('health-check-button');
      await expect(healthCheckButton).toBeVisible();
      await expect(healthCheckButton).toBeEnabled();
    });

    test('アイコンとスタイリングの確認', async ({ page }) => {
      await mockHealthCheckAPI(page, {
        status: 'healthy',
        services: [
          {
            name: 'supabase',
            status: 'up',
          },
        ],
      });

      await executeHealthCheck(page);

      // 成功アイコンが表示されることを確認
      const resultArea = page.getByTestId('health-result');
      await expect(resultArea).toBeVisible();

      // ステータスに応じた色分けが適用されることを確認
      const statusElement = resultArea.locator('.text-success-600');
      await expect(statusElement).toBeVisible();
    });
  });
});
