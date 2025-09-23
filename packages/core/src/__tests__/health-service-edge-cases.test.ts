/**
 * Core層ヘルスチェックサービスのエッジケーステスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { CoreAdapters } from '../interfaces/adapters';
import type {
  SupabaseAdapterInterface,
  LoggerInterface,
} from '../interfaces/service-interfaces';
import { CoreHealthService } from '../services/core-health-service';

describe('CoreHealthService - Edge Cases', () => {
  let healthService: CoreHealthService;
  let mockSupabaseAdapter: SupabaseAdapterInterface;
  let mockLogger: LoggerInterface;
  let adapters: CoreAdapters;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseAdapter = {
      checkConnection: vi.fn(),
      getConnectionInfo: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      withTraceId: vi.fn().mockReturnThis(),
    };

    adapters = {
      supabase: mockSupabaseAdapter,
      logger: mockLogger,
    };

    healthService = new CoreHealthService(adapters);
  });

  describe('タイムアウト処理', () => {
    it('Supabaseチェックがタイムアウトした場合、適切にエラーハンドリングすべき', async () => {
      // 短いタイムアウト設定でサービスを作成
      const shortTimeoutService = new CoreHealthService(adapters, {
        timeoutMs: 100,
      });

      // 長時間かかるモックを設定
      mockSupabaseAdapter.checkConnection.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 200))
      );

      const result = await shortTimeoutService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services[0].status).toBe('down');
      expect(result.services[0].error).toContain('Timeout after 100ms');
    });

    it('タイムアウト時間が0の場合、即座にタイムアウトすべき', async () => {
      const zeroTimeoutService = new CoreHealthService(adapters, {
        timeoutMs: 0,
      });

      // 0msタイムアウトでも実際には即座に完了する可能性があるため、
      // 少し遅延を入れてタイムアウトを確実に発生させる
      mockSupabaseAdapter.checkConnection.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 10))
      );

      const result = await zeroTimeoutService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services[0].error).toContain('Timeout after 0ms');
    });
  });

  describe('異常なレスポンス処理', () => {
    it('Supabaseアダプターがnullを返した場合、適切に処理すべき', async () => {
      mockSupabaseAdapter.checkConnection.mockResolvedValue(null as any);

      const result = await healthService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services[0].status).toBe('down');
      expect(result.services[0].error).toBe('Connection check failed');
    });

    it('Supabaseアダプターがundefinedを返した場合、適切に処理すべき', async () => {
      mockSupabaseAdapter.checkConnection.mockResolvedValue(undefined as any);

      const result = await healthService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services[0].status).toBe('down');
      expect(result.services[0].error).toBe('Connection check failed');
    });
  });

  describe('例外処理', () => {
    it('Supabaseアダプターが文字列エラーを投げた場合、適切に処理すべき', async () => {
      mockSupabaseAdapter.checkConnection.mockRejectedValue('String error');

      const result = await healthService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      // 文字列エラーはError instanceではないため、'Unknown error'になる
      expect(result.services[0].error).toBe('Unknown error');
    });

    it('Supabaseアダプターがオブジェクトエラーを投げた場合、適切に処理すべき', async () => {
      const errorObject = {
        code: 'CONNECTION_FAILED',
        details: 'Network error',
      };
      mockSupabaseAdapter.checkConnection.mockRejectedValue(errorObject);

      const result = await healthService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      // オブジェクトエラーはError instanceではないため、'Unknown error'になる
      expect(result.services[0].error).toBe('Unknown error');
    });

    it('Supabaseアダプターがnullエラーを投げた場合、適切に処理すべき', async () => {
      mockSupabaseAdapter.checkConnection.mockRejectedValue(null);

      const result = await healthService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.services[0].error).toBe('Unknown error');
    });
  });

  describe('設定の境界値テスト', () => {
    it('enableSupabaseCheckがfalseの場合、Supabaseチェックをスキップすべき', async () => {
      const disabledService = new CoreHealthService(adapters, {
        enableSupabaseCheck: false,
      });

      const result = await disabledService.performHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.services).toHaveLength(0);
      expect(mockSupabaseAdapter.checkConnection).not.toHaveBeenCalled();
    });

    it('非常に大きなタイムアウト値でも正常に動作すべき', async () => {
      const largeTimeoutService = new CoreHealthService(adapters, {
        timeoutMs: Number.MAX_SAFE_INTEGER,
      });

      mockSupabaseAdapter.checkConnection.mockResolvedValue(true);

      const result = await largeTimeoutService.performHealthCheck();

      expect(result.status).toBe('healthy');
    });
  });

  describe('並行処理テスト', () => {
    it('複数のヘルスチェックを並行実行しても正常に動作すべき', async () => {
      mockSupabaseAdapter.checkConnection.mockResolvedValue(true);

      const promises = Array.from({ length: 5 }, () =>
        healthService.performHealthCheck()
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.status).toBe('healthy');
        expect(result.services).toHaveLength(1);
      });

      // checkConnectionが5回呼ばれることを確認
      expect(mockSupabaseAdapter.checkConnection).toHaveBeenCalledTimes(5);
    });

    it('一部が失敗する並行実行でも適切に処理すべき', async () => {
      let callCount = 0;
      mockSupabaseAdapter.checkConnection.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.reject(new Error('Intermittent failure'));
        }
        return Promise.resolve(true);
      });

      const promises = Array.from({ length: 4 }, () =>
        healthService.performHealthCheck()
      );

      const results = await Promise.all(promises);

      // 成功と失敗が混在することを確認
      const healthyCount = results.filter(r => r.status === 'healthy').length;
      const unhealthyCount = results.filter(
        r => r.status === 'unhealthy'
      ).length;

      expect(healthyCount).toBe(2);
      expect(unhealthyCount).toBe(2);
    });
  });

  describe('ログ出力テスト', () => {
    it('正常ケースで適切なログが出力されるべき', async () => {
      mockSupabaseAdapter.checkConnection.mockResolvedValue(true);

      await healthService.performHealthCheck();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
        'ヘルスチェック開始'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          duration: expect.any(Number),
          servicesCount: 1,
        }),
        'ヘルスチェック完了'
      );
    });

    it('エラーケースで適切なログが出力されるべき', async () => {
      const testError = new Error('Test error');
      mockSupabaseAdapter.checkConnection.mockRejectedValue(testError);

      await healthService.performHealthCheck();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Test error',
          responseTime: expect.any(Number),
        }),
        'Supabase接続チェックでエラー発生'
      );
    });
  });

  describe('レスポンス時間の精度テスト', () => {
    it('非常に短い処理時間でも正確に測定すべき', async () => {
      mockSupabaseAdapter.checkConnection.mockResolvedValue(true);

      const result = await healthService.performHealthCheck();

      expect(result.services[0].responseTime).toBeGreaterThanOrEqual(0);
      expect(result.services[0].responseTime).toBeLessThan(100); // 100ms未満
    });

    it('処理時間が測定されていることを確認', async () => {
      // 意図的に遅延を追加
      mockSupabaseAdapter.checkConnection.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 50))
      );

      const result = await healthService.performHealthCheck();

      expect(result.services[0].responseTime).toBeGreaterThan(40);
      expect(result.services[0].responseTime).toBeLessThan(100);
    });
  });
});
