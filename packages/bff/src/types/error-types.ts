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
    details?: Record<string, any>;
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
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * BFFエラークラス
 */
export class BFFError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BFFError';
  }
}

/**
 * バリデーションエラークラス
 */
export class ValidationError extends BFFError {
  constructor(message: string, details?: Record<string, any>) {
    super(ERROR_CODES.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

/**
 * ヘルスチェックエラークラス
 */
export class HealthCheckError extends BFFError {
  constructor(message: string, details?: Record<string, any>) {
    super(ERROR_CODES.HEALTH_CHECK_FAILED, message, details);
    this.name = 'HealthCheckError';
  }
}

/**
 * タイムアウトエラークラス
 */
export class TimeoutError extends BFFError {
  constructor(message: string, details?: Record<string, any>) {
    super(ERROR_CODES.TIMEOUT_ERROR, message, details);
    this.name = 'TimeoutError';
  }
}
