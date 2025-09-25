/**
 * BFF層の認証サービス
 * OAuth認証フローの処理とセッション管理を担当
 */

import { generateTraceId } from '@template/adapters';
import type { SupabaseAdapter } from '@template/adapters';
import type {
  AuthResponse,
  LogoutResponse,
  AuthLoginParams,
  AuthCallbackParams,
} from '@template/generated';

import { LoggerInterface } from '../interfaces/core-interfaces';
import {
  AuthResponseSchema,
  LogoutResponseSchema,
  LoginRequestSchema,
  CallbackRequestSchema,
} from '../schemas/auth-schemas';
import {
  BFFErrorResponse,
  AuthProviderError,
  SessionError,
  OAuthError,
  ValidationError,
  TimeoutError,
} from '../types/error-types';
import { ErrorHandler, ErrorContext } from '../utils/error-handler';

/**
 * 認証サービスの設定
 */
export interface AuthServiceConfig {
  /** タイムアウト時間（ミリ秒） */
  timeoutMs?: number;
  /** デフォルトリダイレクトURL */
  defaultRedirectUrl?: string;
  /** 許可されたリダイレクトドメイン */
  allowedRedirectDomains?: string[];
}

/**
 * 認証成功結果
 */
export interface AuthSuccessResult {
  success: true;
  data: AuthResponse;
}

/**
 * ログアウト成功結果
 */
export interface LogoutSuccessResult {
  success: true;
  data: LogoutResponse;
}

/**
 * 認証エラー結果
 */
export interface AuthErrorResult {
  success: false;
  error: BFFErrorResponse;
  statusCode: number;
}

export type AuthServiceResult = AuthSuccessResult | AuthErrorResult;
export type LogoutServiceResult = LogoutSuccessResult | AuthErrorResult;

/**
 * セッション交換結果
 */
export interface SessionExchangeResult {
  success: boolean;
  redirectTo?: string;
  error?: BFFErrorResponse;
  statusCode?: number;
}

/**
 * BFF層の認証サービス
 */
export class AuthService {
  private readonly config: Required<AuthServiceConfig>;

  constructor(
    private readonly supabaseAdapter: SupabaseAdapter,
    private readonly logger: LoggerInterface,
    config: AuthServiceConfig = {}
  ) {
    this.config = {
      timeoutMs: 10000, // デフォルト10秒
      defaultRedirectUrl: '/home',
      allowedRedirectDomains: ['localhost', '127.0.0.1'],
      ...config,
    };
  }

  /**
   * OAuth認証を開始
   */
  async handleLogin(
    params: AuthLoginParams,
    traceId?: string
  ): Promise<AuthServiceResult> {
    const requestTraceId = traceId || generateTraceId();
    const contextLogger = this.logger.withTraceId(requestTraceId);

    const errorContext: ErrorContext = {
      traceId: requestTraceId,
      logger: contextLogger,
      operation: 'auth-login',
    };

    try {
      contextLogger.info(
        {
          operation: 'auth-login',
          provider: params.provider,
          redirectTo: params.redirectTo,
        },
        'OAuth認証開始'
      );

      // パラメータをバリデーション
      const validatedParams = this.validateLoginParams(params);

      // リダイレクトURLの検証
      const redirectUrl = this.validateRedirectUrl(
        validatedParams.redirectTo || this.config.defaultRedirectUrl
      );

      // Supabase OAuth認証を実行
      const authResult = await this.executeWithTimeout(
        this.supabaseAdapter.signInWithOAuth({
          provider: validatedParams.provider as 'google' | 'github' | 'discord',
          options: {
            redirectTo: redirectUrl,
          },
        }),
        this.config.timeoutMs
      );

      if (authResult.error) {
        throw new AuthProviderError(
          `OAuth認証の開始に失敗しました: ${authResult.error.message}`,
          {
            provider: validatedParams.provider,
            supabaseError: authResult.error,
          }
        );
      }

      if (!authResult.data?.url) {
        throw new AuthProviderError('OAuth認証URLの取得に失敗しました', {
          provider: validatedParams.provider,
          authResult,
        });
      }

      // API応答形式に変換
      const apiResponse: AuthResponse = {
        data: {
          url: authResult.data.url,
        },
        traceId: requestTraceId,
      };

      // レスポンスをバリデーション
      const validatedResponse = this.validateAuthResponse(apiResponse);

      contextLogger.info(
        {
          provider: validatedParams.provider,
          authUrl: authResult.data.url,
          traceId: requestTraceId,
        },
        'OAuth認証URL生成完了'
      );

      return {
        success: true,
        data: validatedResponse,
      };
    } catch (error) {
      contextLogger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          operation: 'auth-login',
          provider: params.provider,
        },
        'OAuth認証開始でエラーが発生しました'
      );

