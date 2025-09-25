/**
 * Core層が使用するAdapter層のインターフェース定義
 */

/**
 * Supabaseアダプターのインターフェース
 */
export interface SupabaseAdapter {
  /**
   * Supabaseへの接続をチェックする
   * @returns 接続が成功した場合はtrue、失敗した場合はfalse
   */
  checkConnection(): Promise<boolean>;
}

/**
 * ロガーアダプターのインターフェース
 */
export interface Logger {
  /**
   * 情報レベルのログを出力
   * @param _obj ログオブジェクト
   * @param _msg メッセージ
   */
  info(_obj: Record<string, unknown>, _msg?: string): void;

  /**
   * エラーレベルのログを出力
   * @param _obj ログオブジェクト
   * @param _msg メッセージ
   */
  error(_obj: Record<string, unknown>, _msg?: string): void;

  /**
   * 警告レベルのログを出力
   * @param _obj ログオブジェクト
   * @param _msg メッセージ
   */
  warn(_obj: Record<string, unknown>, _msg?: string): void;
}

/**
 * Core層が使用するアダプター群
 */
export interface CoreAdapters {
  supabase: SupabaseAdapter;
  logger: Logger;
}
