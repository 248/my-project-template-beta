import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import HomePage from '@/app/home/page';
import { createClient } from '@/lib/supabase/server';

// Supabaseクライアントをモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Next.jsのredirectをモック
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Next.jsのLinkコンポーネントをモック
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// HealthCheckerコンポーネントをモック
vi.mock('@/components/health/HealthChecker', () => ({
  HealthChecker: () => (
    <div data-testid="health-checker">
      <h3>システムヘルスチェック</h3>
      <p>システムの稼働状況をリアルタイムで確認できます</p>
      <button disabled>ヘルスチェック実行</button>
      <p>※ この機能は次のタスクで実装予定です</p>
    </div>
  ),
}));

describe('HomePage (/home)', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: vi.fn(),
    },
  } as ReturnType<typeof createClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabaseClient as ReturnType<typeof createClient>
    );
  });

  describe('未認証状態', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });
    });

    it('未認証の場合はトップページにリダイレクトする', async () => {
      // redirectは例外を投げるので、それをキャッチする
      try {
        await HomePage();
      } catch (error) {
        // redirectが呼ばれることを確認
        expect(redirect).toHaveBeenCalledWith('/');
      }
    });
  });

  describe('認証済み状態', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    };

    beforeEach(() => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: mockUser,
            access_token: 'mock-token',
          },
        },
      });
    });

    it('ホームページのタイトルが表示される', async () => {
      render(await HomePage());

      // h1要素のホームタイトルを取得
      const homeTitle = screen.getByRole('heading', {
        level: 1,
        name: 'ホーム',
      });
      expect(homeTitle).toBeInTheDocument();
      expect(screen.getByText('ようこそ、Test Userさん')).toBeInTheDocument();
    });

    it('ユーザー情報が表示される', async () => {
      render(await HomePage());

      expect(screen.getByText('アカウント情報')).toBeInTheDocument();

      // 複数のTest Userがあるので、getAllByTextを使用
      const testUserElements = screen.getAllByText('Test User');
      expect(testUserElements.length).toBeGreaterThan(0);

      const emailElements = screen.getAllByText('test@example.com');
      expect(emailElements.length).toBeGreaterThan(0);

      expect(screen.getByText('user-123')).toBeInTheDocument();
    });

    it('ユーザーメニューが表示される', async () => {
      render(await HomePage());

      // UserMenuコンポーネント内のユーザー情報
      const userMenus = screen.getAllByText('Test User');
      expect(userMenus.length).toBeGreaterThan(0);

      const emails = screen.getAllByText('test@example.com');
      expect(emails.length).toBeGreaterThan(0);

      // 複数のログアウトボタンがあるので、getAllByTextを使用
      const logoutButtons = screen.getAllByText('ログアウト');
      expect(logoutButtons.length).toBeGreaterThan(0);
    });

    it('システムヘルスチェック機能が表示される', async () => {
      render(await HomePage());

      expect(screen.getByText('システムヘルスチェック')).toBeInTheDocument();
      expect(
        screen.getByText('システムの稼働状況をリアルタイムで確認できます')
      ).toBeInTheDocument();

      // ボタン要素を直接取得
      const healthCheckButton = screen.getByRole('button', {
        name: /ヘルスチェック実行/,
      });
      expect(healthCheckButton).toBeInTheDocument();
      expect(healthCheckButton).toBeDisabled();

      expect(
        screen.getByText('※ この機能は次のタスクで実装予定です')
      ).toBeInTheDocument();
    });

    it('システム情報が表示される', async () => {
      render(await HomePage());

      expect(screen.getByText('システム情報')).toBeInTheDocument();
      expect(screen.getByText('Cloudflare Workers')).toBeInTheDocument();
      expect(screen.getByText('Next.js App Router')).toBeInTheDocument();
      expect(screen.getByText('Supabase Auth')).toBeInTheDocument();
      expect(screen.getByText('稼働中')).toBeInTheDocument();
    });

    it('クイックナビゲーションが表示される', async () => {
      render(await HomePage());

      expect(screen.getByText('クイックナビゲーション')).toBeInTheDocument();

      // ヘルスチェックリンク（クイックナビゲーション内の特定のもの）
      const healthLinks = screen.getAllByRole('link', {
        name: /ヘルスチェック/,
      });
      const quickNavHealthLink = healthLinks.find(
        link =>
          link.getAttribute('href') === '/health' &&
          link.querySelector('button')
      );
      expect(quickNavHealthLink).toHaveAttribute('href', '/health');

      // トップページリンク
      const homeLink = screen.getByRole('link', { name: /トップページ/ });
      expect(homeLink).toHaveAttribute('href', '/');

      // 設定ボタン（無効化）
      const settingsButton = screen.getByRole('button', { name: /設定/ });
      expect(settingsButton).toBeDisabled();
    });

    it('ヘッダーが認証済み状態で表示される', async () => {
      render(await HomePage());

      expect(screen.getByText('Template Beta')).toBeInTheDocument();
    });
  });

  describe('ユーザー情報のバリエーション', () => {
    it('full_nameが未設定の場合はemailを表示する', async () => {
      const mockUserWithoutName = {
        id: 'user-456',
        email: 'noname@example.com',
        user_metadata: {},
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: mockUserWithoutName,
            access_token: 'mock-token',
          },
        },
      });

      render(await HomePage());

      expect(
        screen.getByText('ようこそ、noname@example.comさん')
      ).toBeInTheDocument();
      expect(screen.getByText('未設定')).toBeInTheDocument();
    });

    it('user_metadataが未定義の場合も適切に処理される', async () => {
      const mockUserWithoutMetadata = {
        id: 'user-789',
        email: 'minimal@example.com',
      };

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: mockUserWithoutMetadata,
            access_token: 'mock-token',
          },
        },
      });

      render(await HomePage());

      expect(
        screen.getByText('ようこそ、minimal@example.comさん')
      ).toBeInTheDocument();
      expect(screen.getByText('未設定')).toBeInTheDocument();
    });
  });
});
