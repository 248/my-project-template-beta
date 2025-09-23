/**
 * 本格的なパフォーマンス監視とアラート機能
 */

import { PerformanceMonitor, PerformanceStats } from './performance';

/**
 * パフォーマンスアラート設定
 */
export interface PerformanceAlert {
  /** アラート名 */
  name: string;
  /** 対象操作 */
  operation: string;
  /** 閾値（ミリ秒） */
  thresholdMs: number;
  /** パーセンタイル（50, 95, 99） */
  percentile: 50 | 95 | 99;
  /** 最小測定回数 */
  minMeasurements: number;
  /** アラート発火時のコールバック */
  onAlert?: (alert: PerformanceAlert, stats: PerformanceStats) => void;
}

/**
 * パフォーマンス監視結果
 */
export interface MonitoringResult {
  /** 操作名 */
  operation: string;
  /** 統計情報 */
  stats: PerformanceStats;
  /** 発火したアラート */
  alerts: PerformanceAlert[];
  /** 目標達成状況 */
  isWithinTarget: boolean;
}

/**
 * 拡張パフォーマンス監視クラス
 */
export class AdvancedPerformanceMonitor extends PerformanceMonitor {
  private alerts: Map<string, PerformanceAlert[]> = new Map();
  private alertHistory: Array<{
    alert: PerformanceAlert;
    stats: PerformanceStats;
    timestamp: Date;
  }> = [];

  /**
   * パフォーマンスアラートを追加
   */
  addAlert(alert: PerformanceAlert): void {
    if (!this.alerts.has(alert.operation)) {
      this.alerts.set(alert.operation, []);
    }
    this.alerts.get(alert.operation)!.push(alert);
  }

  /**
   * アラートを削除
   */
  removeAlert(operation: string, alertName: string): void {
    const operationAlerts = this.alerts.get(operation);
    if (operationAlerts) {
      const filtered = operationAlerts.filter(
        alert => alert.name !== alertName
      );
      this.alerts.set(operation, filtered);
    }
  }

  /**
   * 操作の監視結果を取得（アラートチェック付き）
   */
  getMonitoringResult(operation: string): MonitoringResult | null {
    const stats = this.getStats(operation);
    if (!stats) {
      return null;
    }

    const operationAlerts = this.alerts.get(operation) || [];
    const firedAlerts: PerformanceAlert[] = [];

    // アラートチェック
    for (const alert of operationAlerts) {
      if (this.shouldFireAlert(alert, stats)) {
        firedAlerts.push(alert);
        this.recordAlertFired(alert, stats);
      }
    }

    return {
      operation,
      stats,
      alerts: firedAlerts,
      isWithinTarget: this.checkTargetCompliance(operation, stats),
    };
  }

  /**
   * アラートが発火すべきかチェック
   */
  private shouldFireAlert(
    alert: PerformanceAlert,
    stats: PerformanceStats
  ): boolean {
    if (stats.count < alert.minMeasurements) {
      return false;
    }

    let value: number;
    switch (alert.percentile) {
      case 50:
        value = stats.p50;
        break;
      case 95:
        value = stats.p95;
        break;
      case 99:
        value = stats.p99;
        break;
      default:
        return false;
    }

    return value > alert.thresholdMs;
  }

