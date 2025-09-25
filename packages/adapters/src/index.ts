// Adapters
export { SupabaseAdapter } from './supabase/supabase-adapter';
export type {
  SupabaseConfig,
  ConnectionCheckResult,
} from './supabase/supabase-adapter';

// Re-export SupabaseClient type from @supabase/supabase-js
export type { SupabaseClient } from '@supabase/supabase-js';

export { LoggerAdapter } from './logger/logger-adapter';
export type { LoggerConfig, LogLevel } from './logger/logger-adapter';

export type {
  LoggerInterface,
  LogContext,
} from './interfaces/logger-interface';

export { ConfigAdapter } from './config/config-adapter';
export type {
  EnvConfig,
  RetryPolicy,
  BackendMode,
} from './config/config-adapter';

export { PerformanceMonitor } from './performance/performance-monitor';
export type {
  PerformanceMetrics,
  PerformanceStats,
  PerformanceMonitorInterface,
  PerformanceMeasurementInterface,
} from './interfaces/performance-interface';

// Environment configuration (便利関数)
export {
  getEnvConfig,
  isDevelopment,
  isProduction,
  isMonolithMode,
  isServiceMode,
  validateEnvConfig,
} from './config/config-adapter';

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
