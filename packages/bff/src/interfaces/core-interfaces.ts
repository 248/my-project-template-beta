/**
 * BFF層がCore層と連携するためのインターフェース定義
 */

import type { HealthStatus } from '@template/core';

/**
 * Core層のヘルスチェックサービスインターフェース
 */
export interface CoreHealthServiceInterface {
  performHealthCheck(): Promise<HealthStatus>;
}

/**
 * ロガーインターフェース
 */
export interface LoggerInterface {
  info(obj: any, msg?: string): void;
  error(obj: any, msg?: string): void;
  warn(obj: any, msg?: string): void;
  withTraceId(traceId: string): LoggerInterface;
}
