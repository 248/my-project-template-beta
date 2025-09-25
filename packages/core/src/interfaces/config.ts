/**
 * ヘルスチェック設定のインターフェース
 */

/**
 * ヘルスチェック設定
 */
export interface HealthCheckConfig {
  /** Supabase接続チェックを実行するかどうか */
  enableSupabaseCheck: boolean;
  /** タイムアウト時間（ミリ秒） */
  timeoutMs: number;
}

/**
 * デフォルトのヘルスチェック設定
 */
export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  enableSupabaseCheck: true,
  timeoutMs: 5000, // 5秒
};
