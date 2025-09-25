import { z } from 'zod';

export type BackendMode = 'monolith' | 'service';

// 環境変数スキーマ
export const EnvConfigSchema = z.object({
  // アプリケーション設定
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  BACKEND_MODE: z.enum(['monolith', 'service']).default('monolith'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:8787'),

  // Supabase設定
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),

  // ログ設定
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),
  PINO_LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // タイムアウト・リトライ設定
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(5000),
  HEALTH_CHECK_TIMEOUT_MS: z.coerce.number().default(3000),
  MAX_RETRY_ATTEMPTS: z.coerce.number().default(2),
  RETRY_BASE_DELAY_MS: z.coerce.number().default(1000),
  RETRY_MAX_DELAY_MS: z.coerce.number().default(10000),

  // 開発用設定
  ENABLE_PERFORMANCE_LOGGING: z.coerce.boolean().default(false),
  ENABLE_DEBUG_LOGGING: z.coerce.boolean().default(false),
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
    // Cloudflare Workers環境では、環境変数はglobalThisに注入される場合がある
    const mergedEnv = {
      ...env,
      ...this.getCloudflareEnv(),
    };
    this.config = EnvConfigSchema.parse(mergedEnv);
  }

  /**
   * Cloudflare Workers環境の環境変数を取得
   */
  private getCloudflareEnv(): Record<string, string | undefined> {
    const cloudflareEnv: Record<string, string | undefined> = {};

    // Cloudflare Workers環境で注入される環境変数をチェック
    const envKeys = Object.keys(EnvConfigSchema.shape);
    for (const key of envKeys) {
      const value = (globalThis as Record<string, unknown>)[key];
      if (value !== undefined) {
        cloudflareEnv[key] = String(value);
      }
    }

    return cloudflareEnv;
  }

  /**
   * Supabase設定を取得
   */
  getSupabaseConfig() {
    return {
      url: this.config.NEXT_PUBLIC_SUPABASE_URL || this.config.SUPABASE_URL,
      anonKey:
        this.config.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        this.config.SUPABASE_ANON_KEY,
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
   * アプリケーションURLを取得
   */
  getAppUrl(): string {
    return this.config.NEXT_PUBLIC_APP_URL;
  }

  /**
   * ヘルスチェックタイムアウトを取得
   */
  getHealthCheckTimeoutMs(): number {
    return this.config.HEALTH_CHECK_TIMEOUT_MS;
  }

  /**
   * パフォーマンスログが有効かどうか
   */
  isPerformanceLoggingEnabled(): boolean {
    return this.config.ENABLE_PERFORMANCE_LOGGING;
  }

  /**
   * デバッグログが有効かどうか
   */
  isDebugLoggingEnabled(): boolean {
    return this.config.ENABLE_DEBUG_LOGGING;
  }

  /**
   * monolithモードかどうかを判定
   */
  isMonolithMode(): boolean {
    return this.config.BACKEND_MODE === 'monolith';
  }

  /**
   * serviceモードかどうかを判定
   */
  isServiceMode(): boolean {
    return this.config.BACKEND_MODE === 'service';
  }

  /**
   * 環境設定の検証
   */
  validateConfig(): void {
    try {
      // 必須設定の検証
      const supabaseUrl =
        this.config.NEXT_PUBLIC_SUPABASE_URL || this.config.SUPABASE_URL;
      const supabaseAnonKey =
        this.config.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        this.config.SUPABASE_ANON_KEY;

      if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL is required');
      }

      if (!supabaseAnonKey) {
        throw new Error(
          'NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required'
        );
      }

      if (!this.config.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
      }

      // URL形式の検証（Zodで既に検証済みだが、明示的にチェック）
      new URL(supabaseUrl);
      new URL(this.config.NEXT_PUBLIC_APP_URL);

      console.log('✅ Environment configuration validated successfully');
      console.log(
        `📋 Mode: ${this.config.BACKEND_MODE}, Environment: ${this.config.NODE_ENV}`
      );
    } catch (error) {
      console.error('❌ Environment configuration validation failed:', error);
      throw error;
    }
  }

  /**
   * 全設定を取得（デバッグ用）
   */
  getAllConfig(): EnvConfig {
    return { ...this.config };
  }
}

// 便利関数をエクスポート（後方互換性のため）
let defaultConfigAdapter: ConfigAdapter | null = null;

function getDefaultConfigAdapter(): ConfigAdapter {
  if (!defaultConfigAdapter) {
    defaultConfigAdapter = new ConfigAdapter();
  }
  return defaultConfigAdapter;
}

export function getEnvConfig(): EnvConfig {
  return getDefaultConfigAdapter().getAllConfig();
}

export function isDevelopment(): boolean {
  return getDefaultConfigAdapter().isDevelopment();
}

export function isProduction(): boolean {
  return getDefaultConfigAdapter().isProduction();
}

export function isMonolithMode(): boolean {
  return getDefaultConfigAdapter().isMonolithMode();
}

export function isServiceMode(): boolean {
  return getDefaultConfigAdapter().isServiceMode();
}

export function validateEnvConfig(): void {
  return getDefaultConfigAdapter().validateConfig();
}
