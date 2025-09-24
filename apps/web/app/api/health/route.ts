/**
 * ヘルスチェック Route Handler
 * BFF層との連携とOpenAPI契約準拠
 */

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

import {
  AdapterFactory,
  generateTraceId,
  extractTraceIdFromHeaders,
  isMonolithMode,
  validateEnvConfig,
} from '@template/adapters';
import {
  HealthService,
  ApiClientAdapter,
  type HealthServiceResult,
} from '@template/bff';
import { CoreHealthService } from '@template/core';
import type { HealthResponse, ErrorResponse } from '@template/generated';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * リクエストヘッダーのバリデーションスキーマ
 */
const RequestHeadersSchema = z.object({
  'x-trace-id': z.string().optional(),
  'user-agent': z.string().optional(),
});

/**
 * ヘルスチェックサービスのインスタンス（シングルトン）
 */
let healthServiceInstance: HealthService | null = null;
let apiClientInstance: ApiClientAdapter | null = null;

/**
 * 環境設定の初期化（一度だけ実行）
 */
let envValidated = false;
function ensureEnvValidated(): void {
  if (!envValidated) {
    try {
      validateEnvConfig();
      envValidated = true;
    } catch (error) {
      console.error('Environment validation failed:', error);
      throw error;
    }
  }
}

/**
 * ヘルスチェックサービスを取得または作成（monolithモード用）
 */
function getHealthService(): HealthService {
  if (!healthServiceInstance) {
    // Adapter Factoryを使用してアダプターを作成
    const adapters = AdapterFactory.createAdapters();

    // Core層のヘルスチェックサービスを作成
    const coreHealthService = new CoreHealthService(adapters);

    // BFF層のヘルスチェックサービスを作成
    healthServiceInstance = new HealthService(
      coreHealthService,
      adapters.logger,
      adapters.performance,
      {
        timeoutMs: 5000, // 5秒タイムアウト
        operationName: 'api-health-check',
      }
    );
  }

  return healthServiceInstance;
}

/**
 * APIクライアントを取得または作成（serviceモード用）
 */
function getApiClient(): ApiClientAdapter {
  if (!apiClientInstance) {
    apiClientInstance = new ApiClientAdapter({
      timeout: 5000, // 5秒タイムアウト
    });
  }

  return apiClientInstance;
}

/**
 * リクエストヘッダーからtraceIdを抽出
 */
function getTraceIdFromRequest(request: NextRequest): string {
  try {
    // ヘッダーをRecord形式に変換
    const headersRecord: Record<string, string | undefined> = {};
    request.headers.forEach((value, key) => {
      headersRecord[key] = value;
    });

    // ヘッダーからtraceIdを抽出を試行
    const traceId = extractTraceIdFromHeaders(headersRecord);
    if (traceId) {
      return traceId;
    }
  } catch (error) {
    // エラーの場合は新しいtraceIdを生成
    console.warn('Failed to extract trace ID from headers:', error);
  }

  // 新しいtraceIdを生成
  return generateTraceId();
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(
  error: unknown,
  traceId: string,
  statusCode: number = 500
): NextResponse<ErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  const errorResponse: ErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error occurred',
      details:
        process.env.NODE_ENV === 'development'
          ? { originalError: errorMessage }
          : undefined,
    },
    traceId,
  };

  return NextResponse.json(errorResponse, {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'X-Trace-Id': traceId,
    },
  });
}

/**
 * 成功レスポンスを作成
 */
function createSuccessResponse(
  data: HealthResponse,
  traceId: string
): NextResponse<HealthResponse> {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Trace-Id': traceId,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}

/**
 * GET /api/health
 * システムヘルスチェックエンドポイント
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // traceIdを最初に取得（エラーハンドリングで必要）
  const traceId = getTraceIdFromRequest(request);

  let performanceMonitor:
    | import('@template/adapters').PerformanceMonitorInterface
    | undefined;
  let measurement:
    | import('@template/adapters').PerformanceMeasurementInterface
    | undefined;

  try {
    // 環境設定の検証
    ensureEnvValidated();

    // パフォーマンス監視を取得
    const adapters = AdapterFactory.createAdapters();
    performanceMonitor = adapters.performance;

    // パフォーマンス測定開始
    measurement = performanceMonitor?.startMeasurement('api-health-endpoint');
    measurement?.addMetadata('traceId', traceId);
    measurement?.addMetadata(
      'userAgent',
      request.headers.get('user-agent') || 'unknown'
    );

    // リクエストヘッダーのバリデーション（オプション）
    try {
      const headers = Object.fromEntries(request.headers.entries());
      RequestHeadersSchema.parse(headers);
    } catch (validationError) {
      // ヘッダーバリデーションエラーは警告レベル（処理は継続）
      console.warn('Request headers validation warning:', validationError);
    }

    // BACKEND_MODEに応じてヘルスチェックを実行
    let result: HealthServiceResult;

    if (isMonolithMode()) {
      // monolithモード: 直接BFFサービス呼び出し
      const healthService = getHealthService();
      result = await healthService.checkHealth(traceId);
    } else {
      // serviceモード: APIクライアント経由
      const apiClient = getApiClient();
      const healthData = await apiClient.getHealth();

      // BFFサービスと同じ形式に変換
      result = {
        success: true,
        data: healthData,
      };
    }

    if (result.success) {
      // パフォーマンス測定終了（成功）
      measurement?.end({
        status: result.data.status,
        servicesCount: result.data.services.length,
        httpStatus: 200,
      });

      return createSuccessResponse(result.data, traceId);
    } else {
      // パフォーマンス測定終了（BFFエラー）
      measurement?.endWithError(`BFF Error: ${result.error.error.code}`, {
        errorCode: result.error.error.code,
        statusCode: result.statusCode,
        httpStatus: result.statusCode,
      });

      return NextResponse.json(result.error, {
        status: result.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': traceId,
        },
      });
    }
  } catch (error) {
    // 予期しないエラー（traceIdは既に初期化済み）

    // パフォーマンス測定終了（システムエラー）
    measurement?.endWithError(
      error instanceof Error ? error : new Error('Unknown error'),
      {
        httpStatus: 500,
        errorType: 'system_error',
      }
    );

    return createErrorResponse(error, traceId, 500);
  }
}

/**
 * その他のHTTPメソッドは405 Method Not Allowedを返す
 */
export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
      traceId: generateTraceId(),
    },
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
      traceId: generateTraceId(),
    },
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
      traceId: generateTraceId(),
    },
    { status: 405 }
  );
}
