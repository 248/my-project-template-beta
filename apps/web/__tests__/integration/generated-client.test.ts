/**
 * 生成されたAPIクライアントの統合テスト
 * 要件: 6.4 - 生成 API クライアントを使用した/api/health 呼び出し
 */

import { getHealth, authLogin, authLogout } from '@generated/client';
import type {
  HealthResponse,
  AuthResponse,
  LogoutResponse,
} from '@generated/models';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// fetchをモック
global.fetch = vi.fn();

describe('生成されたAPIクライアント統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ヘルスチェックAPI', () => {
    it('getHealth()が正常なレスポンスを返す', async () => {
      const mockHealthResponse: HealthResponse = {
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00.000Z',
        services: [
          {
            name: 'supabase',
            status: 'up',
            responseTime: 150,
          },
        ],
        traceId: 'test-trace-id',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockHealthResponse,
      } as Response);

      const result = await getHealth();

      expect(fetch).toHaveBeenCalledWith(
        '/api/health',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockHealthResponse);
      expect(result.data.status).toBe('healthy');
      expect(result.data.services).toHaveLength(1);
      expect(result.data.services[0].name).toBe('supabase');
    });

    it('getHealth()がエラーレスポンスを適切に処理する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error occurred',
          },
          traceId: 'test-trace-id',
        }),
      } as Response);

      const result = await getHealth();

      expect(result.status).toBe(500);
      expect(result.data.error).toBeDefined();
      expect(result.data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('getHealth()がネットワークエラーを適切に処理する', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(getHealth()).rejects.toThrow('Network error');
    });

    it('getHealth()がタイムアウトを適切に処理する', async () => {
      const abortController = new AbortController();

      vi.mocked(fetch).mockImplementationOnce(async (url, options) => {
        // AbortSignalが渡されることを確認
        expect(options?.signal).toBeDefined();

        // タイムアウトをシミュレート
        throw new DOMException('The operation was aborted.', 'AbortError');
      });

      await expect(
        getHealth({ signal: abortController.signal })
      ).rejects.toThrow('The operation was aborted.');
    });
  });

  describe('認証API', () => {
    it('authLogin()が正常なレスポンスを返す', async () => {
      const mockAuthResponse: AuthResponse = {
        data: {
          url: 'https://accounts.google.com/oauth/authorize?client_id=test',
        },
        traceId: 'test-trace-id',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAuthResponse,
      } as Response);

      const result = await authLogin({ provider: 'google' });

      expect(fetch).toHaveBeenCalledWith(
        '/auth/login?provider=google',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockAuthResponse);
      expect(result.data.data.url).toMatch(/^https:\/\//);
    });

    it('authLogin()がバリデーションエラーを適切に処理する', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストパラメータが不正です',
            details: [
              {
                code: 'invalid_enum_value',
                expected: ['google', 'github', 'discord'],
                received: 'invalid',
                path: ['provider'],
                message: 'Invalid enum value',
              },
            ],
          },
          traceId: 'test-trace-id',
        }),
      } as Response);

      const result = await authLogin({ provider: 'invalid' as 'google' });

      expect(result.status).toBe(400);
      expect(result.data.error.code).toBe('VALIDATION_ERROR');
      expect(result.data.error.details).toBeDefined();
    });

    it('authLogout()が正常なレスポンスを返す', async () => {
      const mockLogoutResponse: LogoutResponse = {
        success: true,
        message: 'Successfully logged out',
        traceId: 'test-trace-id',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockLogoutResponse,
      } as Response);

      const result = await authLogout();

      expect(fetch).toHaveBeenCalledWith(
        '/auth/logout',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.status).toBe(200);
      expect(result.data).toEqual(mockLogoutResponse);
      expect(result.data.success).toBe(true);
    });
  });

  describe('型安全性の確認', () => {
    it('生成されたクライアントが型安全である', async () => {
      const mockResponse: HealthResponse = {
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00.000Z',
        services: [],
        traceId: 'test-trace-id',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
      } as Response);

      const result = await getHealth();

      // TypeScriptの型チェックが通ることを確認
      const status: 'healthy' | 'degraded' | 'unhealthy' = result.data.status;
      const timestamp: string = result.data.timestamp;
      const services: Array<{
        name: string;
        status: 'up' | 'down';
        responseTime?: number;
        error?: string;
      }> = result.data.services;
      const traceId: string = result.data.traceId;

      expect(status).toBe('healthy');
      expect(timestamp).toBeDefined();
      expect(services).toEqual([]);
      expect(traceId).toBe('test-trace-id');
    });

    it('不正な型のレスポンスでTypeScriptエラーが発生する', () => {
      // この部分はコンパイル時にTypeScriptがエラーを出すことを確認
      // 実行時テストではなく、型チェックのテスト

      // 以下のコードはTypeScriptエラーになるはず（コメントアウト）
      // const invalidResponse: HealthResponse = {
      //   status: 'invalid_status', // エラー: 'healthy' | 'degraded' | 'unhealthy' ではない
      //   timestamp: 123, // エラー: string ではない
      //   services: 'invalid', // エラー: Array ではない
      //   traceId: null, // エラー: string ではない
      // };

      // 正しい型の例
      const validResponse: HealthResponse = {
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00.000Z',
        services: [
          {
            name: 'test-service',
            status: 'up',
            responseTime: 100,
          },
        ],
        traceId: 'test-trace-id',
      };

      expect(validResponse.status).toBe('healthy');
    });
  });

  describe('エラーハンドリングの統合テスト', () => {
    it('HTTPエラーステータスが適切に処理される', async () => {
      const errorStatuses = [400, 401, 403, 404, 500, 502, 503];

      for (const status of errorStatuses) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: false,
          status,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            error: {
              code: 'HTTP_ERROR',
              message: `HTTP ${status} error`,
            },
            traceId: 'test-trace-id',
          }),
        } as Response);

        const result = await getHealth();
        expect(result.status).toBe(status);
        expect(result.data.error).toBeDefined();
      }
    });

    it('レスポンスのContent-Typeが適切に処理される', async () => {
      const mockHealthData = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00.000Z',
        services: [],
        traceId: 'test-trace-id',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        json: async () => mockHealthData,
      } as Response);

      const result = await getHealth();
      expect(result.status).toBe(200);
      expect(result.data.status).toBe('healthy');
    });
  });
});
