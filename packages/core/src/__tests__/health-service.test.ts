/**
 * Core層ヘルスチェックサービスの単体テスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreHealthService } from '../services/core-health-service';
import type { SupabaseAdapterInterface, LoggerInterface } from '../interfaces/adapter-interfaces';

// モックアダプター
const mockSupabaseAdapter: SupabaseAdapterInterface = {
  checkConnection: vi.fn(),
  getConnectionInfo: vi.fn(),
};

const mockLogger: LoggerInterface = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  withTraceId: vi.fn().mockReturnThis(),
};

describe('CoreHealthService', () => {
  let healthService: CoreHealthService;
  let adapters: {
    supabase: SupabaseAdapterInterface;
    logger: LoggerInterface;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    adapters = {
      supabase: mockSupabaseAdapter,
      logger: mockLogger,
    };

    healthService = new CoreHealthService(adapters);
  });

  describe('performHealthCheck', () => {
    it('すべてのサービスが正常な場合、healthyステータスを返すべき', async () => {
      // モックの設定
      mockSupabaseAdapter.checkConnection.mockResolvedValue(true);
      mockSupabaseAdapter.getConnectionInfo.mockReturnValue({
        url: 'https://test.supabase.co',
        status: 'connected',
      });

      // ヘルスチェック実行
      const result = await healthService.performHealthCheck();

      // 結果の検証
      expect(result.status).toBe('healthy');
      expect(result.services).toHaveLength(1);
      expect(result.services[0]).toEqual({
        name: 'supabase',
        status: 'up',
        responseTime: expect.any(Number),
      });
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('Supabaseが接続できない場合、unhealthyステータスを返すべき', async () => {
      // モックの設定
      mockSupabaseAdapter.checkConnection.mockResolvedValue(false);
      mockSupabaseAdapter.getConnectionInfo.mockReturnValue({
        url: 'https://test.supabase.co',
        status: 'disconnected',
      });

      // ヘルスチェック実行
      const result = await healthService.performHealthCheck();

      // 結果の検証
      expect(result.status).toBe('unhealthy');
      expect(result.services).toHaveLength(1);
      expect(result.services[0]).toEqual({
        name: 'supabase',
        status: 'down',
        responseTime: expect.any(Number),
        error: 'Connection check failed',
      });
    });

    it('Supabaseチェックでエラーが発生した場合、unhealthyステータスを返すべき', async () => {
      // モックの設定
      const testError = new Error('Connection timeout');
      mockSupabaseAdapter.checkConnection.mockRejectedValue(testError);

      // ヘルスチェック実行
      const result = await healthService.performHealthCheck();

      // 結果の検証
      expect(result.status).toBe('unhealthy');
      expect(result.services).toHaveLength(1);
      expect(result.services[0]).toEqual({
        name: 'supabase',
        status: 'down',
        responseTime: expect.any(Number),
        error: 'Connection timeout',
      });

      // エラーログが出力されているか確認
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Connection timeout',
          responseTime: expect.any(Number),
        }),
        'Supabase接続チェックでエラー発生'
      );
    });

    it('レスポンス時間が正しく測定されるべき', async () => {
      // モックの設定（遅延をシミュレート）
      mockSupabaseAdapter.checkConnection.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 100))
      );

      // ヘルスチェック実行
      const result = await healthService.performHealthCheck();

      // レスポンス時間の検証
      expect(result.services[0].responseTime).toBeGreaterThan(90);
      expect(result.services[0].responseTime).toBeLessThan(200);
    });

    it('複数のサービスが混在する場合、degradedステータスを返すべき', async () => {
      // 将来の拡張を想定したテスト
      // 現在はSupabaseのみだが、将来的に他のサービスが追加された場合のテスト
      
      // モックの設定（Supabaseは正常）
      mockSupabaseAdapter.checkConnection.mockResolvedValue(true);

      // ヘルスチェック実行
      const result = await healthService.performHealthCheck();

      // 現在は1つのサービスのみなので、healthyまたはunhealthyのみ
      expect(['healthy', 'unhealthy']).toContain(result.status);
    });
  });

  describe('getConfig', () => {
    it('設定を正しく返すべき', () => {
      const config = healthService.getConfig();
      expect(config).toBeDefined();
      expect(config.enableSupabaseCheck).toBe(true);
    });
  });

  describe('ステータス判定の統合テスト', () => {
    it('すべてのサービスがupの場合、healthyを返すべき', async () => {
      // モックの設定
      mockSupabaseAdapter.checkConnection.mockResolvedValue(true);

      // ヘルスチェック実行
      const result = await healthService.performHealthCheck();

      // 結果の検証
      expect(result.status).toBe('healthy');
    });

    it('すべてのサービスがdownの場合、unhealthyを返すべき', async () => {
      // モックの設定
      mockSupabaseAdapter.checkConnection.mockResolvedValue(false);

      // ヘルスチェック実行
      const result = await healthService.performHealthCheck();

      // 結果の検証
      expect(result.status).toBe('unhealthy');
    });

    it('Supabaseチェックが無効の場合、healthyを返すべき', async () => {
      // Supabaseチェックを無効にしたサービスを作成
      const configuredService = new CoreHealthService(adapters, {
        enableSupabaseCheck: false,
      });

      // ヘルスチェック実行
      const result = await configuredService.performHealthCheck();

      // 結果の検証（サービスチェックなしでhealthy）
      expect(result.status).toBe('healthy');
      expect(result.services).toHaveLength(0);
    });
  });
});