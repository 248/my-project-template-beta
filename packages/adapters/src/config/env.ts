/**
 * 環境変数管理とBACKEND_MODE切替機能
 * ENV優先順位: CI → wrangler secret → .dev.vars → process.env → デフォルト値
 */

export type BackendMode = 'monolith' | 'service';

export interface EnvConfig {
  // アプリケーション設定
  NODE_ENV: string;
  BACKEND_MODE: BackendMode;
  NEXT_PUBLIC_APP_URL: string;

  // Supabase設定
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // ログ設定
  LOG_LEVEL: string;
  PINO_LOG_LEVEL: string;

  // パフォーマンス設定
  DEFAULT_TIMEOUT_MS: number;
  HEALTH_CHECK_TIMEOUT_MS: number;

  // 開発用設定
  ENABLE_PERFORMANCE_LOGGING: boolean;
  ENABLE_DEBUG_LOGGING: boolean;
}

/**
 * 環境変数を取得（優先順位に従って）
 */
function getEnvVar(key: string, defaultValue?: string): string {
  // Cloudflare Workers環境では、環境変数はglobalThisに注入される
  const value =
    (globalThis as Record<string, unknown>)[key] || // wrangler secret / CI
    process.env[key] || // .dev.vars / process.env
    defaultValue;

  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return value;
}

/**
 * 環境変数を数値として取得
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = getEnvVar(key, defaultValue.toString());
  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    throw new Error(
      `Environment variable ${key} must be a valid number, got: ${value}`
    );
  }

  return parsed;
}

/**
 * 環境変数をブール値として取得
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = getEnvVar(key, defaultValue.toString()).toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * BACKEND_MODEを取得・検証
 */
function getBackendMode(): BackendMode {
  const mode = getEnvVar('BACKEND_MODE', 'monolith') as BackendMode;

  if (mode !== 'monolith' && mode !== 'service') {
    throw new Error(
      `Invalid BACKEND_MODE: ${mode}. Must be 'monolith' or 'service'`
    );
  }

  return mode;
}

/**
 * 環境設定を取得
 */
export function getEnvConfig(): EnvConfig {
  return {
    // アプリケーション設定
    NODE_ENV: getEnvVar('NODE_ENV', 'development'),
    BACKEND_MODE: getBackendMode(),
    NEXT_PUBLIC_APP_URL: getEnvVar(
      'NEXT_PUBLIC_APP_URL',
      'http://localhost:8787'
    ),

    // Supabase設定
    NEXT_PUBLIC_SUPABASE_URL: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),

    // ログ設定
    LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
    PINO_LOG_LEVEL: getEnvVar('PINO_LOG_LEVEL', 'info'),

    // パフォーマンス設定
    DEFAULT_TIMEOUT_MS: getEnvNumber('DEFAULT_TIMEOUT_MS', 5000),
    HEALTH_CHECK_TIMEOUT_MS: getEnvNumber('HEALTH_CHECK_TIMEOUT_MS', 3000),

    // 開発用設定
    ENABLE_PERFORMANCE_LOGGING: getEnvBoolean(
      'ENABLE_PERFORMANCE_LOGGING',
      false
    ),
    ENABLE_DEBUG_LOGGING: getEnvBoolean('ENABLE_DEBUG_LOGGING', false),
  };
}

/**
 * 開発環境かどうかを判定
 */
export function isDevelopment(): boolean {
  return getEnvVar('NODE_ENV', 'development') === 'development';
}

/**
 * 本番環境かどうかを判定
 */
export function isProduction(): boolean {
  return getEnvVar('NODE_ENV', 'development') === 'production';
}

/**
 * monolithモードかどうかを判定
 */
export function isMonolithMode(): boolean {
  return getBackendMode() === 'monolith';
}

/**
 * serviceモードかどうかを判定
 */
export function isServiceMode(): boolean {
  return getBackendMode() === 'service';
}

/**
 * 環境設定の検証
 */
export function validateEnvConfig(): void {
  try {
    const config = getEnvConfig();

    // 必須設定の検証
    if (!config.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
    }

    if (!config.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    }

    if (!config.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
    }

    // URL形式の検証
    try {
      new URL(config.NEXT_PUBLIC_SUPABASE_URL);
      new URL(config.NEXT_PUBLIC_APP_URL);
    } catch (error) {
      throw new Error('Invalid URL format in environment variables');
    }

    console.log('✅ Environment configuration validated successfully');
    console.log(
      `📋 Mode: ${config.BACKEND_MODE}, Environment: ${config.NODE_ENV}`
    );
  } catch (error) {
    console.error('❌ Environment configuration validation failed:', error);
    throw error;
  }
}
