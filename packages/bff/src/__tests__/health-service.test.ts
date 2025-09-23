/**
 * BFF層ヘルスチェックサービスの単体テスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../services/health-service';
import type { CoreHealthServiceInterface, LoggerInterface } from '../interfaces/core-interfaces';
import type { HealthStatus } from '@template/core';

// モックCore層サービス
const mockCoreHealthService: CoreHealthServiceInterface = {
  performHealthCheck: vi.fn(),
  shouldCheckSupabase: vi.fn(),
  determineOverallStatus: vi.fn(),
};

// モックLogger
const mockLogger: LoggerInterface = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  withTraceId: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
};

describe('HealthService', () => {
  let healthService: HealthService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    healthService = new HealthService(
      mockCoreHealthService,
      mockLogger,
      {
        timeoutMs: 1000,
        operationName: 'test-health-check',
      }
    );
  });

  describe('checkHealth', () => {
    it('正常なヘルスチェック結果を返すべき', async () => {
      // モックの設定
      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        services: [
          {
            name: 'supabase',
            status: 'up',
            responseTime: 150,
          },
        ],
      };

      mockCoreHealthService.performHealthCheck.mockResolvedValue(mockHealthStatus);

      // ヘルスチェック実行
      const result = await healthService.checkHealth('test-trace-id');

      // 結果の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
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
        });
      }

      // ログが出力されているか確認
      expect(mockLogger.withTraceId).toHaveBeenCalledWith('test-trace-id');
    });

    it('Core層でエラーが発生した場合、エラーレスポンスを返すべき', async () => {
      // モックの設定
      const testError = new Error('Core service error');
      mockCoreHealthService.performHealthCheck.mockRejectedValue(testError);

      // ヘルスチェック実行
      const result = await healthService.checkHealth('test-trace-id');

      // 結果の検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe('INTERNAL_SERVER_ERROR');
        expect(result.error.traceId).toBe('test-trace-id');
        expect(result.statusCode).toBe(500);
      }

      // エラーログが出力されているか確認
      const mockLoggerWithTrace = mockLogger.withTraceId('test-trace-id');
      expect(mockLoggerWithTrace.error).toHaveBeenCalled();
    });

    it('タイムアウトが発生した場合、エラーレスポンスを返すべき', async () => {
      // モックの設定（タイムアウトをシミュレート）
      mockCoreHealthService.performHealthCheck.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000)) // 2秒遅延
      );

      // 短いタイムアウトでサービスを作成
      const shortTimeoutService = new HealthService(
        mockCoreHealthService,
        mockLogger,
        { timeoutMs: 100 } // 100ms タイムアウト
      );

      // ヘルスチェック実行
      const result = await shortTimeoutService.checkHealth('test-trace-id');

      // 結果の検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.message).toContain('タイムアウト');
      }
    });

    it('traceIdが提供されない場合、新しいtraceIdを生成すべき', async () => {
      // モックの設定
      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        services: [],
      };

      mockCoreHealthService.performHealthCheck.mockResolvedValue(mockHealthStatus);

      // traceIdなしでヘルスチェック実行
      const result = await healthService.checkHealth();

      // 結果の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.traceId).toBeDefined();
        expect(typeof result.data.traceId).toBe('string');
      }
    });

    it('バリデーションエラーが発生した場合、エラーレスポンスを返すべき', async () => {
      // モックの設定（不正なデータ）
      const invalidHealthStatus = {
        status: 'invalid-status', // 不正なステータス
        timestamp: new Date(),
        services: [],
      } as any;

      mockCoreHealthService.performHealthCheck.mockResolvedValue(invalidHealthStatus);

      // ヘルスチェック実行
      const result = await healthService.checkHealth('test-trace-id');

      // 結果の検証
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe('HEALTH_CHECK_FAILED');
        expect(result.error.error.message).toContain('Invalid health check response format');
      }
    });
  });

  describe('checkHealthWithNewTrace', () => {
    it('新しいtraceIdでヘルスチェックを実行すべき', async () => {
      // モックの設定
      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: [],
      };

      mockCoreHealthService.performHealthCheck.mockResolvedValue(mockHealthStatus);

      // 新しいtraceIdでヘルスチェック実行
      const result = await healthService.checkHealthWithNewTrace();

      // 結果の検証
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.traceId).toBeDefined();
      }
    });
  });

  describe('getConfig', () => {
    it('設定を正しく返すべき', () => {
      const config = healthService.getConfig();

      expect(config).toEqual({
        timeoutMs: 1000,
        operationName: 'test-health-check',
      });
    });
  });

  describe('convertToApiResponse', () => {
    it('Core層のHealthStatusをAPI応答形式に変換すべき', async () => {
      // プライベートメソッドのテストのため、パブリックメソッド経由でテスト
      const mockHealthStatus: HealthStatus = {
        status: 'degraded',
        timestamp: new Date('2024-01-01T12:00:00.000Z'),
        services: [
          {
            name: 'supabase',
            status: 'up',
            responseTime: 200,
          },
          {
            name: 'cache',
            status: 'down',
            error: 'Connection failed',
          },
        ],
      };

      mockCoreHealthService.performHealthCheck.mockResolvedValue(mockHealthStatus);

      const result = await healthService.checkHealth('test-trace-id');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          status: 'degraded',
          timestamp: '2024-01-01T12:00:00.000Z',
          services: [
            {
              name: 'supabase',
              status: 'up',
              responseTime: 200,
            },
            {
              name: 'cache',
              status: 'down',
              error: 'Connection failed',
            },
          ],
          traceId: 'test-trace-id',
        });
      }
    });
  });
});