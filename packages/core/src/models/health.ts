/**
 * ヘルスチェック関連のドメインモデル
 */

/**
 * サービスの健全性状態
 */
export type ServiceStatus = 'up' | 'down';

/**
 * システム全体の健全性状態
 */
export type SystemStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * 個別サービスの健全性情報
 */
export interface ServiceHealth {
  /** サービス名 */
  name: string;
  /** サービスの状態 */
  status: ServiceStatus;
  /** レスポンス時間（ミリ秒） */
  responseTime?: number;
  /** エラーメッセージ */
  error?: string;
}

/**
 * システム全体の健全性状態
 */
export interface HealthStatus {
  /** システム全体の状態 */
  status: SystemStatus;
  /** チェック実行時刻 */
  timestamp: Date;
  /** 各サービスの健全性情報 */
  services: ServiceHealth[];
}
