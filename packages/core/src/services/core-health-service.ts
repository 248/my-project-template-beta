import { CoreAdapters } from '../interfaces/adapters';
import {
  HealthCheckConfig,
  DEFAULT_HEALTH_CHECK_CONFIG,
} from '../interfaces/config';
import { HealthStatus, ServiceHealth, SystemStatus } from '../models/health';

/**
 * Core層のヘルスチェックサービス
 * ビジネスロジックを担当し、外部依存はAdapterを通じて実行する
 */
export class CoreHealthService {
  private readonly config: HealthCheckConfig;

  constructor(
    private readonly _adapters: CoreAdapters,
    config?: Partial<HealthCheckConfig>
  ) {
    this.config = { ...DEFAULT_HEALTH_CHECK_CONFIG, ...config };
  }

  /**
   * システム全体のヘルスチェックを実行する
   * @returns ヘルスチェック結果
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const services: ServiceHealth[] = [];

    this._adapters.logger.info(
      { timestamp: new Date().toISOString() },
      'ヘルスチェック開始'
    );

    // Supabase接続チェック
    if (this.config.enableSupabaseCheck) {
      const supabaseHealth = await this.checkSupabaseHealth();
      services.push(supabaseHealth);
    }

    // 全体ステータスを判定
    const overallStatus = this.determineOverallStatus(services);

    const result: HealthStatus = {
      status: overallStatus,
      timestamp: new Date(),
      services,
    };

    const duration = Date.now() - startTime;
    this._adapters.logger.info(
      {
        status: overallStatus,
        duration,
        servicesCount: services.length,
      },
      'ヘルスチェック完了'
    );

    return result;
  }

  /**
   * Supabaseの健全性をチェックする
   * @returns Supabaseの健全性情報
   */
  private async checkSupabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    const serviceName = 'supabase';

    try {
      this._adapters.logger.info({}, 'Supabase接続チェック開始');

      // タイムアウト付きでSupabase接続をチェック
      const isConnected = await this.withTimeout(
        this._adapters.supabase.checkConnection(),
        this.config.timeoutMs
      );

      const responseTime = Date.now() - startTime;

      if (isConnected) {
        this._adapters.logger.info(
          { responseTime },
          'Supabase接続チェック成功'
        );
        return {
          name: serviceName,
          status: 'up',
          responseTime,
        };
      } else {
        this._adapters.logger.warn(
          { responseTime },
          'Supabase接続チェック失敗'
        );
        return {
          name: serviceName,
          status: 'down',
          responseTime,
          error: 'Connection check failed',
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this._adapters.logger.error(
        { error: errorMessage, responseTime },
        'Supabase接続チェックでエラー発生'
      );

      return {
        name: serviceName,
        status: 'down',
        responseTime,
        error: errorMessage,
      };
    }
  }

  /**
   * 各サービスの状態から全体ステータスを判定する
   * @param services サービス健全性情報の配列
   * @returns システム全体の状態
   */
  private determineOverallStatus(services: ServiceHealth[]): SystemStatus {
    if (services.length === 0) {
      // サービスチェックが無い場合は健全とみなす
      return 'healthy';
    }

    const downServices = services.filter(service => service.status === 'down');
    const upServices = services.filter(service => service.status === 'up');

    if (downServices.length === 0) {
      // すべてのサービスが正常
      return 'healthy';
    } else if (upServices.length > 0) {
      // 一部のサービスが正常、一部が異常
      return 'degraded';
    } else {
      // すべてのサービスが異常
      return 'unhealthy';
    }
  }

  /**
   * タイムアウト付きでPromiseを実行する
   * @param promise 実行するPromise
   * @param timeoutMs タイムアウト時間（ミリ秒）
   * @returns Promise結果
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * 設定を取得する（テスト用）
   * @returns 現在の設定
   */
  getConfig(): HealthCheckConfig {
    return { ...this.config };
  }
}
