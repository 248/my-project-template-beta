/**
 * パフォーマンス測定ユーティリティ
 * /api/health の初期パフォーマンス測定（p95 < 300ms 目標）
 */

/**
 * パフォーマンス測定結果
 */
export interface PerformanceMetrics {
  /** 実行時間（ミリ秒） */
  duration: number;
  /** 開始時刻 */
  startTime: number;
  /** 終了時刻 */
  endTime: number;
  /** 操作名 */
  operation: string;
  /** 追加のメタデータ */
  metadata?: Record<string, any>;
}

/**
 * パフォーマンス統計
 */
export interface PerformanceStats {
  /** 測定回数 */
  count: number;
  /** 平均実行時間 */
  average: number;
  /** 最小実行時間 */
  min: number;
  /** 最大実行時間 */
  max: number;
  /** p50（中央値） */
  p50: number;
  /** p95 */
  p95: number;
  /** p99 */
  p99: number;
  /** 全測定値 */
  values: number[];
}

/**
 * パフォーマンス測定クラス
 */
export class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();
  private readonly maxMeasurements: number;

  constructor(maxMeasurements: number = 1000) {
    this.maxMeasurements = maxMeasurements;
  }

  /**
   * 操作の実行時間を測定
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metrics: PerformanceMetrics = {
        duration,
        startTime,
        endTime,
        operation,
        metadata,
      };

      this.recordMeasurement(operation, duration);

      // 開発環境でのログ出力
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Performance] ${operation}: ${duration.toFixed(2)}ms`,
          metadata
        );
      }

      return { result, metrics };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // エラーの場合もパフォーマンスを記録
      this.recordMeasurement(`${operation}_error`, duration);

      if (process.env.NODE_ENV === 'development') {
        console.error(
          `[Performance] ${operation} (error): ${duration.toFixed(2)}ms`,
          error
        );
      }

      throw error;
    }
  }

  /**
   * 測定値を記録
   */
  private recordMeasurement(operation: string, duration: number): void {
    if (!this.measurements.has(operation)) {
      this.measurements.set(operation, []);
    }

    const measurements = this.measurements.get(operation)!;
    measurements.push(duration);

    // 最大測定数を超えた場合は古いものを削除
    if (measurements.length > this.maxMeasurements) {
      measurements.shift();
    }
  }

  /**
   * 統計情報を取得
   */
  getStats(operation: string): PerformanceStats | null {
    const measurements = this.measurements.get(operation);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.length;

    return {
      count,
      average: sorted.reduce((sum, val) => sum + val, 0) / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: this.getPercentile(sorted, 50),
      p95: this.getPercentile(sorted, 95),
      p99: this.getPercentile(sorted, 99),
      values: [...measurements],
    };
  }

  /**
   * パーセンタイル値を計算
   */
  private getPercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedValues[lower];
    }

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * 全ての統計情報を取得
   */
  getAllStats(): Record<string, PerformanceStats> {
    const stats: Record<string, PerformanceStats> = {};

    for (const operation of this.measurements.keys()) {
      const operationStats = this.getStats(operation);
      if (operationStats) {
        stats[operation] = operationStats;
      }
    }

    return stats;
  }

  /**
   * 測定データをクリア
   */
  clear(operation?: string): void {
    if (operation) {
      this.measurements.delete(operation);
    } else {
      this.measurements.clear();
    }
  }

  /**
   * p95が目標値を下回っているかチェック
   */
  isP95WithinTarget(operation: string, targetMs: number): boolean {
    const stats = this.getStats(operation);
    return stats ? stats.p95 <= targetMs : false;
  }
}

/**
 * グローバルパフォーマンスモニター
 */
export const globalPerformanceMonitor = new PerformanceMonitor();

/**
 * API呼び出しのパフォーマンス測定用ラッパー
 */
export async function measureApiCall<T = any>(
  url: string,
  options?: any
): Promise<{ response: Response; data: T; metrics: PerformanceMetrics }> {
  const operation = `api_${url.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const { result, metrics } = await globalPerformanceMonitor.measure(
    operation,
    async () => {
      const response = await fetch(url, options);
      const data = await response.json();
      return { response, data };
    },
    { url, method: options?.method || 'GET' }
  );

  return {
    response: result.response,
    data: result.data as T,
    metrics,
  };
}

/**
 * ヘルスチェックAPI専用の測定関数
 */
export async function measureHealthCheck(): Promise<{
  data: any;
  metrics: PerformanceMetrics;
  isWithinTarget: boolean;
}> {
  const TARGET_P95_MS = 300;

  const { data, metrics } = await measureApiCall('/api/health');

  // p95が目標値内かチェック
  const isWithinTarget = globalPerformanceMonitor.isP95WithinTarget(
    'api__api_health',
    TARGET_P95_MS
  );

  return {
    data,
    metrics,
    isWithinTarget,
  };
}

/**
 * パフォーマンス統計をコンソールに出力（開発用）
 */
export function logPerformanceStats(operation?: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  if (operation) {
    const stats = globalPerformanceMonitor.getStats(operation);
    if (stats) {
      console.table({
        [operation]: {
          count: stats.count,
          average: `${stats.average.toFixed(2)}ms`,
          min: `${stats.min.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
          p50: `${stats.p50.toFixed(2)}ms`,
          p95: `${stats.p95.toFixed(2)}ms`,
          p99: `${stats.p99.toFixed(2)}ms`,
        },
      });
    }
  } else {
    const allStats = globalPerformanceMonitor.getAllStats();
    const formattedStats: Record<string, any> = {};

    for (const [op, stats] of Object.entries(allStats)) {
      formattedStats[op] = {
        count: stats.count,
        average: `${stats.average.toFixed(2)}ms`,
        p95: `${stats.p95.toFixed(2)}ms`,
        target: stats.p95 <= 300 ? '✅' : '❌',
      };
    }

    console.table(formattedStats);
  }
}
