/**
 * ErrorHandlerのテスト
 */

import { LoggerAdapter } from '@template/adapters';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  BFFError,
  ValidationError,
  HealthCheckError,
  TimeoutError,
  ERROR_CODES,
} from '../types/error-types';
import { ErrorHandler, ErrorContext } from '../utils/error-handler';

// モック
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
} as unknown as LoggerAdapter;

describe('ErrorHandler', () => {
  let errorContext: ErrorContext;

  beforeEach(() => {
    vi.clearAllMocks();
    errorContext = {
      traceId: 'test-trace-id',
      logger: mockLogger,
      operation: 'test-operation',
    };
  });

  describe('handle', () => {
    it('BFFErrorを正しく処理すべき', () => {
      // Arrange
      const error = new BFFError(
        ERROR_CODES.HEALTH_CHECK_FAILED,
        'Health check failed',
        { reason: 'Service unavailable' }
      );

      // Act
      const result = ErrorHandler.handle(error, errorContext);

      // Assert
      expect(result).toEqual({
        error: {
          code: ERROR_CODES.HEALTH_CHECK_FAILED,
          message: 'Health check failed',
          details: { reason: 'Service unavailable' },
        },
        traceId: 'test-trace-id',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          operation: 'test-operation',
          errorCode: ERROR_CODES.HEALTH_CHECK_FAILED,
          errorMessage: 'Health check failed',
          errorDetails: { reason: 'Service unavailable' },
        }),
        'BFFエラー: Health check failed'
      );
    });

    it('ValidationErrorを正しく処理すべき', () => {
      // Arrange
      const error = new ValidationError('Invalid input', { field: 'name' });

      // Act
      const result = ErrorHandler.handle(error, errorContext);

      // Assert
      expect(result.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(result.error.message).toBe('Invalid input');
      expect(result.error.details).toEqual({ field: 'name' });
    });

    it('タイムアウトエラーを正しく処理すべき', () => {
      // Arrange
      const error = new Error('Timeout after 5000ms');

      // Act
      const result = ErrorHandler.handle(error, errorContext);

      // Assert
      expect(result.error.code).toBe(ERROR_CODES.TIMEOUT_ERROR);
      expect(result.error.message).toBe('リクエストがタイムアウトしました');
      expect(result.error.details).toEqual({
        originalError: 'Timeout after 5000ms',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          operation: 'test-operation',
          errorMessage: 'Timeout after 5000ms',
        }),
        'タイムアウトエラーが発生しました'
      );
    });

    it('予期しないErrorを正しく処理すべき', () => {
      // Arrange
      const error = new Error('Unexpected error');

      // Act
      const result = ErrorHandler.handle(error, errorContext);

      // Assert
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(result.error.message).toBe('Internal server error occurred');
      expect(result.error.details).toEqual({
        originalError: 'Unexpected error',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: 'test-trace-id',
          operation: 'test-operation',
          errorMessage: 'Unexpected error',
        }),
        '予期しないエラーが発生しました'
      );
    });

    it('非Errorオブジェクトを正しく処理すべき', () => {
      // Arrange
      const error = 'String error';

      // Act
      const result = ErrorHandler.handle(error, errorContext);

      // Assert
      expect(result.error.code).toBe(ERROR_CODES.INTERNAL_SERVER_ERROR);
      expect(result.error.message).toBe('Internal server error occurred');
      expect(result.error.details).toEqual({ originalError: 'Unknown error' });
    });

    it('operationが指定されない場合にデフォルト値を使用すべき', () => {
      // Arrange
      const contextWithoutOperation = {
        traceId: 'test-trace-id',
        logger: mockLogger,
      };
      const error = new Error('Test error');

      // Act
      ErrorHandler.handle(error, contextWithoutOperation);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'unknown',
        }),
        '予期しないエラーが発生しました'
      );
    });
  });

  describe('getHttpStatusCode', () => {
    it('ValidationErrorに対して422を返すべき', () => {
      const error = new ValidationError('Invalid input');
      expect(ErrorHandler.getHttpStatusCode(error)).toBe(422);
    });

    it('HealthCheckErrorに対して503を返すべき', () => {
      const error = new HealthCheckError('Health check failed');
      expect(ErrorHandler.getHttpStatusCode(error)).toBe(503);
    });

    it('TimeoutErrorに対して504を返すべき', () => {
      const error = new TimeoutError('Request timeout');
      expect(ErrorHandler.getHttpStatusCode(error)).toBe(504);
    });

    it('BFFErrorに対して500を返すべき', () => {
      const error = new BFFError(
        ERROR_CODES.INTERNAL_SERVER_ERROR,
        'Internal error'
      );
      expect(ErrorHandler.getHttpStatusCode(error)).toBe(500);
    });

    it('その他のエラーに対して500を返すべき', () => {
      const error = new Error('Unknown error');
      expect(ErrorHandler.getHttpStatusCode(error)).toBe(500);
    });
  });

  describe('validateErrorResponse', () => {
    it('有効なエラーレスポンスをそのまま返すべき', () => {
      // Arrange
      const validResponse = {
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
        },
        traceId: 'test-trace-id',
      };

      // Act
      const result = ErrorHandler.validateErrorResponse(validResponse);

      // Assert
      expect(result).toEqual(validResponse);
    });

    it('無効なエラーレスポンスに対してフォールバックを返すべき', () => {
      // Arrange
      const invalidResponse = {
        invalid: 'response',
      };

      // Act
      const result = ErrorHandler.validateErrorResponse(invalidResponse);

      // Assert
      expect(result).toEqual({
        error: {
          code: ERROR_CODES.INTERNAL_SERVER_ERROR,
          message: 'Invalid error response format',
        },
        traceId: 'unknown',
      });
    });
  });
});
