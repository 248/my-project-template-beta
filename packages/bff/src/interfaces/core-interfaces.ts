/**
 * BFF層がCore層と連携するためのインターフェース定義
 */

import type { HealthStatus } from '@template/core';

/**
 * ヘルスチェックサービスのインターフェース
 */
export interface HealthServiceInterface {
  /**
   * システム全体のヘルスチェックを実行する
   */
  performHealthCheck(): Promise<HealthStatus>;
}

/**
 * ロガーインターフェース
 */
export interface LoggerInterface {
  /**
   * 情報レベルのログを出力
   */
  info(obj: Record<string, unknown>, msg?: string): void;

  /**
   * エラーレベルのログを出力
   */
  error(obj: Record<string, unknown>, msg?: string): void;

  /**
   * 警告レベルのログを出力
   */
  warn(obj: Record<string, unknown>, msg?: string): void;

  /**
   * デバッグレベルのログを出力
   */
  debug(obj: Record<string, unknown>, msg?: string): void;

  /**
   * traceIdを付与したロガーを取得
   */
  withTraceId(traceId: string): LoggerInterface;
}

/**
 * Core層のヘルスチェックサービスインターフェース
 * @deprecated 統一インターフェースHealthServiceInterfaceを使用してください
 */
export interface CoreHealthServiceInterface extends HealthServiceInterface {}
