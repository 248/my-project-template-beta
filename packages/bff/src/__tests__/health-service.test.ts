/**
 * HealthServiceのテスト
 */

import { LoggerAdapter } from '@template/adapters';
import { CoreHealthService, HealthStatus } from '@template/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { HealthService } from '../services/health-service';
import { BFFError, ERROR_CODES, TimeoutError } from '../types/error-types';

// モック
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  withTraceId: vi.fn(),
} as unknown as LoggerAdapter;

const mockCoreHealthService = {
  performHealthCheck: vi.fn(),
} as unknown as CoreHealthService;

describe('HealthService', () => {
  let healthService: HealthService;
  let mockLoggerWithTrace: LoggerAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockLoggerWithTrace = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    } as unknown as LoggerAdapter;

    (mockLogger.withTraceId as any).mockReturnValue(mockLoggerWithTrace);

    healthService = new HealthService(mockCoreHealthService, mockLogger, {
      timeoutMs: 1000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkHealth', () => {
    it('正常なヘルスチェック結果を返すべき', async () => {
      // Arrange
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

      (mockCoreHealthService.performHealthCheck as any).mockResolvedValue(
        mockHealthStatus
      );

      // Act
      const result = await healthService.checkHealth('test-trace-id');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('healthy');
        expect(result.data.timestamp).toBe('2024-01-01T00:00:00.000Z');
        expect(result.data.services).toHaveLength(1);
        expect(result.data.services[0].name).toBe('supabase');
        expect(result.data.services[0].status).toBe('up');
        expect(result.data.services[0].responseTime).toBe(150);
        expect(result.data.traceId).toBe('test-trace-id');
      }

      expect(mockLogger.withTraceId).toHaveBeenCalledWith('test-trace-id');
      expect(mockLoggerWithTrace.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'health-check',
          timeoutMs: 1000,
        }),
        'ヘルスチェック開始'
      );
    });

    it('degradedステータスを正しく処理すべき', async () => {
      // Arrange
      const mockHealthStatus: HealthStatus = {
        status: 'degraded',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        services: [
          {
            name: 'supabase',
            status: 'up',
            responseTime: 150,
          },
          {
            name: 'cache',
            status: 'down',
            responseTime: 5000,
            error: 'Connection timeout',
          },
        ],
      };

      (mockCoreHealthService.performHealthCheck as any).mockResolvedValue(
        mockHealthStatus
      );

      // Act
      const result = await healthService.checkHealth();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('degraded');
        expect(result.data.services).toHaveLength(2);
        expect(result.data.services[1].error).toBe('Connection timeout');
      }
    });

    it('Core層でエラーが発生した場合にエラーレスポンスを返すべき', async () => {
      // Arrange
      const error = new Error('Core service error');
      (mockCoreHealthService.performHealthCheck as any).mockRejectedValue(
        error
      );

      // Act
      const result = await healthService.checkHealth('test-trace-id');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
        expect(result.error.error.message).toBe(
          'Internal server error occurred'
        );
        expect(result.error.traceId).toBe('test-trace-id');
        expect(result.statusCode).toBe(500);
      }

      expect(mockLoggerWithTrace.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Core service error',
          operation: 'health-check',
        }),
        'ヘルスチェックでエラーが発生しました'
      );
    });

    it('タイムアウトエラーを正しく処理すべき', async () => {
      // Arrange
      const timeoutError = new TimeoutError(
        'Health check timeout after 1000ms'
      );
      (mockCoreHealthService.performHealthCheck as any).mockRejectedValue(
        timeoutError
      );

      // Act
      const result = await healthService.checkHealth('test-trace-id');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe(ERROR_CODES.TIMEOUT_ERROR);
        expect(result.error.error.message).toBe(
          'Health check timeout after 1000ms'
        );
        expect(result.statusCode).toBe(504);
      }
    });

    it('BFFErrorを正しく処理すべき', async () => {
      // Arrange
      const bffError = new BFFError(
        ERROR_CODES.HEALTH_CHECK_FAILED,
        'Health check failed',
        { reason: 'Service unavailable' }
      );
      (mockCoreHealthService.performHealthCheck as any).mockRejectedValue(
        bffError
      );

      // Act
      const result = await healthService.checkHealth('test-trace-id');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.error.code).toBe(ERROR_CODES.HEALTH_CHECK_FAILED);
        expect(result.error.error.message).toBe('Health check failed');
        expect(result.error.error.details).toEqual({
          reason: 'Service unavailable',
        });
        expect(result.statusCode).toBe(500);
      }
    });

    it('traceIdが指定されない場合に自動生成すべき', async () => {
      // Arrange
      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: [],
      };

      (mockCoreHealthService.performHealthCheck as any).mockResolvedValue(
        mockHealthStatus
      );

      // Act
      const result = await healthService.checkHealth();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.traceId).toMatch(/^[a-f0-9]{32}$/);
      }
    });
  });

  describe('checkHealthWithNewTrace', () => {
    it('新しいtraceIdでヘルスチェックを実行すべき', async () => {
      // Arrange
      const mockHealthStatus: HealthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: [],
      };

      (mockCoreHealthService.performHealthCheck as any).mockResolvedValue(
        mockHealthStatus
      );

      // Act
      const result = await healthService.checkHealthWithNewTrace();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.traceId).toMatch(/^[a-f0-9]{32}$/);
      }
    });
  });

  describe('getConfig', () => {
    it('設定を正しく返すべき', () => {
      // Act
      const config = healthService.getConfig();

      // Assert
      expect(config.timeoutMs).toBe(1000);
      expect(config.operationName).toBe('health-check');
    });
  });
});
