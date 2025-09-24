// Adapters
export { SupabaseAdapter } from './supabase/supabase-adapter';
export type {
  SupabaseConfig,
  ConnectionCheckResult,
} from './supabase/supabase-adapter';

// Re-export SupabaseClient type from @supabase/supabase-js
export type { SupabaseClient } from '@supabase/supabase-js';

export { LoggerAdapter } from './logger/logger-adapter';
export type {
  LoggerConfig,
  LogLevel,
  LogContext,
} from './logger/logger-adapter';

export { ConfigAdapter } from './config/config-adapter';
export type { EnvConfig, RetryPolicy } from './config/config-adapter';

// Environment configuration
export {
  getEnvConfig,
  isDevelopment,
  isProduction,
  isMonolithMode,
  isServiceMode,
  validateEnvConfig,
} from './config/env';
export type { BackendMode } from './config/env';

// Factory
export { AdapterFactory } from './adapter-factory';

// Utils
export {
  withRetry,
  withTimeout,
  RetryError,
  TimeoutError,
} from './utils/retry-utils';
export type { RetryOptions } from './utils/retry-utils';

export {
  generateTraceId,
  isValidTraceId,
  extractTraceIdFromHeaders,
  createTraceHeaders,
} from './utils/trace-utils';
