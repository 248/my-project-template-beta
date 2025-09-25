/**
 * パフォーマンス監視アダプター
 * レスポンス時間の測定とメトリクス収集
 */

import { LoggerInterface } from '../interfaces/logger-interface';

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  /** 操作名 */
  operation: string;
  /** 開始時刻 */
  startTime: number;
  /** 終了時刻 */
  endTime: number;
  /** 実行時間（ミリ秒） */
  duration: number;
  /** 成功フラグ */
  success: boolean;
  /** エラー情報 */
  error?: string;
  /** 追加メタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * パフォーマンス統計
 */
export interface PerformanceStats {
  /** 操作名 */
  operation: string;
  /** 総実行回数 */
  totalCount: number;
  /** 成功回数 */
  successCount: number;
  /** エラー回数 */
  errorCount: number;
  /** 平均実行時間 */
  avgDuration: number;
  /** 最小実行時間 */
  minDuration: number;
  /** 最大実行時間 */
  maxDuration: number;
  /** p50実行時間 */
  p50Duration: number;
  /** p95実行時間 */
  p95Duration: number;
  /** p99実行時間 */
  p99Duration: number;
  /** 最後の更新時刻 */
  lastUpdated: Date;
}

/**
 * パフォーマンス監視設定
 */
export interface PerformanceMonitorConfig {
  /** 統計保持期間（ミリ秒） */
  retentionPeriod?: number;
  /** 統計更新間隔（ミリ秒） */
  updateInterval?: number;
  /** 詳細ログ出力フラグ */
  enableDetailedLogging?: boolean;
  /** 警告しきい値（ミリ秒） */
  warningThreshold?: number;
  /** エラーしきい値（ミリ秒） */
  errorThreshold?: number;
}

