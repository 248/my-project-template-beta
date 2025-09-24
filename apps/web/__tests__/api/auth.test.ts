import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabaseクライアントのモック
const mockSupabaseClient = {
  auth: {
    signInWithOAuth: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    getSession: vi.fn(),
    signOut: vi.fn(),
  },
};

// Supabaseクライアント作成関数をモック
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}));

// crypto.randomUUIDをモック
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-trace-id-123',
  },
});

describe('Auth Route Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('/auth/login', () => {
    it('should return OAuth URL for valid provider', async () => {
      // モックの設定
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize?...' },
        error: null,
      });

      // テスト対象のインポート（モック後に実行）
      const { POST } = await import('@/app/auth/login/route');

      // リクエストの作成
      const request = new NextRequest(
        'http://localhost:3000/auth/login?provider=google&redirectTo=http://localhost:3000/home'
      );

      // 実行
      const response = await POST(request);
      const data = await response.json();

      // 検証
      expect(response.status).toBe(200);
      expect(data).toEqual({
        data: {
          url: 'https://accounts.google.com/oauth/authorize?...',
        },
        traceId: 'test-trace-id-123',
      });
      expect(mockSupabaseClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/home',
        },
      });
    });

    it('should return validation error for invalid provider', async () => {
      const { POST } = await import('@/app/auth/login/route');

      const request = new NextRequest(
        'http://localhost:3000/auth/login?provider=invalid'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.traceId).toBe('test-trace-id-123');
    });

    it('should handle Supabase auth error', async () => {
      mockSupabaseClient.auth.signInWithOAuth.mockResolvedValue({
        data: null,
        error: { message: 'OAuth provider error' },
      });

      const { POST } = await import('@/app/auth/login/route');

      const request = new NextRequest(
        'http://localhost:3000/auth/login?provider=google'
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('AUTH_PROVIDER_ERROR');
      expect(data.traceId).toBe('test-trace-id-123');
    });
  });

  describe('/auth/logout', () => {
    it('should successfully logout authenticated user', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123', email: 'test@example.com' },
          },
        },
        error: null,
      });
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      const { POST } = await import('@/app/auth/logout/route');

      const request = new NextRequest('http://localhost:3000/auth/logout');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Successfully logged out',
        traceId: 'test-trace-id-123',
      });
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });

    it('should handle logout when no session exists', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { POST } = await import('@/app/auth/logout/route');

      const request = new NextRequest('http://localhost:3000/auth/logout');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        message: 'Already logged out',
        traceId: 'test-trace-id-123',
      });
      expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled();
    });
  });
});
