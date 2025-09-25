/**
 * Core層のサービスインターフェース定義
 * BFF層との統一されたインターフェース
 */

import { HealthStatus } from '../models/health';

import { HealthCheckConfig } from './config';

/**
 * ヘルスチェックサービスのインターフェース
 */
export interface HealthServiceInterface {
  /**
   * システム全体のヘルスチェックを実行する
   * @returns ヘルスチェック結果
   */
  performHealthCheck(): Promise<HealthStatus>;

  /**
   * 設定を取得する
   * @returns 現在の設定
   */
  getConfig(): HealthCheckConfig;
}

/**
 * ロガーインターフェース（統一版）
 */
export interface LoggerInterface {
  /**
   * 情報レベルのログを出力
   */
  info(_obj: Record<string, unknown>, _msg?: string): void;

  /**
   * エラーレベルのログを出力
   */
  error(_obj: Record<string, unknown>, _msg?: string): void;

  /**
   * 警告レベルのログを出力
   */
  warn(_obj: Record<string, unknown>, _msg?: string): void;

  /**
   * デバッグレベルのログを出力
   */
  debug(_obj: Record<string, unknown>, _msg?: string): void;

  /**
   * traceIdを付与したロガーを取得
   */
  withTraceId(_traceId: string): LoggerInterface;
}

/**
 * Supabaseアダプターインターフェース（統一版）
 */
export interface SupabaseAdapterInterface {
  /**
   * Supabaseへの接続をチェックする
   */
  checkConnection(): Promise<boolean>;

  /**
   * 接続情報を取得する
   */
  getConnectionInfo(): {
    url: string;
    status: 'connected' | 'disconnected' | 'unknown';
  };
}
