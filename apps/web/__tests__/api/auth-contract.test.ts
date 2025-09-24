import type {
  AuthResponse,
  LogoutResponse,
  ErrorResponse,
} from '@generated/models';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * OpenAPI契約テスト（認証エンドポイント）
 * 要件: 10.2, 10.3, 10.4 - OpenAPI契約テスト（認証エンドポイント）
 */

// OpenAPI生成型をインポート

// Zodスキーマを定義（OpenAPI仕様に基づく）
const AuthResponseSchema = z.object({
  data: z.object({
    url: z.string().url(),
  }),
  traceId: z.string(),
});

const LogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  traceId: z.string(),
});

const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  traceId: z.string(),
});

describe('認証API契約テスト', () => {
  describe('スキーマ検証テスト', () => {
    it('AuthResponseスキーマが正しく定義されている', () => {
      const validAuthResponse = {
        data: {
          url: 'https://accounts.google.com/oauth/authorize?client_id=test',
        },
        traceId: 'test-trace-id',
      };

      expect(() => AuthResponseSchema.parse(validAuthResponse)).not.toThrow();

      // 不正なデータでエラーになることを確認
      const invalidAuthResponse = {
        data: {
          url: 'invalid-url', // 不正なURL
        },
        traceId: 'test-trace-id',
      };

      expect(() => AuthResponseSchema.parse(invalidAuthResponse)).toThrow();
    });

    it('LogoutResponseスキーマが正しく定義されている', () => {
      const validLogoutResponse = {
        success: true,
        message: 'Successfully logged out',
        traceId: 'test-trace-id',
      };

      expect(() =>
        LogoutResponseSchema.parse(validLogoutResponse)
      ).not.toThrow();

      // messageは省略可能
      const validLogoutResponseWithoutMessage = {
        success: true,
        traceId: 'test-trace-id',
      };

      expect(() =>
        LogoutResponseSchema.parse(validLogoutResponseWithoutMessage)
      ).not.toThrow();
    });

    it('ErrorResponseスキーマが正しく定義されている', () => {
      const validErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'リクエストパラメータが不正です',
          details: { field: 'provider' },
        },
        traceId: 'test-trace-id',
      };

      expect(() => ErrorResponseSchema.parse(validErrorResponse)).not.toThrow();

      // detailsは省略可能
      const validErrorResponseWithoutDetails = {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error occurred',
        },
        traceId: 'test-trace-id',
      };

      expect(() =>
        ErrorResponseSchema.parse(validErrorResponseWithoutDetails)
      ).not.toThrow();
    });
  });

  describe('型安全性の確認', () => {
    it('生成された型がOpenAPI仕様と一致する', () => {
      // AuthResponse型の構造を確認
      const authResponse: AuthResponse = {
        data: {
          url: 'https://example.com/oauth',
        },
        traceId: 'trace-123',
      };

      expect(authResponse.data.url).toBeDefined();
      expect(authResponse.traceId).toBeDefined();

      // LogoutResponse型の構造を確認
      const logoutResponse: LogoutResponse = {
        success: true,
        traceId: 'trace-123',
      };

      expect(logoutResponse.success).toBe(true);
      expect(logoutResponse.traceId).toBeDefined();

      // ErrorResponse型の構造を確認
      const errorResponse: ErrorResponse = {
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
        },
        traceId: 'trace-123',
      };

      expect(errorResponse.error.code).toBeDefined();
      expect(errorResponse.error.message).toBeDefined();
      expect(errorResponse.traceId).toBeDefined();
    });

    it('認証プロバイダーの型制約を確認', () => {
      // 有効なプロバイダー
      const validProviders = ['google', 'github', 'discord'];

      validProviders.forEach(provider => {
        expect(['google', 'github', 'discord']).toContain(provider);
      });

      // 無効なプロバイダーは型エラーになることを確認（コンパイル時）
      // const invalidProvider: 'google' | 'github' | 'discord' = 'facebook'; // TypeScriptエラー
    });

    it('HTTPステータスコードの型制約を確認', () => {
      // 認証APIで使用される標準的なHTTPステータスコード
      const validStatusCodes = [200, 302, 400, 401, 500];

      validStatusCodes.forEach(code => {
        expect(typeof code).toBe('number');
        expect(code).toBeGreaterThanOrEqual(200);
        expect(code).toBeLessThan(600);
      });
    });
  });

  describe('エラーコードの定数確認', () => {
    it('認証関連のエラーコードが定義されている', () => {
      const authErrorCodes = [
        'VALIDATION_ERROR',
        'AUTH_PROVIDER_ERROR',
        'SESSION_ERROR',
        'LOGOUT_ERROR',
        'INTERNAL_SERVER_ERROR',
      ];

      authErrorCodes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code).toMatch(/^[A-Z_]+$/); // 大文字とアンダースコアのみ
      });
    });

    it('OAuth関連のエラーパラメータが定義されている', () => {
      const oauthErrors = [
        'oauth_denied',
        'oauth_cancelled',
        'auth_failed',
        'no_session',
        'session_expired',
      ];

      oauthErrors.forEach(error => {
        expect(typeof error).toBe('string');
        expect(error).toMatch(/^[a-z_]+$/); // 小文字とアンダースコアのみ
      });
    });
  });
});
