import { ConfigAdapter } from './config/config-adapter';
import { LoggerAdapter } from './logger/logger-adapter';
import { SupabaseAdapter } from './supabase/supabase-adapter';

/**
 * Adapter層の全コンポーネントを管理するファクトリークラス
 */
export class AdapterFactory {
  private configAdapter: ConfigAdapter;
  private loggerAdapter: LoggerAdapter;
  private supabaseAdapter: SupabaseAdapter;

  constructor(env?: Record<string, string | undefined>) {
    // 設定を初期化
    this.configAdapter = new ConfigAdapter(env);

    // ロガーを初期化
    this.loggerAdapter = new LoggerAdapter(
      this.configAdapter.getLoggerConfig()
    );

    // Supabaseアダプターを初期化
    this.supabaseAdapter = new SupabaseAdapter(
      this.configAdapter.getSupabaseConfig()
    );
  }

  /**
   * 設定アダプターを取得
   */
  getConfigAdapter(): ConfigAdapter {
    return this.configAdapter;
  }

  /**
   * ロガーアダプターを取得
   */
  getLoggerAdapter(): LoggerAdapter {
    return this.loggerAdapter;
  }

  /**
   * Supabaseアダプターを取得
   */
  getSupabaseAdapter(): SupabaseAdapter {
    return this.supabaseAdapter;
  }

  /**
   * traceId付きロガーを取得
   */
  getLoggerWithTraceId(traceId: string): LoggerAdapter {
    return this.loggerAdapter.withTraceId(traceId);
  }

  /**
   * 全アダプターを含むオブジェクトを取得
   */
  getAllAdapters() {
    return {
      config: this.configAdapter,
      logger: this.loggerAdapter,
      supabase: this.supabaseAdapter,
    };
  }

  /**
   * デフォルト設定でアダプターを作成（静的メソッド）
   */
  static createAdapters(env?: Record<string, string | undefined>) {
    const factory = new AdapterFactory(env);
    const adapters = factory.getAllAdapters();

    // Core層のインターフェースに合わせてSupabaseAdapterをラップ
    return {
      config: adapters.config,
      logger: adapters.logger,
      supabase: {
        checkConnection: async () => {
          const result = await adapters.supabase.checkConnection();
          return result.isConnected;
        },
      },
    };
  }
}
