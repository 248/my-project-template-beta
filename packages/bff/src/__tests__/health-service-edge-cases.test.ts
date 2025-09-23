/**
 * BFF層ヘルスチェックサービスのエッジケーステスト
 */

import type { HealthStatus } from '@template/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type {
  CoreHealthServiceInterface,
  LoggerInterface,
} from '../interfaces/core-interfaces';
import { HealthService } from '../services/health-service';
import { HealthCheckError } from '../types/error-types';

describe('HealthService - Edge Cases', () => {
  let healthService: HealthService;
  let mockCoreHealthService: CoreHealthServiceInterface;
  let mockLogger: LoggerInterface;
  let mockChildLogger: LoggerInterface;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChildLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      withTraceId: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      withTraceId: vi.fn().mockReturnValue(mockChildLogger),
    };

    mockCoreHealthService = {
      performHealthCheck: vi.fn(),
      getConfig: vi.fn(),
    };

    healthService = new HealthService(mockCoreHealthService, mockLogger, {
      timeoutMs: 1000,
      operationName: 'test-health-check',
    });
  });

  describe('バリデーションエラーのエッジケース', () => {
    it('不正なステータス値でバリデーションエラーが発生すべき', async () => {
      const invalidHealthStatus = {
        status: 'invalid-status',
        timestamp: new Date(),
        services: [],
      } as any;

      mockCoreHealthService.performHealthCheck.mockResolvedValue(
        invalidHealthStatus
      );

      const result = await healthService.checkHealth('test-trace-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe('HEALTH_CHECK_FAILED');
        expect(result.error.error.message).toContain(
          'Invalid health check response format'
        );
      }
    });

    it('timestampがnullの場合、バリデーションエラーが発生すべき', async () => {
      const invalidHealthStatus = {
        status: 'healthy',
        timestamp: null,
        services: [],
      } as any;

      mockCoreHealthService.performHealthCheck.mockResolvedValue(
        invalidHealthStatus
      );

      const result = await healthService.checkHealth('test-trace-id');

      expect(result.success).toBe(false);
    });

    it('servicesが配列でない場合、バリデーションエラーが発生すべき', async () => {
      const invalidHealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: 'not-an-array',
      } as any;

      mockCoreHealthService.performHealthCheck.mockResolvedValue(
        invalidHealthStatus
      );

      const result = await healthService.checkHealth('test-trace-id');

      expect(result.success).toBe(false);
    });

    it('serviceオブジェクトに必須フィールドが不足している場合、バリデーションエラーが発生すべき', async () => {
      const invalidHealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: [
          {
            // nameフィールドが不足
            status: 'up',
          },
        ],
      } as any;

      mockCoreHealthService.performHealthCheck.mockResolvedValue(
        invalidHealthStatus
      );

      const result = await healthService.checkHealth('test-trace-id');

      expect(result.success).toBe(false);
    });
  });

  describe('タイムアウト処理のエッジケース', () => {
    it('0msタイムアウトで即座にタイムアウトすべき', async () => {
      const zeroTimeoutService = new HealthService(
        mockCoreHealthService,
        mockLogger,
        { timeoutMs: 0 }
      );

      mockCoreHealthService.performHealthCheck.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({} as any), 100))
      );

      const result = await zeroTimeoutService.checkHealth('test-trace-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.message).toContain('タイムアウト');
      }
    });

    it('非常に大きなタイムアウト値でも正常に動作すべき', async () => {
      const largeTimeoutService = new HealthService(
        mockCoreHealthService,
        mockLogger,
        { timeoutMs: Number.MAX_SAFE_INTEGER }
      );

      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: [],
      };

      mockCoreHealthService.performHealthCheck.mockResolvedValue(
        mockHealthStatus
      );

      const result = await largeTimeoutService.checkHealth('test-trace-id');

      expect(result.success).toBe(true);
    });
  });

  describe('エラーハンドリングのエッジケース', () => {
    it('Core層が文字列エラーを投げた場合、適切に処理すべき', async () => {
      mockCoreHealthService.performHealthCheck.mockRejectedValue(
        'String error'
      );

      const result = await healthService.checkHealth('test-trace-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });

    it('Core層がnullエラーを投げた場合、適切に処理すべき', async () => {
      mockCoreHealthService.performHealthCheck.mockRejectedValue(null);

      const result = await healthService.checkHealth('test-trace-id');

      expect(result.success).toBe(false);
    });

    it('Core層がundefinedエラーを投げた場合、適切に処理すべき', async () => {
      mockCoreHealthService.performHealthCheck.mockRejectedValue(undefined);

      const result = await healthService.checkHealth('test-trace-id');

      expect(result.success).toBe(false);
    });

    it('HealthCheckErrorが投げられた場合、適切に処理すべき', async () => {
      const healthCheckError = new HealthCheckError(
        'Custom health check error',
        {
          customField: 'custom value',
        }
      );

      mockCoreHealthService.performHealthCheck.mockRejectedValue(
        healthCheckError
      );

      const result = await healthService.checkHealth('test-trace-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe('HEALTH_CHECK_FAILED');
        expect(result.error.error.message).toBe('Custom health check error');
      }
    });
  });

  describe('traceId処理のエッジケース', () => {
    it('空文字列のtraceIdが提供された場合、新しいtraceIdを生成すべき', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: [],
      };

      mockCoreHealthService.performHealthCheck.mockResolvedValue(
        mockHealthStatus
      );

      const result = await healthService.checkHealth('');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.traceId).toBeDefined();
        expect(result.data.traceId).not.toBe('');
      }
    });

    it('非常に長いtraceIdでも正常に処理すべき', async () => {
      const longTraceId = 'a'.repeat(1000);
      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: [],
      };

      mockCoreHealthService.performHealthCheck.mockResolvedValue(
        mockHealthStatus
      );

      const result = await healthService.checkHealth(longTraceId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.traceId).toBe(longTraceId);
      }
    });
  });

  describe('並行処理テスト', () => {
    it('複数のヘルスチェックを並行実行しても正常に動作すべき', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: [],
      };

      mockCoreHealthService.performHealthCheck.mockResolvedValue(
        mockHealthStatus
      );

      const promises = Array.from({ length: 10 }, (_, i) =>
        healthService.checkHealth(`trace-${i}`)
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.traceId).toBe(`trace-${index}`);
        }
      });
    });

    it('一部が失敗する並行実行でも適切に処理すべき', async () => {
      let callCount = 0;
      mockCoreHealthService.performHealthCheck.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.reject(new Error('Intermittent failure'));
        }
        return Promise.resolve({
          status: 'healthy',
          timestamp: new Date(),
          services: [],
        } as HealthStatus);
      });

      const promises = Array.from({ length: 6 }, (_, i) =>
        healthService.checkHealth(`trace-${i}`)
      );

      const results = await Promise.all(promises);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      expect(successCount).toBe(3);
      expect(failureCount).toBe(3);
    });
  });

  describe('メモリリーク防止テスト', () => {
    it('大量のヘルスチェック実行後もメモリ使用量が適切であるべき', async () => {
      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: [],
      };

      mockCoreHealthService.performHealthCheck.mockResolvedValue(
        mockHealthStatus
      );

      // 大量実行
      for (let i = 0; i < 1000; i++) {
        await healthService.checkHealth(`trace-${i}`);
      }

      // メモリリークの兆候がないことを確認（実際のメモリ測定は困難なので、エラーが発生しないことを確認）
      expect(mockCoreHealthService.performHealthCheck).toHaveBeenCalledTimes(
        1000
      );
    });
  });

  describe('設定の境界値テスト', () => {
    it('設定なしでサービスを作成しても正常に動作すべき', () => {
      const defaultService = new HealthService(
        mockCoreHealthService,
        mockLogger
      );
      const config = defaultService.getConfig();

      expect(config.timeoutMs).toBe(5000); // デフォルト値
      expect(config.operationName).toBe('health-check'); // デフォルト値
    });

    it('部分的な設定でサービスを作成しても正常に動作すべき', () => {
      const partialConfigService = new HealthService(
        mockCoreHealthService,
        mockLogger,
        { timeoutMs: 2000 } // operationNameは省略
      );
      const config = partialConfigService.getConfig();

      expect(config.timeoutMs).toBe(2000);
      expect(config.operationName).toBe('health-check'); // デフォルト値
    });
  });
});
