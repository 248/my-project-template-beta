import { z } from 'zod';

// 環境変数スキーマ
export const EnvConfigSchema = z.object({
  // Supabase設定
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // ログ設定
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // タイムアウト・リトライ設定
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(5000),
  MAX_RETRY_ATTEMPTS: z.coerce.number().default(2),
  RETRY_BASE_DELAY_MS: z.coerce.number().default(1000),
  RETRY_MAX_DELAY_MS: z.coerce.number().default(10000),

  // バックエンドモード
  BACKEND_MODE: z.enum(['monolith', 'service']).default('monolith'),
});

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

// リトライポリシー設定
export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}

export class ConfigAdapter {
  private config: EnvConfig;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.config = EnvConfigSchema.parse(env);
  }

  /**
   * Supabase設定を取得
   */
  getSupabaseConfig() {
    return {
      url: this.config.SUPABASE_URL,
      anonKey: this.config.SUPABASE_ANON_KEY,
      serviceRoleKey: this.config.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  /**
   * Logger設定を取得
   */
  getLoggerConfig() {
    return {
      level: this.config.LOG_LEVEL,
      isDevelopment: this.config.NODE_ENV === 'development',
    };
  }

  /**
   * タイムアウト設定を取得
   */
  getTimeoutMs(): number {
    return this.config.DEFAULT_TIMEOUT_MS;
  }

  /**
   * リトライポリシーを取得
   */
  getRetryPolicy(): RetryPolicy {
    return {
      maxAttempts: this.config.MAX_RETRY_ATTEMPTS,
      baseDelayMs: this.config.RETRY_BASE_DELAY_MS,
      maxDelayMs: this.config.RETRY_MAX_DELAY_MS,
      jitterFactor: 0.1, // 10%のジッター
    };
  }

  /**
   * バックエンドモードを取得
   */
  getBackendMode(): 'monolith' | 'service' {
    return this.config.BACKEND_MODE;
  }

  /**
   * 開発環境かどうか
   */
  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  /**
   * 本番環境かどうか
   */
  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  /**
   * テスト環境かどうか
   */
  isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  /**
   * 全設定を取得（デバッグ用）
   */
  getAllConfig(): EnvConfig {
    return { ...this.config };
  }
}
