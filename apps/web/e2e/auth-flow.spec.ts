import { test, expect } from '@playwright/test';

import {
  mockOAuthLogin,
  performLogout,
  expectAuthenticated,
  expectUnauthenticated,
} from './helpers/auth-helpers';

/**
 * 認証フローの統合テスト
 * 要件: 10.2 - 認証フローの統合テスト（トップ → ログイン → ホーム → ログアウト）
 */
test.describe('認証フロー統合テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 各テスト前にクリーンな状態にする
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('正常な認証フロー: トップ → ログイン → ホーム → ログアウト', async ({
    page,
  }) => {
    // 1. トップページの初期状態を確認
    await expectUnauthenticated(page);

    // 2. Google OAuth認証を実行
    await mockOAuthLogin(page, 'google');

    // 3. 認証後にホームページにリダイレクトされることを確認
    await page.waitForURL('/home');
    await expectAuthenticated(page);

    // 4. ユーザー情報が表示されることを確認
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('test@example.com')).toBeVisible();

    // 5. ログアウトを実行
    await performLogout(page);

    // 6. トップページにリダイレクトされることを確認
    await page.waitForURL('/');
    await expectUnauthenticated(page);
  });

  test('GitHub OAuth認証フロー', async ({ page }) => {
    await expectUnauthenticated(page);

    // GitHubログインボタンをクリック
    const githubButton = page.getByText('GitHubでログイン');
    await expect(githubButton).toBeVisible();

    await mockOAuthLogin(page, 'github');

    await page.waitForURL('/home');
    await expectAuthenticated(page);
  });

  test('Discord OAuth認証フロー', async ({ page }) => {
    await expectUnauthenticated(page);

    // Discordログインボタンをクリック
    const discordButton = page.getByText('Discordでログイン');
    await expect(discordButton).toBeVisible();

    await mockOAuthLogin(page, 'discord');

    await page.waitForURL('/home');
    await expectAuthenticated(page);
  });

  test('認証済み状態でトップページにアクセス', async ({ page }) => {
    // 事前に認証を実行
    await mockOAuthLogin(page, 'google');
    await page.waitForURL('/home');

    // トップページにアクセス
    await page.goto('/');

    // 認証済み状態の表示を確認
    await expect(page.getByText('ログイン済み')).toBeVisible();
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('ホームページへ')).toBeVisible();
  });

  test('認証済み状態でのナビゲーション', async ({ page }) => {
    // 事前に認証を実行
    await mockOAuthLogin(page, 'google');
    await page.waitForURL('/home');

    // ホームページの各要素を確認
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible();
    await expect(page.getByText('アカウント情報')).toBeVisible();
    await expect(page.getByText('システムヘルスチェック')).toBeVisible();
    await expect(page.getByText('クイックナビゲーション')).toBeVisible();

    // ヘルスチェックページへのリンクをテスト
    const healthLink = page
      .getByRole('link', { name: /ヘルスチェック/ })
      .first();
    await healthLink.click();
    await page.waitForURL('/health');

    // ホームに戻る
    await page.goBack();
    await page.waitForURL('/home');

    // トップページへのリンクをテスト
    const homeLink = page.getByRole('link', { name: /トップページ/ });
    await homeLink.click();
    await page.waitForURL('/');
  });

  test('複数回のログイン・ログアウト', async ({ page }) => {
    // 1回目のログイン
    await mockOAuthLogin(page, 'google');
    await page.waitForURL('/home');
    await expectAuthenticated(page);

    // 1回目のログアウト
    await performLogout(page);
    await page.waitForURL('/');
    await expectUnauthenticated(page);

    // 2回目のログイン（異なるプロバイダー）
    await mockOAuthLogin(page, 'github');
    await page.waitForURL('/home');
    await expectAuthenticated(page);

    // 2回目のログアウト
    await performLogout(page);
    await page.waitForURL('/');
    await expectUnauthenticated(page);
  });
});
