import { Page, expect } from '@playwright/test';

/**
 * ヘルスチェック関連のE2Eテストヘルパー関数
 */

/**
 * ヘルスチェックAPIレスポンスをモックする
 */
export async function mockHealthCheckAPI(
  page: Page,
  response: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services?: Array<{
      name: string;
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    }>;
    delay?: number; // レスポンス遅延（ミリ秒）
  }
) {
  await page.route('**/api/health', async route => {
    // 遅延をシミュレート
    if (response.delay) {
      await new Promise(resolve => setTimeout(resolve, response.delay));
    }

    const mockResponse = {
      status: response.status,
      timestamp: new Date().toISOString(),
      services: response.services || [
        {
          name: 'supabase',
          status: response.status === 'unhealthy' ? 'down' : 'up',
          responseTime: 150,
        },
      ],
      traceId: 'test-trace-id',
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });
}

/**
 * ヘルスチェックエラーをモックする
 */
export async function mockHealthCheckError(
  page: Page,
  errorType: 'network' | 'timeout' | 'server_error' = 'server_error'
) {
  await page.route('**/api/health', async route => {
    switch (errorType) {
      case 'network':
        await route.abort('failed');
        break;
      case 'timeout':
        // 20秒待ってからタイムアウト
        await new Promise(resolve => setTimeout(resolve, 20000));
        await route.abort('timedout');
        break;
      case 'server_error':
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error occurred',
            },
            traceId: 'test-trace-id',
          }),
        });
        break;
    }
  });
}

/**
 * ヘルスチェックボタンをクリックして実行する
 */
export async function executeHealthCheck(page: Page) {
  const healthCheckButton = page.getByTestId('health-check-button');
  await expect(healthCheckButton).toBeVisible();
  await expect(healthCheckButton).toBeEnabled();

  await healthCheckButton.click();
}

/**
 * ヘルスチェック結果を確認する
 */
export async function expectHealthCheckResult(
  page: Page,
  expectedStatus: 'OK' | 'Degraded' | 'Down'
) {
  const resultElement = page.getByTestId('health-result');
  await expect(resultElement).toBeVisible();

  // ステータステキストを確認
  await expect(resultElement.getByText(expectedStatus)).toBeVisible();
}

/**
 * ヘルスチェックエラーメッセージを確認する
 */
export async function expectHealthCheckError(
  page: Page,
  errorMessage?: string
) {
  const errorElement = page.locator('.bg-danger-50');
  await expect(errorElement).toBeVisible();

  if (errorMessage) {
    await expect(errorElement.getByText(errorMessage)).toBeVisible();
  }
}

/**
 * ローディング状態を確認する
 */
export async function expectHealthCheckLoading(page: Page) {
  const loadingButton = page.getByText('ヘルスチェック実行中...');
  await expect(loadingButton).toBeVisible();
}

/**
 * 再試行ボタンをクリックする
 */
export async function clickRetryButton(page: Page) {
  const retryButton = page.getByText('再試行');
  await expect(retryButton).toBeVisible();
  await expect(retryButton).toBeEnabled();

  await retryButton.click();
}

/**
 * サービス詳細を確認する
 */
export async function expectServiceDetails(
  page: Page,
  services: Array<{
    name: string;
    status: 'UP' | 'DOWN';
    responseTime?: number;
  }>
) {
  for (const service of services) {
    const serviceElement = page.locator(`text=${service.name}`).locator('..');
    await expect(serviceElement).toBeVisible();
    await expect(serviceElement.getByText(service.status)).toBeVisible();

    if (service.responseTime) {
      await expect(
        serviceElement.getByText(`${service.responseTime}ms`)
      ).toBeVisible();
    }
  }
}
