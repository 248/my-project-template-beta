/**
 * BFF層のヘルスチェックサービス
 * Core層との連携とAPI応答形式への変換を担当
 */

import { LoggerAdapter, generateTraceId } from '@template/adapters';
import { CoreHealthService, HealthStatus } from '@template/core';
import type { HealthResponse } from '@template/generated';

import {
  HealthResponseSchema,
  HealthResponseData,
} from '../schemas/health-schemas';
import { BFFErrorResponse, HealthCheckError } from '../types/error-types';
import { ErrorHandler, ErrorContext } from '../utils/error-handler';

/**
 * ヘルスチェックサービスの設定
 */
export interface HealthServiceConfig {
  /** タイムアウト時間（ミリ秒） */
  timeoutMs?: number;
  /** 操作名（ログ用） */
  operationName?: string;
}

/**
 * ヘルスチェック結果
 */
export interface HealthCheckResult {
  success: true;
  data: HealthResponse;
}

export interface HealthCheckErrorResult {
  success: false;
  error: BFFErrorResponse;
  statusCode: number;
}

export type HealthServiceResult = HealthCheckResult | HealthCheckErrorResult;

/**
 * BFF層のヘルスチェックサービス
 */
export class HealthService {
  private readonly config: Required<HealthServiceConfig>;

  constructor(
    private readonly coreHealthService: CoreHealthService,
    private readonly logger: LoggerAdapter,
    config: HealthServiceConfig = {}
  ) {
    this.config = {
      timeoutMs: 5000, // デフォルト5秒
      operationName: 'health-check',
      ...config,
    };
  }

  /**
   * ヘルスチェックを実行してAPI応答形式に変換
   */
  async checkHealth(traceId?: string): Promise<HealthServiceResult> {
    const requestTraceId = traceId || generateTraceId();
    const contextLogger = this.logger.withTraceId(requestTraceId);

    const errorContext: ErrorContext = {
      traceId: requestTraceId,
      logger: contextLogger,
      operation: this.config.operationName,
    };

    try {
      contextLogger.info(
        {
          operation: this.config.operationName,
          timeoutMs: this.config.timeoutMs,
        },
        'ヘルスチェック開始'
      );

      // Core層のヘルスチェックを実行（タイムアウト付き）
      const healthStatus = await this.executeWithTimeout(
        this.coreHealthService.performHealthCheck(),
        this.config.timeoutMs
      );

      // API応答形式に変換
      const apiResponse = this.convertToApiResponse(
        healthStatus,
        requestTraceId
      );

      // レスポンスをバリデーション
      const validatedResponse = this.validateResponse(apiResponse);

      contextLogger.info(
        {
          status: validatedResponse.status,
          servicesCount: validatedResponse.services.length,
          traceId: requestTraceId,
        },
        'ヘルスチェック完了'
      );

      return {
        success: true,
        data: validatedResponse,
      };
    } catch (error) {
      contextLogger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          operation: this.config.operationName,
        },
        'ヘルスチェックでエラーが発生しました'
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
   * Core層のHealthStatusをAPI応答形式に変換
   */
  private convertToApiResponse(
    healthStatus: HealthStatus,
    traceId: string
  ): HealthResponseData {
    return {
      status: healthStatus.status,
      timestamp: healthStatus.timestamp.toISOString(),
      services: healthStatus.services.map(service => ({
        name: service.name,
        status: service.status,
        responseTime: service.responseTime,
        error: service.error,
      })),
      traceId,
    };
  }

  /**
   * API応答をバリデーション
   */
  private validateResponse(response: HealthResponseData): HealthResponse {
    try {
      return HealthResponseSchema.parse(response);
    } catch (validationError) {
      this.logger.error(
        {
          validationError:
            validationError instanceof Error
              ? validationError.message
              : 'Unknown validation error',
          response,
        },
        'ヘルスチェック応答のバリデーションに失敗しました'
      );

      throw new HealthCheckError('Invalid health check response format', {
        validationError:
          validationError instanceof Error
            ? validationError.message
            : 'Unknown validation error',
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
        reject(new Error(`Health check timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * 設定を取得（テスト用）
   */
  getConfig(): Required<HealthServiceConfig> {
    return { ...this.config };
  }

  /**
   * 新しいtraceIdでヘルスチェックを実行
   */
  async checkHealthWithNewTrace(): Promise<HealthServiceResult> {
    return this.checkHealth(generateTraceId());
  }
}