      const errorResponse = ErrorHandler.handle(error, errorContext);
      const statusCode = ErrorHandler.getHttpStatusCode(error);

      return {
        success: false,
        error: errorResponse,
        statusCode,
      };
    }
  }

  /**
   * OAuth認証コールバックを処理
   */
  async handleCallback(
    params: AuthCallbackParams,
    traceId?: string
  ): Promise<SessionExchangeResult> {
    const requestTraceId = traceId || generateTraceId();
    const contextLogger = this.logger.withTraceId(requestTraceId);

    const errorContext: ErrorContext = {
      traceId: requestTraceId,
      logger: contextLogger,
      operation: 'auth-callback',
    };

    try {
      contextLogger.info(
        {
          operation: 'auth-callback',
          hasCode: !!params.code,
          hasState: !!params.state,
        },
        'OAuth認証コールバック処理開始'
      );

      // パラメータをバリデーション
      const validatedParams = this.validateCallbackParams(params);

      // 認証コードをセッションに交換
      const sessionResult = await this.executeWithTimeout(
        this.supabaseAdapter.exchangeCodeForSession(validatedParams.code),
        this.config.timeoutMs
      );

      if (sessionResult.error) {
        throw new OAuthError(
          `認証コードの交換に失敗しました: ${sessionResult.error.message}`,
          {
            supabaseError: sessionResult.error,
            code: validatedParams.code.substring(0, 10) + '...', // セキュリティのため一部のみログ
          }
        );
      }

      if (!sessionResult.data?.session) {
        throw new SessionError('セッションの作成に失敗しました', {
          sessionResult,
        });
      }

      contextLogger.info(
        {
          userId: sessionResult.data.session.user?.id,
          traceId: requestTraceId,
        },
        'OAuth認証コールバック処理完了'
      );

      return {
        success: true,
        redirectTo: this.config.defaultRedirectUrl,
      };
    } catch (error) {
      contextLogger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          operation: 'auth-callback',
        },
        'OAuth認証コールバック処理でエラーが発生しました'
      );

      const errorResponse = ErrorHandler.handle(error, errorContext);
      const statusCode = ErrorHandler.getHttpStatusCode(error);

      return {
        success: false,
        error: errorResponse,
        statusCode,
      };
    }
  }

  /**
   * ログアウト処理
   */
  async handleLogout(traceId?: string): Promise<LogoutServiceResult> {
    const requestTraceId = traceId || generateTraceId();
    const contextLogger = this.logger.withTraceId(requestTraceId);

    const errorContext: ErrorContext = {
      traceId: requestTraceId,
      logger: contextLogger,
      operation: 'auth-logout',
    };

    try {
      contextLogger.info(
        {
          operation: 'auth-logout',
        },
        'ログアウト処理開始'
      );

      // Supabaseからログアウト
      const logoutResult = await this.executeWithTimeout(
        this.supabaseAdapter.signOut(),
        this.config.timeoutMs
      );

      if (logoutResult.error) {
        contextLogger.warn(
          {
            supabaseError: logoutResult.error,
            traceId: requestTraceId,
          },
          'Supabaseログアウトでエラーが発生しましたが、処理を継続します'
        );
      }

      // API応答形式に変換
      const apiResponse: LogoutResponse = {
        success: true,
        message: 'ログアウトが完了しました',
        traceId: requestTraceId,
      };

      // レスポンスをバリデーション
      const validatedResponse = this.validateLogoutResponse(apiResponse);

      contextLogger.info(
        {
          traceId: requestTraceId,
        },
        'ログアウト処理完了'
      );

      return {
        success: true,
        data: validatedResponse,
      };
    } catch (error) {
      contextLogger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          operation: 'auth-logout',
        },
        'ログアウト処理でエラーが発生しました'
      );

      const errorResponse = ErrorHandler.handle(error, errorContext);
      const statusCode = ErrorHandler.getHttpStatusCode(error);

      return {
        success: false,
        error: errorResponse,
        statusCode,
      };
    }
  }

  /**
   * ログインパラメータをバリデーション
   */
  private validateLoginParams(params: AuthLoginParams): AuthLoginParams {
    try {
      return LoginRequestSchema.parse(params);
    } catch (validationError) {
      throw new ValidationError('ログインパラメータが不正です', {
        validationError:
          validationError instanceof Error
            ? validationError.message
            : 'Unknown validation error',
        params,
      });
    }
  }

  /**
   * コールバックパラメータをバリデーション
   */
  private validateCallbackParams(
    params: AuthCallbackParams
  ): AuthCallbackParams {
    try {
      return CallbackRequestSchema.parse(params);
    } catch (validationError) {
      throw new ValidationError('コールバックパラメータが不正です', {
        validationError:
          validationError instanceof Error
            ? validationError.message
            : 'Unknown validation error',
        params: {
          ...params,
          code: params.code ? params.code.substring(0, 10) + '...' : undefined, // セキュリティのため一部のみ
        },
      });
    }
  }

  /**
   * リダイレクトURLを検証
   */
  private validateRedirectUrl(url: string): string {
    try {
      const parsedUrl = new URL(url, 'http://localhost'); // 相対URLの場合のベース

      // 許可されたドメインかチェック（本番環境では厳密に制御）
      if (
        parsedUrl.hostname &&
        !this.config.allowedRedirectDomains.includes(parsedUrl.hostname)
      ) {
        this.logger.warn(
          {
            requestedUrl: url,
            hostname: parsedUrl.hostname,
            allowedDomains: this.config.allowedRedirectDomains,
          },
          '許可されていないドメインへのリダイレクトが要求されました'
        );
      }

      return url;
    } catch (error) {
      throw new ValidationError('リダイレクトURLが不正です', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 認証レスポンスをバリデーション
   */
  private validateAuthResponse(response: AuthResponse): AuthResponse {
    try {
      return AuthResponseSchema.parse(response);
    } catch (validationError) {
      throw new ValidationError('認証レスポンスの形式が不正です', {
        validationError:
          validationError instanceof Error
            ? validationError.message
            : 'Unknown validation error',
        response,
      });
    }
  }

  /**
   * ログアウトレスポンスをバリデーション
   */
  private validateLogoutResponse(response: LogoutResponse): LogoutResponse {
    try {
      return LogoutResponseSchema.parse(response);
    } catch (validationError) {
      throw new ValidationError('ログアウトレスポンスの形式が不正です', {
        validationError:
          validationError instanceof Error
            ? validationError.message
            : 'Unknown validation error',
        response,
      });
    }
  }

  /**
   * タイムアウト付きでPromiseを実行
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Auth operation timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * 設定を取得（テスト用）
   */
  getConfig(): Required<AuthServiceConfig> {
    return { ...this.config };
  }

  /**
   * 新しいtraceIdで認証処理を実行
   */
  async handleLoginWithNewTrace(
    params: AuthLoginParams
  ): Promise<AuthServiceResult> {
    return this.handleLogin(params, generateTraceId());
  }

  async handleCallbackWithNewTrace(
    params: AuthCallbackParams
  ): Promise<SessionExchangeResult> {
    return this.handleCallback(params, generateTraceId());
  }

  async handleLogoutWithNewTrace(): Promise<LogoutServiceResult> {
    return this.handleLogout(generateTraceId());
  }
}
