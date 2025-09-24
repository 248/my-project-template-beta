/**
 * ヘルスチェックAPIのパフォーマンステスト
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// パフォーマンステスト設定
const PERFORMANCE_CONFIG = {
  // 目標値
  p95Target: 300, // 300ms
  avgTarget: 150, // 150ms

  // テスト設定
  warmupRequests: 10, // ウォームアップリクエスト数
  testRequests: 100, // テストリクエスト数
  concurrency: 5, // 同時実行数

  // タイムアウト
  requestTimeout: 5000, // 5秒
};

interface PerformanceResult {
  durations: number[];
  errors: number;
  timeouts: number;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  minDuration: number;
  maxDuration: number;
}

/**
 * パーセンタイル値を計算
 */
function calculatePercentile(
  sortedArray: number[],
  percentile: number
): number {
  if (sortedArray.length === 0) return 0;

  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

/**
 * パフォーマンス結果を分析
 */
function analyzePerformance(
  durations: number[],
  errors: number,
  timeouts: number
): PerformanceResult {
  const sortedDurations = durations.sort((a, b) => a - b);

  return {
    durations,
    errors,
    timeouts,
    avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
    p50Duration: calculatePercentile(sortedDurations, 50),
    p95Duration: calculatePercentile(sortedDurations, 95),
    p99Duration: calculatePercentile(sortedDurations, 99),
    minDuration: sortedDurations[0] || 0,
    maxDuration: sortedDurations[sortedDurations.length - 1] || 0,
  };
}

/**
 * 単一のヘルスチェックリクエストを実行
 */
async function performHealthCheck(): Promise<{
  duration: number;
  success: boolean;
}> {
  const startTime = performance.now();

  try {
    const response = await fetch('http://localhost:3000/api/health', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'performance-test/1.0.0',
      },
      signal: AbortSignal.timeout(PERFORMANCE_CONFIG.requestTimeout),
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // レスポンスボディを読み取り（JSONパース）
    await response.json();

    return {
      duration,
      success: response.ok,
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    return {
      duration,
      success: false,
    };
  }
}

/**
 * 並列でヘルスチェックリクエストを実行
 */
async function performConcurrentHealthChecks(
  count: number,
  concurrency: number
): Promise<PerformanceResult> {
  const results: Array<{ duration: number; success: boolean }> = [];
  let errors = 0;
  let timeouts = 0;

  // バッチ処理で並列実行
  for (let i = 0; i < count; i += concurrency) {
    const batchSize = Math.min(concurrency, count - i);
    const batch = Array(batchSize)
      .fill(null)
      .map(() => performHealthCheck());

    const batchResults = await Promise.all(batch);

    for (const result of batchResults) {
      results.push(result);

      if (!result.success) {
        if (result.duration >= PERFORMANCE_CONFIG.requestTimeout) {
          timeouts++;
        } else {
          errors++;
        }
      }
    }

    // バッチ間の小休止（サーバー負荷軽減）
    if (i + concurrency < count) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  const durations = results.map(r => r.duration);
  return analyzePerformance(durations, errors, timeouts);
}

describe('ヘルスチェックAPI パフォーマンステスト', () => {
  beforeAll(async () => {
    // サーバーが起動していることを確認
    try {
      const response = await fetch('http://localhost:3000/api/health');
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      throw new Error(
        'Development server is not running. Please start it with "pnpm dev" before running performance tests.'
      );
    }
  });

  afterAll(async () => {
    // パフォーマンス統計をリセット（テスト後のクリーンアップ）
    try {
      await fetch('http://localhost:3000/api/health/performance', {
        method: 'DELETE',
      });
    } catch (error) {
      // エラーは無視（統計エンドポイントが存在しない可能性）
      console.warn('Failed to reset performance statistics:', error);
    }
  });

  it('ウォームアップリクエストを実行', async () => {
    console.log(
      `🔥 ウォームアップ: ${PERFORMANCE_CONFIG.warmupRequests}リクエストを実行中...`
    );

    const result = await performConcurrentHealthChecks(
      PERFORMANCE_CONFIG.warmupRequests,
      Math.min(PERFORMANCE_CONFIG.concurrency, 3) // ウォームアップは控えめに
    );

    console.log(`   平均レスポンス時間: ${Math.round(result.avgDuration)}ms`);
    console.log(`   エラー数: ${result.errors}`);

    // ウォームアップは成功率のみチェック
    expect(result.errors).toBeLessThan(PERFORMANCE_CONFIG.warmupRequests * 0.1); // 10%未満のエラー率
  }, 30000); // 30秒タイムアウト

  it('p95レスポンス時間が目標値以下であること', async () => {
    console.log(
      `📊 パフォーマンステスト: ${PERFORMANCE_CONFIG.testRequests}リクエストを実行中...`
    );
    console.log(`   同時実行数: ${PERFORMANCE_CONFIG.concurrency}`);
    console.log(`   目標p95: ${PERFORMANCE_CONFIG.p95Target}ms`);

    const result = await performConcurrentHealthChecks(
      PERFORMANCE_CONFIG.testRequests,
      PERFORMANCE_CONFIG.concurrency
    );

    // 結果を表示
    console.log('');
    console.log('📈 パフォーマンステスト結果:');
    console.log(`   総リクエスト数: ${PERFORMANCE_CONFIG.testRequests}`);
    console.log(
      `   成功数: ${PERFORMANCE_CONFIG.testRequests - result.errors - result.timeouts}`
    );
    console.log(`   エラー数: ${result.errors}`);
    console.log(`   タイムアウト数: ${result.timeouts}`);
    console.log(`   平均レスポンス時間: ${Math.round(result.avgDuration)}ms`);
    console.log(`   p50: ${Math.round(result.p50Duration)}ms`);
    console.log(`   p95: ${Math.round(result.p95Duration)}ms`);
    console.log(`   p99: ${Math.round(result.p99Duration)}ms`);
    console.log(`   最小: ${Math.round(result.minDuration)}ms`);
    console.log(`   最大: ${Math.round(result.maxDuration)}ms`);

    // アサーション
    expect(result.errors).toBeLessThan(PERFORMANCE_CONFIG.testRequests * 0.05); // 5%未満のエラー率
    expect(result.timeouts).toBe(0); // タイムアウトなし
    expect(result.p95Duration).toBeLessThanOrEqual(
      PERFORMANCE_CONFIG.p95Target
    ); // p95目標達成
    expect(result.avgDuration).toBeLessThanOrEqual(
      PERFORMANCE_CONFIG.avgTarget
    ); // 平均目標達成

    // 成功時のメッセージ
    const successRate =
      ((PERFORMANCE_CONFIG.testRequests - result.errors - result.timeouts) /
        PERFORMANCE_CONFIG.testRequests) *
      100;
    console.log('');
    console.log(`✅ パフォーマンステスト合格!`);
    console.log(`   成功率: ${successRate.toFixed(1)}%`);
    console.log(
      `   p95: ${Math.round(result.p95Duration)}ms <= ${PERFORMANCE_CONFIG.p95Target}ms`
    );
    console.log(
      `   平均: ${Math.round(result.avgDuration)}ms <= ${PERFORMANCE_CONFIG.avgTarget}ms`
    );
  }, 60000); // 60秒タイムアウト

  it('パフォーマンス統計エンドポイントが動作すること', async () => {
    // 統計を取得
    const response = await fetch(
      'http://localhost:3000/api/health/performance'
    );
    expect(response.ok).toBe(true);

    const stats = await response.json();
    expect(stats).toHaveProperty('timestamp');
    expect(stats).toHaveProperty('traceId');
    expect(stats).toHaveProperty('stats');
    expect(Array.isArray(stats.stats)).toBe(true);

    // 統計にヘルスチェック操作が含まれていることを確認
    const healthStats = stats.stats.find(
      (s: { operation: string }) =>
        s.operation === 'api-health-endpoint' ||
        s.operation === 'bff-health-check'
    );

    if (healthStats) {
      expect(healthStats).toHaveProperty('totalCount');
      expect(healthStats).toHaveProperty('p95Duration');
      expect(healthStats.totalCount).toBeGreaterThan(0);

      console.log('');
      console.log('📊 パフォーマンス統計:');
      console.log(`   操作: ${healthStats.operation}`);
      console.log(`   総実行回数: ${healthStats.totalCount}`);
      console.log(`   成功率: ${healthStats.successRate}%`);
      console.log(`   p95: ${healthStats.p95Duration}ms`);
    }
  });
});
