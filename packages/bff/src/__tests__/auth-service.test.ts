/**
 * AuthServiceのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LoggerInterface } from '../interfaces/core-interfaces';
import { AuthService } from '../services/auth-service';

// モックの型定義
interface MockSupabaseAdapter {
  signInWithOAuth: ReturnType<typeof vi.fn>;
  exchangeCodeForSession: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
}

interface MockLogger {
  info: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  withTraceId: ReturnType<typeof vi.fn>;
}

describe('AuthService', () => {
  let authService: AuthService;
  let mockSupabaseAdapter: MockSupabaseAdapter;
  let mockLogger: MockLogger;

  beforeEach(() => {
    // Supabaseアダプターのモック
    mockSupabaseAdapter = {
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      signOut: vi.fn(),
    };

    // ロガーのモック
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      withTraceId: vi.fn().mockReturnThis(),
    };

    // withTraceIdが自分自身を返すように設定
    mockLogger.withTraceId.mockReturnValue(mockLogger);

    authService = new AuthService(
      mockSupabaseAdapter as unknown as import('@template/adapters').SupabaseAdapter,
      mockLogger as LoggerInterface,
      {
        timeoutMs: 1000,
        defaultRedirectUrl: '/home',
        allowedRedirectDomains: ['localhost', 'example.com'],
      }
    );
  });

  describe('handleLogin', () => {
    it('正常なOAuth認証開始ができること', async () => {
      // Arrange
      const loginParams = {
        provider: 'google' as const,
        redirectTo: 'http://localhost:3000/home',
      };

      const mockAuthResult = {
        data: {
          url: 'https://accounts.google.com/oauth/authorize?...',
        },
        error: null,
      };

      mockSupabaseAdapter.signInWithOAuth.mockResolvedValue(mockAuthResult);

      // Act
      const result = await authService.handleLogin(loginParams);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.data.url).toBe(mockAuthResult.data.url);
        expect(result.data.traceId).toBeDefined();
      }

      expect(mockSupabaseAdapter.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: loginParams.redirectTo,
        },
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'auth-login',
          provider: 'google',
        }),
        'OAuth認証開始'
      );
    });

    it('不正なプロバイダーでバリデーションエラーになること', async () => {
      // Arrange
      const loginParams = {
        provider: 'invalid-provider' as 'google',
      };

      // Act
      const result = await authService.handleLogin(loginParams);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe('VALIDATION_ERROR');
        expect(result.statusCode).toBe(422);
      }

      expect(mockSupabaseAdapter.signInWithOAuth).not.toHaveBeenCalled();
    });

    it('Supabaseエラー時にAuthProviderErrorになること', async () => {
      // Arrange
      const loginParams = {
        provider: 'google' as const,
      };

      const mockAuthResult = {
        data: null,
        error: {
          message: 'OAuth provider configuration error',
        },
      };

      mockSupabaseAdapter.signInWithOAuth.mockResolvedValue(mockAuthResult);

      // Act
      const result = await authService.handleLogin(loginParams);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe('AUTH_PROVIDER_ERROR');
        expect(result.statusCode).toBe(400);
      }
    });

    it('OAuth URLが取得できない場合にAuthProviderErrorになること', async () => {
      // Arrange
      const loginParams = {
        provider: 'google' as const,
      };

      const mockAuthResult = {
        data: {
          url: null, // URLが取得できない
        },
        error: null,
      };

      mockSupabaseAdapter.signInWithOAuth.mockResolvedValue(mockAuthResult);

      // Act
      const result = await authService.handleLogin(loginParams);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe('AUTH_PROVIDER_ERROR');
        expect(result.statusCode).toBe(400);
      }
    });
  });

  describe('handleCallback', () => {
    it('正常なコールバック処理ができること', async () => {
      // Arrange
      const callbackParams = {
        code: 'auth-code-123',
        state: 'csrf-state-456',
      };

      const mockSessionResult = {
        data: {
          session: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
            access_token: 'access-token-123',
          },
        },
        error: null,
      };

      mockSupabaseAdapter.exchangeCodeForSession.mockResolvedValue(
        mockSessionResult
      );

      // Act
      const result = await authService.handleCallback(callbackParams);

      // Assert
      expect(result.success).toBe(true);
      expect(result.redirectTo).toBe('/home');

      expect(mockSupabaseAdapter.exchangeCodeForSession).toHaveBeenCalledWith(
        callbackParams.code
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'auth-callback',
          hasCode: true,
          hasState: true,
        }),
        'OAuth認証コールバック処理開始'
      );
    });

    it('認証コードが空の場合にバリデーションエラーになること', async () => {
      // Arrange
      const callbackParams = {
        code: '', // 空のコード
      };

      // Act
      const result = await authService.handleCallback(callbackParams);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.error.code).toBe('VALIDATION_ERROR');
        expect(result.statusCode).toBe(422);
      }

      expect(mockSupabaseAdapter.exchangeCodeForSession).not.toHaveBeenCalled();
    });

    it('Supabaseエラー時にOAuthErrorになること', async () => {
      // Arrange
      const callbackParams = {
        code: 'auth-code-123',
      };

      const mockSessionResult = {
        data: null,
        error: {
          message: 'Invalid authorization code',
        },
      };

      mockSupabaseAdapter.exchangeCodeForSession.mockResolvedValue(
        mockSessionResult
      );

      // Act
      const result = await authService.handleCallback(callbackParams);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.error.code).toBe('OAUTH_ERROR');
        expect(result.statusCode).toBe(400);
      }
    });

    it('セッションが作成されない場合にSessionErrorになること', async () => {
      // Arrange
      const callbackParams = {
        code: 'auth-code-123',
      };

      const mockSessionResult = {
        data: {
          session: null, // セッションが作成されない
        },
        error: null,
      };

      mockSupabaseAdapter.exchangeCodeForSession.mockResolvedValue(
        mockSessionResult
      );

      // Act
      const result = await authService.handleCallback(callbackParams);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error?.error.code).toBe('SESSION_ERROR');
        expect(result.statusCode).toBe(401);
      }
    });
  });

  describe('handleLogout', () => {
    it('正常なログアウト処理ができること', async () => {
      // Arrange
      const mockLogoutResult = {
        error: null,
      };

      mockSupabaseAdapter.signOut.mockResolvedValue(mockLogoutResult);

      // Act
      const result = await authService.handleLogout();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
        expect(result.data.message).toBe('ログアウトが完了しました');
        expect(result.data.traceId).toBeDefined();
      }

      expect(mockSupabaseAdapter.signOut).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'auth-logout',
        }),
        'ログアウト処理開始'
      );
    });

    it('Supabaseエラーがあっても処理を継続すること', async () => {
      // Arrange
      const mockLogoutResult = {
        error: {
          message: 'Session already expired',
        },
      };

      mockSupabaseAdapter.signOut.mockResolvedValue(mockLogoutResult);

      // Act
      const result = await authService.handleLogout();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.success).toBe(true);
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          supabaseError: mockLogoutResult.error,
        }),
        'Supabaseログアウトでエラーが発生しましたが、処理を継続します'
      );
    });
  });

  describe('設定とユーティリティメソッド', () => {
    it('設定を正しく取得できること', () => {
      const config = authService.getConfig();

      expect(config.timeoutMs).toBe(1000);
      expect(config.defaultRedirectUrl).toBe('/home');
      expect(config.allowedRedirectDomains).toEqual([
        'localhost',
        'example.com',
      ]);
    });

    it('新しいtraceIdでログイン処理ができること', async () => {
      // Arrange
      const loginParams = {
        provider: 'google' as const,
      };

      const mockAuthResult = {
        data: {
          url: 'https://accounts.google.com/oauth/authorize?...',
        },
        error: null,
      };

      mockSupabaseAdapter.signInWithOAuth.mockResolvedValue(mockAuthResult);

      // Act
      const result = await authService.handleLoginWithNewTrace(loginParams);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.traceId).toBeDefined();
      }
    });
  });

  describe('タイムアウト処理', () => {
    it('タイムアウト時にエラーになること', async () => {
      // Arrange
      const loginParams = {
        provider: 'google' as const,
      };

      // 長時間かかるPromiseをモック
      mockSupabaseAdapter.signInWithOAuth.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );

      // Act
      const result = await authService.handleLogin(loginParams);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe('TIMEOUT_ERROR');
        expect(result.statusCode).toBe(504);
      }
    }, 3000); // テストのタイムアウトを3秒に設定
  });
});
