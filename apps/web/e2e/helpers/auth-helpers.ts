import { Page, expect } from '@playwright/test';

/**
 * 認証関連のE2Eテストヘルパー関数
 */

/**
 * モックOAuth認証を実行する
 * 実際のOAuthプロバイダーを使わずにテスト用の認証フローを実行
 */
export async function mockOAuthLogin(
  page: Page,
  provider: 'google' | 'github' | 'discord' = 'google'
) {
  // プロバイダーに応じたログインボタンをクリック
  const testId =
    provider === 'google' ? 'login-button' : `login-${provider}-button`;
  const loginButton = page.getByTestId(testId).first(); // 最初の要素を選択
  await expect(loginButton).toBeVisible();
  await loginButton.click();

  // OAuth認証URLへのリダイレクトをインターセプト
  await page.route('**/auth/login**', async route => {
    const url = new URL(route.request().url());
    const providerParam = url.searchParams.get('provider');

    if (providerParam === provider) {
      // 直接ホームページにリダイレクト（OAuth認証をスキップ）
      await route.fulfill({
        status: 302,
        headers: {
          Location: '/home',
          'Set-Cookie':
            'sb-access-token=mock_token; Path=/; HttpOnly; Secure; SameSite=Lax',
        },
      });
    } else {
      await route.continue();
    }
  });

  // コールバック処理をモック（念のため）
  await page.route('**/auth/callback**', async route => {
    const url = new URL(route.request().url());
    const code = url.searchParams.get('code');

    if (code === 'mock_auth_code') {
      // 認証成功後のリダイレクト
      await route.fulfill({
        status: 302,
        headers: {
          Location: '/home',
          'Set-Cookie':
            'sb-access-token=mock_token; Path=/; HttpOnly; Secure; SameSite=Lax',
        },
      });
    } else {
      await route.continue();
    }
  });

  // セッション情報をモック
  await page.addInitScript(() => {
    // ローカルストレージにモックセッション情報を設定
    window.localStorage.setItem(
      'supabase.auth.token',
      JSON.stringify({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_at: Date.now() + 3600000, // 1時間後
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User',
          },
        },
      })
    );

    // Cookieもモック
    document.cookie =
      'sb-access-token=mock_token; Path=/; HttpOnly; Secure; SameSite=Lax';
  });
}

/**
 * ログアウトを実行する
 */
export async function performLogout(page: Page) {
  // ログアウトボタンをクリック
  const logoutButton = page.getByText('ログアウト').first();
  await expect(logoutButton).toBeVisible();

  // ログアウトAPIをモック
  await page.route('**/auth/logout', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Successfully logged out',
        traceId: 'test-trace-id',
      }),
    });
  });

  await logoutButton.click();

  // ページリロードを待つ
  await page.waitForLoadState('networkidle');
}

/**
 * 認証状態を確認する
 */
export async function expectAuthenticated(page: Page) {
  // ホームページの要素が表示されることを確認
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
  await expect(page.getByText('ようこそ、')).toBeVisible();
}

/**
 * 未認証状態を確認する
 */
export async function expectUnauthenticated(page: Page) {
  // トップページの要素が表示されることを確認
  await expect(page.getByText('ログインしてください')).toBeVisible();
  await expect(page.getByText('Googleでログイン')).toBeVisible();
}

/**
 * エラーメッセージを確認する
 */
export async function expectErrorMessage(page: Page, errorType: string) {
  const url = new URL(page.url());
  const errorParam = url.searchParams.get('error');
  expect(errorParam).toBe(errorType);
}

/**
 * リダイレクト先URLを確認する
 */
export async function expectRedirectTo(page: Page, expectedPath: string) {
  const url = new URL(page.url());
  const redirectParam = url.searchParams.get('redirect_to');
  expect(redirectParam).toBe(expectedPath);
}
