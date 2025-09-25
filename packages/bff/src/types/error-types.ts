/**
 * BFF層のエラー型定義
 */

/**
 * BFF統一エラー封筒形式
 */
export interface BFFErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  traceId: string;
}

/**
 * エラーコード定数
 */
export const ERROR_CODES = {
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  HEALTH_CHECK_FAILED: 'HEALTH_CHECK_FAILED',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  AUTH_PROVIDER_ERROR: 'AUTH_PROVIDER_ERROR',
  SESSION_ERROR: 'SESSION_ERROR',
  OAUTH_ERROR: 'OAUTH_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * BFFエラークラス
 */
export class BFFError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'BFFError';
  }
}

/**
 * バリデーションエラークラス
 */
export class ValidationError extends BFFError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * ヘルスチェックエラークラス
 */
export class HealthCheckError extends BFFError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.HEALTH_CHECK_FAILED, message, details);
    this.name = 'HealthCheckError';
  }
}

/**
 * タイムアウトエラークラス
 */
export class TimeoutError extends BFFError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.TIMEOUT_ERROR, message, details);
    this.name = 'TimeoutError';
  }
}

/**
 * 認証エラークラス
 */
export class AuthError extends BFFError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.AUTH_ERROR, message, details);
    this.name = 'AuthError';
  }
}

/**
 * OAuth認証プロバイダーエラークラス
 */
export class AuthProviderError extends BFFError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.AUTH_PROVIDER_ERROR, message, details);
    this.name = 'AuthProviderError';
  }
}

/**
 * セッションエラークラス
 */
export class SessionError extends BFFError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.SESSION_ERROR, message, details);
    this.name = 'SessionError';
  }
}

/**
 * OAuthエラークラス
 */
export class OAuthError extends BFFError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ERROR_CODES.OAUTH_ERROR, message, details);
    this.name = 'OAuthError';
  }
}
