import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CoreAdapters } from '../interfaces/adapters';
import { HealthCheckConfig } from '../interfaces/config';
import { CoreHealthService } from '../services/core-health-service';

describe('CoreHealthService', () => {
  let mockAdapters: CoreAdapters;
  let service: CoreHealthService;

  beforeEach(() => {
    mockAdapters = {
      supabase: {
        checkConnection: vi.fn(),
      },
      logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
    };

    service = new CoreHealthService(mockAdapters);
  });

  describe('performHealthCheck', () => {
    it('Supabaseが正常な場合、healthyステータスを返す', async () => {
      // Arrange
      vi.mocked(mockAdapters.supabase.checkConnection).mockResolvedValue(true);

      // Act
      const result = await service.performHealthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.services).toHaveLength(1);
      expect(result.services[0].name).toBe('supabase');
      expect(result.services[0].status).toBe('up');
      expect(result.services[0].responseTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('Supabaseが異常な場合、unhealthyステータスを返す', async () => {
      // Arrange
      vi.mocked(mockAdapters.supabase.checkConnection).mockResolvedValue(false);

      // Act
      const result = await service.performHealthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services).toHaveLength(1);
      expect(result.services[0].name).toBe('supabase');
      expect(result.services[0].status).toBe('down');
      expect(result.services[0].error).toBe('Connection check failed');
    });

    it('Supabase接続でエラーが発生した場合、unhealthyステータスを返す', async () => {
      // Arrange
      const errorMessage = 'Network error';
      vi.mocked(mockAdapters.supabase.checkConnection).mockRejectedValue(
        new Error(errorMessage)
      );

      // Act
      const result = await service.performHealthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services).toHaveLength(1);
      expect(result.services[0].name).toBe('supabase');
      expect(result.services[0].status).toBe('down');
      expect(result.services[0].error).toBe(errorMessage);
    });

    it('Supabaseチェックが無効な場合、healthyステータスを返す', async () => {
      // Arrange
      const config: Partial<HealthCheckConfig> = {
        enableSupabaseCheck: false,
      };
      service = new CoreHealthService(mockAdapters, config);

      // Act
      const result = await service.performHealthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.services).toHaveLength(0);
      expect(mockAdapters.supabase.checkConnection).not.toHaveBeenCalled();
    });

    it('タイムアウトが発生した場合、unhealthyステータスを返す', async () => {
      // Arrange
      const config: Partial<HealthCheckConfig> = {
        timeoutMs: 100, // 100ms
      };
      service = new CoreHealthService(mockAdapters, config);

      // 200ms後に解決するPromiseを返す（タイムアウトより長い）
      vi.mocked(mockAdapters.supabase.checkConnection).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 200))
      );

      // Act
      const result = await service.performHealthCheck();

      // Assert
      expect(result.status).toBe('unhealthy');
      expect(result.services).toHaveLength(1);
      expect(result.services[0].status).toBe('down');
      expect(result.services[0].error).toContain('Timeout after 100ms');
    });
  });

  describe('determineOverallStatus', () => {
    it('サービスが無い場合、healthyを返す', async () => {
      // Arrange
      const config: Partial<HealthCheckConfig> = {
        enableSupabaseCheck: false,
      };
      service = new CoreHealthService(mockAdapters, config);

      // Act
      const result = await service.performHealthCheck();

      // Assert
      expect(result.status).toBe('healthy');
    });
  });

  describe('getConfig', () => {
    it('設定を正しく返す', () => {
      // Act
      const config = service.getConfig();

      // Assert
      expect(config.enableSupabaseCheck).toBe(true);
      expect(config.timeoutMs).toBe(5000);
    });

    it('カスタム設定を正しく返す', () => {
      // Arrange
      const customConfig: Partial<HealthCheckConfig> = {
        enableSupabaseCheck: false,
        timeoutMs: 3000,
      };
      service = new CoreHealthService(mockAdapters, customConfig);

      // Act
      const config = service.getConfig();

      // Assert
      expect(config.enableSupabaseCheck).toBe(false);
      expect(config.timeoutMs).toBe(3000);
    });
  });

  describe('ログ出力', () => {
    it('ヘルスチェック開始時にログを出力する', async () => {
      // Arrange
      vi.mocked(mockAdapters.supabase.checkConnection).mockResolvedValue(true);

      // Act
      await service.performHealthCheck();

      // Assert
      expect(mockAdapters.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: expect.any(String) }),
        'ヘルスチェック開始'
      );
    });

    it('ヘルスチェック完了時にログを出力する', async () => {
      // Arrange
      vi.mocked(mockAdapters.supabase.checkConnection).mockResolvedValue(true);

      // Act
      await service.performHealthCheck();

      // Assert
      expect(mockAdapters.logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          duration: expect.any(Number),
          servicesCount: 1,
        }),
        'ヘルスチェック完了'
      );
    });

    it('Supabase接続エラー時にエラーログを出力する', async () => {
      // Arrange
      const errorMessage = 'Connection failed';
      vi.mocked(mockAdapters.supabase.checkConnection).mockRejectedValue(
        new Error(errorMessage)
      );

      // Act
      await service.performHealthCheck();

      // Assert
      expect(mockAdapters.logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: errorMessage,
          responseTime: expect.any(Number),
        }),
        'Supabase接続チェックでエラー発生'
      );
    });
  });
});
