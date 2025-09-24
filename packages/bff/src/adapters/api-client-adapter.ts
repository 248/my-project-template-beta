/**
 * API Client Adapter
 * BACKEND_MODE切替に対応したAPIクライアント
 */

import { isMonolithMode, getEnvConfig } from '@template/adapters';
import { getHealth } from '@template/generated';
import type { HealthResponse } from '@template/generated';

export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
}

export class ApiClientAdapter {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig = {}) {
    const envConfig = getEnvConfig();
    this.config = {
      baseUrl: config.baseUrl || envConfig.NEXT_PUBLIC_APP_URL,
      timeout: config.timeout || envConfig.DEFAULT_TIMEOUT_MS,
    };
  }

  /**
   * ヘルスチェックAPI呼び出し
   * monolithモード: 直接BFFサービス呼び出し
   * serviceモード: 外部API呼び出し
   */
  async getHealth(): Promise<HealthResponse> {
    if (isMonolithMode()) {
      // monolithモード: 直接BFFサービス呼び出し（同一Worker内）
      const { HealthService } = await import('../services/health-service');
      const { AdapterFactory } = await import('@template/adapters');
      const { CoreHealthService } = await import('@template/core');

      const adapters = AdapterFactory.createAdapters();
      const coreHealthService = new CoreHealthService(adapters);
      const healthService = new HealthService(
        coreHealthService,
        adapters.logger,
        adapters.performance,
        {
          timeoutMs: this.config.timeout!,
          operationName: 'api-client-health-check',
        }
      );

      const result = await healthService.checkHealth();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(`Health check failed: ${result.error.error.message}`);
      }
    } else {
      // serviceモード: 外部API呼び出し
      const result = await getHealth({
        signal: AbortSignal.timeout(this.config.timeout!),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ApiClientAdapter/1.0',
        },
      });

      return result.data;
    }
  }

  /**
   * 外部サービス接続の最小疎通テスト（serviceモード用）
   */
  async testExternalConnection(): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = performance.now();

    try {
      // 外部API呼び出しをテスト
      const response = await fetch(`${this.config.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ApiClientAdapter-Test/1.0',
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      const responseTime = performance.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // レスポンスの基本検証
      const data = await response.json();
      if (!data || typeof data !== 'object' || !('status' in data)) {
        return {
          success: false,
          responseTime,
          error: 'Invalid response format',
        };
      }

      return {
        success: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
