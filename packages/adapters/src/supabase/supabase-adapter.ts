import { createServerClient } from '@supabase/ssr';
import { createClient, SupabaseClient, Provider } from '@supabase/supabase-js';
import { z } from 'zod';

// 設定スキーマ
export const SupabaseConfigSchema = z.object({
  url: z.string().url(),
  anonKey: z.string(),
  serviceRoleKey: z.string().optional(),
});

export type SupabaseConfig = z.infer<typeof SupabaseConfigSchema>;

// 接続チェック結果
export interface ConnectionCheckResult {
  isConnected: boolean;
  responseTime?: number;
  error?: string;
}

export class SupabaseAdapter {
  private client: SupabaseClient;
  private config: SupabaseConfig;

  constructor(config: SupabaseConfig) {
    this.config = SupabaseConfigSchema.parse(config);
    this.client = createClient(this.config.url, this.config.anonKey);
  }

  /**
   * サーバーサイド用のSupabaseクライアントを作成
   * SSR環境でのCookie管理に対応
   */
  createServerClient(cookieStore: {
    getAll(): Array<{ name: string; value: string }>;
    setAll(
      cookies: Array<{
        name: string;
        value: string;
        options?: {
          domain?: string;
          expires?: Date;
          httpOnly?: boolean;
          maxAge?: number;
          path?: string;
          sameSite?: 'strict' | 'lax' | 'none';
          secure?: boolean;
        };
      }>
    ): void;
  }) {
    return createServerClient(this.config.url, this.config.anonKey, {
      cookies: cookieStore,
    });
  }

  /**
   * Supabase接続チェックを実行
   * 軽量なクエリでデータベース接続を確認
   */
  async checkConnection(): Promise<ConnectionCheckResult> {
    const startTime = Date.now();

    try {
      // 軽量なクエリでヘルスチェック
      // pg_stat_activity テーブルから1行取得（権限不要）
      const { error } = await this.client
        .rpc('version') // PostgreSQL version関数を呼び出し
        .single();

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          isConnected: false,
          responseTime,
          error: error.message,
        };
      }

      return {
        isConnected: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        isConnected: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * OAuth認証の開始
   */
  async signInWithOAuth(params: {
    provider: Provider;
    options?: {
      redirectTo?: string;
      scopes?: string;
    };
  }) {
    return this.client.auth.signInWithOAuth({
      provider: params.provider,
      options: params.options,
    });
  }

  /**
   * 認証コードをセッションに交換
   */
  async exchangeCodeForSession(code: string) {
    return this.client.auth.exchangeCodeForSession(code);
  }

  /**
   * セッション取得
   */
  async getSession() {
    return this.client.auth.getSession();
  }

  /**
   * ログアウト
   */
  async signOut() {
    return this.client.auth.signOut();
  }

  /**
   * クライアントインスタンスを取得（必要に応じて）
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}