/**
 * パフォーマンス監視アダプター
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private stats: Map<string, PerformanceStats> = new Map();
  private config: Required<PerformanceMonitorConfig>;

  constructor(
    private logger: LoggerInterface,
    config: PerformanceMonitorConfig = {}
  ) {
    this.config = {
      retentionPeriod: 60 * 60 * 1000, // 1時間
      updateInterval: 5 * 60 * 1000, // 5分
      enableDetailedLogging: false,
      warningThreshold: 200, // 200ms
      errorThreshold: 500, // 500ms
      ...config,
    };

    // 定期的な統計更新とクリーンアップ
    this.startPeriodicTasks();
  }

  /**
   * パフォーマンス測定を開始
   */
  startMeasurement(operation: string): PerformanceMeasurement {
    return new PerformanceMeasurement(operation, this);
  }

  /**
   * メトリクスを記録
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    const operationMetrics = this.metrics.get(metrics.operation) || [];
    operationMetrics.push(metrics);
    this.metrics.set(metrics.operation, operationMetrics);

    // 統計を更新
    this.updateStats(metrics.operation);

    // ログ出力
    this.logMetrics(metrics);

    // 古いメトリクスをクリーンアップ
    this.cleanupOldMetrics(metrics.operation);
  }

  /**
   * 操作の統計を取得
   */
  getStats(operation: string): PerformanceStats | undefined {
    return this.stats.get(operation);
  }

  /**
   * 全操作の統計を取得
   */
  getAllStats(): Map<string, PerformanceStats> {
    return new Map(this.stats);
  }

  /**
   * 統計をリセット
   */
  resetStats(operation?: string): void {
    if (operation) {
      this.metrics.delete(operation);
      this.stats.delete(operation);
    } else {
      this.metrics.clear();
      this.stats.clear();
    }
  }

  /**
   * 統計を更新
   */
  private updateStats(operation: string): void {
    const operationMetrics = this.metrics.get(operation) || [];
    if (operationMetrics.length === 0) return;

    const durations = operationMetrics
      .map(m => m.duration)
      .sort((a, b) => a - b);
    const successCount = operationMetrics.filter(m => m.success).length;
    const errorCount = operationMetrics.length - successCount;

    const stats: PerformanceStats = {
      operation,
      totalCount: operationMetrics.length,
      successCount,
      errorCount,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.calculatePercentile(durations, 50),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99),
      lastUpdated: new Date(),
    };

    this.stats.set(operation, stats);
  }

  /**
   * パーセンタイル値を計算
   */
  private calculatePercentile(
    sortedArray: number[],
    percentile: number
  ): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * メトリクスをログ出力
   */
  private logMetrics(metrics: PerformanceMetrics): void {
    const logData: Record<string, unknown> = {
      operation: metrics.operation,
      duration: Math.round(metrics.duration * 100) / 100, // 小数点2桁
      success: metrics.success,
      timestamp: new Date(metrics.endTime).toISOString(),
      ...metrics.metadata,
    };

    if (metrics.error) {
      logData.error = metrics.error;
    }

    // しきい値チェック
    if (metrics.duration >= this.config.errorThreshold) {
      this.logger.error(
        logData,
        `パフォーマンス警告: ${metrics.operation} が ${this.config.errorThreshold}ms を超過`
      );
    } else if (metrics.duration >= this.config.warningThreshold) {
      this.logger.warn(
        logData,
        `パフォーマンス注意: ${metrics.operation} が ${this.config.warningThreshold}ms を超過`
      );
    } else if (this.config.enableDetailedLogging) {
      this.logger.info(logData, `パフォーマンス測定: ${metrics.operation}`);
    }
  }

  /**
   * 古いメトリクスをクリーンアップ
   */
  private cleanupOldMetrics(operation: string): void {
    const operationMetrics = this.metrics.get(operation) || [];
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    const filteredMetrics = operationMetrics.filter(
      m => m.endTime >= cutoffTime
    );

    this.metrics.set(operation, filteredMetrics);
  }

  /**
   * 定期的なタスクを開始
   */
  private startPeriodicTasks(): void {
    setInterval(() => {
      // 全操作の統計を更新
      for (const operation of this.metrics.keys()) {
        this.updateStats(operation);
        this.cleanupOldMetrics(operation);
      }

      // 統計サマリーをログ出力
      this.logStatsSummary();
    }, this.config.updateInterval);
  }

  /**
   * 統計サマリーをログ出力
   */
  private logStatsSummary(): void {
    const allStats = Array.from(this.stats.values());
    if (allStats.length === 0) return;

    const summary = allStats.map(stats => ({
      operation: stats.operation,
      totalCount: stats.totalCount,
      successRate: Math.round((stats.successCount / stats.totalCount) * 100),
      avgDuration: Math.round(stats.avgDuration * 100) / 100,
      p95Duration: Math.round(stats.p95Duration * 100) / 100,
    }));

    this.logger.info(
      { performanceSummary: summary },
      'パフォーマンス統計サマリー'
    );
  }
}

/**
 * パフォーマンス測定クラス
 */
export class PerformanceMeasurement {
  private startTime: number;
  private metadata: Record<string, unknown> = {};

  constructor(
    private operation: string,
    private monitor: PerformanceMonitor
  ) {
    this.startTime = performance.now();
  }

  /**
   * メタデータを追加
   */
  addMetadata(key: string, value: unknown): this {
    this.metadata[key] = value;
    return this;
  }

  /**
   * 測定を終了（成功）
   */
  end(additionalMetadata?: Record<string, unknown>): PerformanceMetrics {
    const endTime = performance.now();
    const metrics: PerformanceMetrics = {
      operation: this.operation,
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      success: true,
      metadata: { ...this.metadata, ...additionalMetadata },
    };

    this.monitor.recordMetrics(metrics);
    return metrics;
  }

  /**
   * 測定を終了（エラー）
   */
  endWithError(
    error: string | Error,
    additionalMetadata?: Record<string, unknown>
  ): PerformanceMetrics {
    const endTime = performance.now();
    const errorMessage = error instanceof Error ? error.message : error;

    const metrics: PerformanceMetrics = {
      operation: this.operation,
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      success: false,
      error: errorMessage,
      metadata: { ...this.metadata, ...additionalMetadata },
    };

    this.monitor.recordMetrics(metrics);
    return metrics;
  }
}
