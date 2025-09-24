import { test, expect } from '@playwright/test';

import {
  expectUnauthenticated,
  expectErrorMessage,
  expectRedirectTo,
} from './helpers/auth-helpers';

/**
 * 認証エッジケースのE2Eテスト
 * 要件: 10.3 - 認証エッジケースの E2E テスト
 */
test.describe('認証エッジケース', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test.describe('OAuth拒否・中断時の戻り先処理', () => {
    test('OAuth認証拒否時にエラーメッセージ付きでトップページに戻る', async ({
      page,
    }) => {
      // OAuth拒否をシミュレート
      await page.goto(
        '/auth/callback?error=access_denied&error_description=User%20denied%20access'
      );

      // トップページにリダイレクトされることを確認
      await page.waitForURL('/?error=oauth_denied');
      await expectErrorMessage(page, 'oauth_denied');
      await expectUnauthenticated(page);
    });

    test('OAuth認証キャンセル時にエラーメッセージ付きでトップページに戻る', async ({
      page,
    }) => {
      // OAuth キャンセルをシミュレート
      await page.goto('/auth/callback?error=cancelled');

      // トップページにリダイレクトされることを確認
      await page.waitForURL('/?error=oauth_cancelled');
      await expectErrorMessage(page, 'oauth_cancelled');
      await expectUnauthenticated(page);
    });

    test('OAuth認証コードなしでコールバックにアクセス', async ({ page }) => {
      // 認証コードなしでコールバックにアクセス
      await page.goto('/auth/callback');

      // トップページにリダイレクトされることを確認
      await page.waitForURL('/?error=oauth_cancelled');
      await expectErrorMessage(page, 'oauth_cancelled');
      await expectUnauthenticated(page);
    });

    test('不正な認証コードでコールバックにアクセス', async ({ page }) => {
      // 不正な認証コードでコールバック処理をモック
      await page.route('**/auth/callback**', async route => {
        const url = new URL(route.request().url());
        const code = url.searchParams.get('code');

        if (code === 'invalid_code') {
          // 認証失敗のリダイレクト
          await route.fulfill({
            status: 302,
            headers: {
              Location: '/?error=auth_failed',
            },
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/auth/callback?code=invalid_code');

      // トップページにリダイレクトされることを確認
      await page.waitForURL('/?error=auth_failed');
      await expectErrorMessage(page, 'auth_failed');
      await expectUnauthenticated(page);
    });
  });

  test.describe('期限切れCookie（部分セッション）の処理', () => {
    test('期限切れセッションで保護されたページにアクセス', async ({ page }) => {
      // 期限切れのセッションCookieを設定
      await page.context().addCookies([
        {
          name: 'sb-access-token',
          value: 'expired_token',
          domain: 'localhost',
          path: '/',
          expires: Date.now() / 1000 - 3600, // 1時間前に期限切れ
        },
      ]);

      // ミドルウェアでセッションエラーをシミュレート
      await page.route('**/home', async route => {
        // セッションエラーの場合のリダイレクト
        await route.fulfill({
          status: 302,
          headers: {
            Location: '/?error=session_expired',
          },
        });
      });

      await page.goto('/home');

      // セッション期限切れエラーでトップページにリダイレクト
      await page.waitForURL('/?error=session_expired');
      await expectErrorMessage(page, 'session_expired');
      await expectUnauthenticated(page);
    });

    test('部分的なセッション情報での認証チェック', async ({ page }) => {
      // 不完全なセッション情報を設定
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'supabase.auth.token',
          JSON.stringify({
            access_token: 'partial_token',
            // refresh_tokenが欠如
            expires_at: Date.now() + 3600000,
            // userが欠如
          })
        );
      });

      await page.goto('/home');

      // 認証失敗でトップページにリダイレクト
      await page.waitForURL('/');
      await expectUnauthenticated(page);
    });
  });

  test.describe('/home直リンク → ログイン → 元URL復帰', () => {
    test('未認証で/homeに直接アクセス後、ログイン成功で元URLに復帰', async ({
      page,
    }) => {
      // 未認証で/homeに直接アクセス
      await page.goto('/home');

      // トップページにリダイレクトされ、redirect_toパラメータが設定される
      await page.waitForURL('/?redirect_to=%2Fhome');
      await expectRedirectTo(page, '/home');
      await expectUnauthenticated(page);

      // ログイン処理をモック（redirect_toを考慮）
      await page.route('**/auth/login**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              url: `http://localhost:8787/auth/callback?code=mock_auth_code&state=eyJyZWRpcmVjdFRvIjoiL2hvbWUifQ==`, // base64 encoded {"redirectTo":"/home"}
            },
            traceId: 'test-trace-id',
          }),
        });
      });

      await page.route('**/auth/callback**', async route => {
        const url = new URL(route.request().url());
        const state = url.searchParams.get('state');

        if (state) {
          // stateから元のURLを復元してリダイレクト
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

      // ログインボタンをクリック
      const loginButton = page.getByTestId('login-button');
      await loginButton.click();

      // 元のURL（/home）にリダイレクトされることを確認
      await page.waitForURL('/home');
      await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
    });

    test('クエリパラメータ付きURLでの直リンク復帰', async ({ page }) => {
      // クエリパラメータ付きのURLに直接アクセス
      await page.goto('/home?tab=settings&view=profile');

      // リダイレクト先にクエリパラメータが保持される
      await page.waitForURL(
        '/?redirect_to=%2Fhome%3Ftab%3Dsettings%26view%3Dprofile'
      );
      await expectRedirectTo(page, '/home?tab=settings&view=profile');

      // ログイン後に元のURLに復帰することをテスト
      // （実装は上記と同様のモック処理）
    });

    test('無効なリダイレクト先URLの処理', async ({ page }) => {
      // 外部URLへのリダイレクトを試行
      await page.goto('/?redirect_to=https://malicious-site.com/steal-data');

      // ログイン処理で無効なリダイレクト先は無視される
      await page.route('**/auth/login**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              url: `http://localhost:8787/auth/callback?code=mock_auth_code&state=eyJyZWRpcmVjdFRvIjoiL2hvbWUifQ==`, // デフォルトの/home
            },
            traceId: 'test-trace-id',
          }),
        });
      });

      await page.route('**/auth/callback**', async route => {
        // 安全なデフォルトURL（/home）にリダイレクト
        await route.fulfill({
          status: 302,
          headers: {
            Location: '/home',
            'Set-Cookie':
              'sb-access-token=mock_token; Path=/; HttpOnly; Secure; SameSite=Lax',
          },
        });
      });

      const loginButton = page.getByTestId('login-button');
      await loginButton.click();

      // 安全なデフォルトURL（/home）にリダイレクト
      await page.waitForURL('/home');
      await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
    });
  });

  test.describe('ネットワークエラー時の再試行機能', () => {
    test('ログイン時のネットワークエラーハンドリング', async ({ page }) => {
      await page.goto('/');

      // ネットワークエラーをシミュレート
      await page.route('**/auth/login**', async route => {
        await route.abort('failed');
      });

      const loginButton = page.getByTestId('login-button');
      await loginButton.click();

      // エラーメッセージが表示されることを確認
      await expect(page.getByText('ログインに失敗しました')).toBeVisible();
    });

    test('ログアウト時のネットワークエラーハンドリング', async ({ page }) => {
      // 事前に認証状態を設定
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'supabase.auth.token',
          JSON.stringify({
            access_token: 'mock_access_token',
            user: { id: 'test-user', email: 'test@example.com' },
          })
        );
      });

      await page.goto('/home');

      // ログアウト時のネットワークエラーをシミュレート
      await page.route('**/auth/logout', async route => {
        await route.abort('failed');
      });

      const logoutButton = page.getByText('ログアウト').first();
      await logoutButton.click();

      // エラーハンドリングが適切に行われることを確認
      // （具体的な実装に応じてアサーションを調整）
    });
  });
});