  /**
   * アラート発火を記録
   */
  private recordAlertFired(
    alert: PerformanceAlert,
    stats: PerformanceStats
  ): void {
    this.alertHistory.push({
      alert,
      stats: { ...stats },
      timestamp: new Date(),
    });

    // 履歴の上限管理（最新100件まで）
    if (this.alertHistory.length > 100) {
      this.alertHistory.shift();
    }

    // コールバック実行
    if (alert.onAlert) {
      try {
        alert.onAlert(alert, stats);
      } catch (error) {
        console.error('Performance alert callback error:', error);
      }
    }

    // 開発環境でのログ出力
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🚨 Performance Alert: ${alert.name}`, {
        operation: alert.operation,
        threshold: `${alert.thresholdMs}ms`,
        actual: `${this.getPercentileValue(stats, alert.percentile)}ms`,
        percentile: `p${alert.percentile}`,
      });
    }
  }

  /**
   * パーセンタイル値を取得
   */
  private getPercentileValue(
    stats: PerformanceStats,
    percentile: 50 | 95 | 99
  ): number {
    switch (percentile) {
      case 50:
        return stats.p50;
      case 95:
        return stats.p95;
      case 99:
        return stats.p99;
    }
  }

  /**
   * 目標達成状況をチェック
   */
  private checkTargetCompliance(
    operation: string,
    stats: PerformanceStats
  ): boolean {
    // ヘルスチェックAPIの特別な目標チェック
    if (operation.includes('health')) {
      return stats.p95 <= 300; // p95 < 300ms
    }

    // その他の操作の一般的な目標
    return stats.p95 <= 1000; // p95 < 1s
  }

  /**
   * アラート履歴を取得
   */
  getAlertHistory(limit: number = 50): Array<{
    alert: PerformanceAlert;
    stats: PerformanceStats;
    timestamp: Date;
  }> {
    return this.alertHistory
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 全操作の監視結果を取得
   */
  getAllMonitoringResults(): MonitoringResult[] {
    const results: MonitoringResult[] = [];

    for (const operation of this.getAllOperations()) {
      const result = this.getMonitoringResult(operation);
      if (result) {
        results.push(result);
      }
    }

    return results.sort((a, b) => b.stats.count - a.stats.count);
  }

  /**
   * 全操作名を取得
   */
  private getAllOperations(): string[] {
    const operations = new Set<string>();

    // 測定データから操作名を取得
    for (const operation of this.getAllStats()) {
      operations.add(Object.keys(operation)[0]);
    }

    // アラート設定から操作名を取得
    for (const operation of this.alerts.keys()) {
      operations.add(operation);
    }

    return Array.from(operations);
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(): {
    summary: {
      totalOperations: number;
      totalMeasurements: number;
      alertsFired: number;
      operationsWithinTarget: number;
    };
    operations: MonitoringResult[];
    recentAlerts: Array<{
      alert: PerformanceAlert;
      stats: PerformanceStats;
      timestamp: Date;
    }>;
  } {
    const results = this.getAllMonitoringResults();
    const recentAlerts = this.getAlertHistory(10);

    return {
      summary: {
        totalOperations: results.length,
        totalMeasurements: results.reduce((sum, r) => sum + r.stats.count, 0),
        alertsFired: recentAlerts.length,
        operationsWithinTarget: results.filter(r => r.isWithinTarget).length,
      },
      operations: results,
      recentAlerts,
    };
  }

  /**
   * パフォーマンスダッシュボード用データを取得
   */
  getDashboardData(): {
    healthCheck: MonitoringResult | null;
    criticalOperations: MonitoringResult[];
    recentAlerts: Array<{
      alert: PerformanceAlert;
      stats: PerformanceStats;
      timestamp: Date;
    }>;
  } {
    const healthCheck = this.getMonitoringResult('api__api_health');
    const allResults = this.getAllMonitoringResults();

    // 目標未達成の操作を抽出
    const criticalOperations = allResults
      .filter(r => !r.isWithinTarget || r.alerts.length > 0)
      .slice(0, 5);

    return {
      healthCheck,
      criticalOperations,
      recentAlerts: this.getAlertHistory(5),
    };
  }
}

/**
 * グローバル拡張パフォーマンス監視インスタンス
 */
export const globalAdvancedMonitor = new AdvancedPerformanceMonitor();

// デフォルトアラートの設定
globalAdvancedMonitor.addAlert({
  name: 'Health Check P95 Target',
  operation: 'api__api_health',
  thresholdMs: 300,
  percentile: 95,
  minMeasurements: 5,
  onAlert: (alert, stats) => {
    console.warn(
      `Health check p95 (${stats.p95.toFixed(2)}ms) exceeded target (${alert.thresholdMs}ms)`
    );
  },
});

globalAdvancedMonitor.addAlert({
  name: 'Health Check P99 Critical',
  operation: 'api__api_health',
  thresholdMs: 1000,
  percentile: 99,
  minMeasurements: 10,
  onAlert: (alert, stats) => {
    console.error(
      `Health check p99 (${stats.p99.toFixed(2)}ms) is critically slow!`
    );
  },
});

/**
 * パフォーマンス監視の初期化
 */
export function initializePerformanceMonitoring(): void {
  // ブラウザ環境でのみ実行
  if (typeof window === 'undefined') return;

  // 定期的なレポート出力（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const report = globalAdvancedMonitor.generateReport();
      if (report.summary.totalMeasurements > 0) {
        console.group('📊 Performance Report');
        console.table(report.summary);
        if (report.recentAlerts.length > 0) {
          console.warn('Recent Alerts:', report.recentAlerts);
        }
        console.groupEnd();
      }
    }, 30000); // 30秒ごと
  }
}

/**
 * パフォーマンス監視付きのヘルスチェック
 */
export async function monitoredHealthCheck(): Promise<{
  data: unknown;
  monitoring: MonitoringResult | null;
}> {
  // 測定実行
  const { result } = await globalAdvancedMonitor.measure(
    'api__api_health',
    async () => {
      const response = await fetch('/api/health');
      const data = await response.json();
      return data;
    }
  );

  // 監視結果取得
  const monitoring =
    globalAdvancedMonitor.getMonitoringResult('api__api_health');

  return {
    data: result,
    monitoring,
  };
}
