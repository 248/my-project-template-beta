import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import HomePage from '@/app/page';
import { createClient } from '@/lib/supabase/server';

// Supabaseクライアントをモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
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

// fetchをモック
global.fetch = vi.fn();

describe('HomePage', () => {
  const mockSupabaseClient = {
    auth: {
      getSession: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabaseClient as ReturnType<typeof createClient>
    );
    vi.mocked(global.fetch).mockClear();
  });

  describe('未認証状態', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });
    });

    it('ログインボタンが表示される', async () => {
      render(await HomePage({ searchParams: {} }));

      expect(screen.getByText('ログインしてください')).toBeInTheDocument();
      expect(screen.getByText('Googleでログイン')).toBeInTheDocument();
      expect(screen.getByText('GitHubでログイン')).toBeInTheDocument();
      expect(screen.getByText('Discordでログイン')).toBeInTheDocument();
    });

    it('認証機能カードにログインボタンが表示される', async () => {
      render(await HomePage({ searchParams: {} }));

      const authCard = screen.getByText('認証機能').closest('.card');
      expect(authCard).toBeInTheDocument();
      expect(authCard).toContainElement(screen.getByText('Googleでログイン'));
    });

    it('ヘルスチェックカードが表示される', async () => {
      render(await HomePage({ searchParams: {} }));

      expect(screen.getAllByText('ヘルスチェック')).toHaveLength(2); // カードタイトルとボタンテキスト
      expect(screen.getByText('システムの稼働状況を確認')).toBeInTheDocument();

      const healthLink = screen.getByRole('link', { name: /ヘルスチェック/ });
      expect(healthLink).toHaveAttribute('href', '/health');
    });

    it('技術スタックが表示される', async () => {
      render(await HomePage({ searchParams: {} }));

      expect(screen.getByText('技術スタック')).toBeInTheDocument();
      expect(screen.getByText('Next.js App Router')).toBeInTheDocument();
      expect(screen.getByText('Cloudflare Workers')).toBeInTheDocument();
      expect(screen.getByText('Supabase')).toBeInTheDocument();
      expect(screen.getByText('Tailwind CSS')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('OpenAPI')).toBeInTheDocument();
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

    it('ログイン済みメッセージが表示される', async () => {
      render(await HomePage({ searchParams: {} }));

      expect(screen.getByText('ログイン済み')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('ホームページへのリンクが表示される', async () => {
      render(await HomePage({ searchParams: {} }));

      const homeLinks = screen.getAllByText('ホームページへ');
      expect(homeLinks).toHaveLength(2); // メイン部分と認証カード内

      homeLinks.forEach(link => {
        expect(link.closest('a')).toHaveAttribute('href', '/home');
      });
    });

    it('ユーザーメニューが表示される', async () => {
      render(await HomePage({ searchParams: {} }));

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });
  });

  describe('ログイン機能', () => {
    beforeEach(() => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
      });
    });

    it('Googleログインボタンクリック時にAPIを呼び出す', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { url: 'https://supabase.auth.url' },
        }),
      } as Response);

      // window.location.hrefのモック
      const mockLocation = { href: '' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(await HomePage({ searchParams: {} }));

      const googleLoginButton = screen.getByTestId('login-button');
      fireEvent.click(googleLoginButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/auth/login?provider=google',
          {
            method: 'POST',
          }
        );
      });
    });

    it('ログインエラー時にエラーメッセージを表示する', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'ログインに失敗しました' },
        }),
      } as Response);

      render(await HomePage({ searchParams: {} }));

      const googleLoginButton = screen.getByTestId('login-button');
      fireEvent.click(googleLoginButton);

      await waitFor(() => {
        expect(screen.getByText('ログインに失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('ログアウト機能', () => {
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

    it('ログアウトボタンクリック時にAPIを呼び出す', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
      } as Response);

      // window.location.reloadのモック
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      render(await HomePage({ searchParams: {} }));

      const logoutButton = screen.getByText('ログアウト');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/auth/logout', {
          method: 'POST',
        });
      });

      await waitFor(() => {
        expect(mockReload).toHaveBeenCalled();
      });
    });
  });
});
