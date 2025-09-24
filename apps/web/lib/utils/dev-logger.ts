/**
 * 開発環境でのログ制御ユーティリティ
 * 開発体験向上のため、不要なエラーログを抑制する
 */

export interface DevLoggerConfig {
  suppressAuthErrors: boolean;
  suppressMiddlewareErrors: boolean;
  logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

export class DevLogger {
  private config: DevLoggerConfig;
  private isDevelopment: boolean;

  constructor(config?: Partial<DevLoggerConfig>) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.config = {
      suppressAuthErrors: true,
      suppressMiddlewareErrors: true,
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * 認証関連エラーかどうかを判定
   */
  private isAuthRelatedError(error: Error | string): boolean {
    const message = typeof error === 'string' ? error : error.message;

    const authErrorPatterns = [
      'Auth session missing',
      'session_not_found',
      'Invalid JWT',
      'refresh_token_not_found',
      'No session found',
      'JWT expired',
      'refresh_token_expired',
      'invalid_grant',
      'unauthorized',
    ];

    return authErrorPatterns.some(pattern =>
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * ミドルウェアエラーのログ出力を制御
   */
  logMiddlewareError(
    error: Error | string,
    context: {
      path: string;
      isProtectedPath: boolean;
      isAuthPath: boolean;
    }
  ): void {
    const isAuthError = this.isAuthRelatedError(error);

    // 開発環境での抑制ロジック
    if (this.isDevelopment) {
      // 認証エラーの抑制
      if (isAuthError && this.config.suppressAuthErrors) {
        return;
      }

      // ミドルウェアエラーの抑制
      if (this.config.suppressMiddlewareErrors && !context.isProtectedPath) {
        return;
      }
    }

    // ログ出力
    const errorMessage = typeof error === 'string' ? error : error.message;
    console.error('[MIDDLEWARE_SESSION_ERROR]', {
      error: errorMessage,
      path: context.path,
      isProtectedPath: context.isProtectedPath,
      isAuthPath: context.isAuthPath,
      timestamp: new Date().toISOString(),
      environment: this.isDevelopment ? 'development' : 'production',
    });
  }

  /**
   * 開発環境での情報ログ
   */
  logDevInfo(message: string, data?: Record<string, unknown>): void {
    if (this.isDevelopment && this.config.logLevel !== 'silent') {
      console.info('[DEV_INFO]', message, data || '');
    }
  }

  /**
   * 開発環境での警告ログ
   */
  logDevWarning(message: string, data?: Record<string, unknown>): void {
    if (
      this.isDevelopment &&
      ['warn', 'info', 'debug'].includes(this.config.logLevel)
    ) {
      console.warn('[DEV_WARNING]', message, data || '');
    }
  }

  /**
   * 開発環境でのデバッグログ
   */
  logDevDebug(message: string, data?: Record<string, unknown>): void {
    if (this.isDevelopment && this.config.logLevel === 'debug') {
      console.debug('[DEV_DEBUG]', message, data || '');
    }
  }
}

// デフォルトインスタンス
export const devLogger = new DevLogger();
