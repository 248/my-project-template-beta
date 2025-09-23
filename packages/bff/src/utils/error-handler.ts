/**
 * BFF層のエラーハンドリングユーティリティ
 */

import { LoggerAdapter } from '@template/adapters';

import { ErrorResponseSchema } from '../schemas/health-schemas';
import {
  BFFError,
  BFFErrorResponse,
  ERROR_CODES,
  ValidationError,
  HealthCheckError,
  TimeoutError,
} from '../types/error-types';

/**
 * エラーハンドリングコンテキスト
 */
export interface ErrorContext {
  traceId: string;
  logger: LoggerAdapter;
  operation?: string;
}

/**
 * エラーハンドラークラス
 */
export class ErrorHandler {
  /**
   * エラーを処理してBFF統一エラー形式に変換
   */
  static handle(error: unknown, context: ErrorContext): BFFErrorResponse {
    const { traceId, logger, operation = 'unknown' } = context;

    // BFFErrorの場合
    if (error instanceof BFFError) {
      logger.warn(
        {
          traceId,
          operation,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
        },
        `BFFエラー: ${error.message}`
      );

      return {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        traceId,
      };
    }

    // タイムアウトエラーの場合
    if (
      error instanceof Error &&
      (error.message.includes('Timeout') || error.message.includes('timeout'))
    ) {
      logger.error(
        {
          traceId,
          operation,
          errorMessage: error.message,
        },
        'タイムアウトエラーが発生しました'
      );

      return {
        error: {
          code: ERROR_CODES.TIMEOUT_ERROR,
          message: 'リクエストがタイムアウトしました',
          details: { originalError: error.message },
        },
        traceId,
      };
    }

    // その他のエラー（予期しないエラー）
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      {
        traceId,
        operation,
        errorMessage,
        errorStack,
      },
      '予期しないエラーが発生しました'
    );

    return {
      error: {
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Internal server error occurred',
        details: {
          originalError: errorMessage,
        },
      },
      traceId,
    };
  }

  /**
   * エラーレスポンスをバリデーション
   */
  static validateErrorResponse(response: unknown): BFFErrorResponse {
    try {
      return ErrorResponseSchema.parse(response);
    } catch (validationError) {
      // バリデーションエラーの場合はフォールバック
      return {
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Invalid error response format',
        },
        traceId: 'unknown',
      };
    }
  }

  /**
   * HTTPステータスコードを決定
   */
  static getHttpStatusCode(error: unknown): number {
    if (error instanceof ValidationError) {
      return 422; // Unprocessable Entity
    }

    if (error instanceof HealthCheckError) {
      return 503; // Service Unavailable
    }

    if (error instanceof TimeoutError) {
      return 504; // Gateway Timeout
    }

    if (error instanceof BFFError) {
      return 500; // Internal Server Error
    }

    return 500; // Default to Internal Server Error
  }
}
