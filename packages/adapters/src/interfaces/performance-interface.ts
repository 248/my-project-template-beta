/**
 * パフォーマンス監視インターフェース
 */

export interface PerformanceMetrics {
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface PerformanceStats {
  operation: string;
  totalCount: number;
  successCount: number;
  errorCount: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  lastUpdated: Date;
}

export interface PerformanceMeasurementInterface {
  addMetadata(key: string, value: unknown): this;
  end(additionalMetadata?: Record<string, unknown>): PerformanceMetrics;
  endWithError(
    error: string | Error,
    additionalMetadata?: Record<string, unknown>
  ): PerformanceMetrics;
}

export interface PerformanceMonitorInterface {
  startMeasurement(operation: string): PerformanceMeasurementInterface;
  recordMetrics(metrics: PerformanceMetrics): void;
  getStats(operation: string): PerformanceStats | undefined;
  getAllStats(): Map<string, PerformanceStats>;
  resetStats(operation?: string): void;
}
