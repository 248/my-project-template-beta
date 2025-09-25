/**
 * パフォーマンス統計 Route Handler
 * システムのパフォーマンス統計を取得
 */

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';

import {
  AdapterFactory,
  generateTraceId,
  extractTraceIdFromHeaders,
} from '@template/adapters';
import { NextRequest, NextResponse } from 'next/server';

/**
 * パフォーマンス統計レスポンス
 */
interface PerformanceStatsResponse {
  timestamp: string;
  traceId: string;
  stats: Array<{
    operation: string;
    totalCount: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    lastUpdated: string;
  }>;
}

/**
 * GET /api/health/performance
 * パフォーマンス統計を取得
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // traceIdを取得
    const headersRecord: Record<string, string | undefined> = {};
    request.headers.forEach((value, key) => {
      headersRecord[key] = value;
    });

    const traceId =
      extractTraceIdFromHeaders(headersRecord) || generateTraceId();

    // パフォーマンス監視を取得
    const adapters = AdapterFactory.createAdapters();
    const performanceMonitor = adapters.performance;

    // 統計を取得
    const allStats = performanceMonitor.getAllStats();

    const statsArray = Array.from(allStats.values()).map(stats => ({
      operation: stats.operation,
      totalCount: stats.totalCount,
      successCount: stats.successCount,
      errorCount: stats.errorCount,
      successRate:
        Math.round((stats.successCount / stats.totalCount) * 100 * 100) / 100,
      avgDuration: Math.round(stats.avgDuration * 100) / 100,
      minDuration: Math.round(stats.minDuration * 100) / 100,
      maxDuration: Math.round(stats.maxDuration * 100) / 100,
      p50Duration: Math.round(stats.p50Duration * 100) / 100,
      p95Duration: Math.round(stats.p95Duration * 100) / 100,
      p99Duration: Math.round(stats.p99Duration * 100) / 100,
      lastUpdated: stats.lastUpdated.toISOString(),
    }));

    const response: PerformanceStatsResponse = {
      timestamp: new Date().toISOString(),
      traceId,
      stats: statsArray,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    const traceId = generateTraceId();
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error('Performance stats endpoint error:', {
      traceId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve performance statistics',
          details:
            process.env.NODE_ENV === 'development'
              ? { originalError: errorMessage }
              : undefined,
        },
        traceId,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': traceId,
        },
      }
    );
  }
}

/**
 * DELETE /api/health/performance
 * パフォーマンス統計をリセット
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // traceIdを取得
    const headersRecord: Record<string, string | undefined> = {};
    request.headers.forEach((value, key) => {
      headersRecord[key] = value;
    });

    const traceId =
      extractTraceIdFromHeaders(headersRecord) || generateTraceId();

    // クエリパラメータから操作名を取得
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    // パフォーマンス監視を取得
    const adapters = AdapterFactory.createAdapters();
    const performanceMonitor = adapters.performance;

    // 統計をリセット
    performanceMonitor.resetStats(operation || undefined);

    const message = operation
      ? `Performance statistics for operation '${operation}' have been reset`
      : 'All performance statistics have been reset';

    return NextResponse.json(
      {
        message,
        traceId,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': traceId,
        },
      }
    );
  } catch (error) {
    const traceId = generateTraceId();
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error('Performance stats reset error:', {
      traceId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to reset performance statistics',
          details:
            process.env.NODE_ENV === 'development'
              ? { originalError: errorMessage }
              : undefined,
        },
        traceId,
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Trace-Id': traceId,
        },
      }
    );
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
