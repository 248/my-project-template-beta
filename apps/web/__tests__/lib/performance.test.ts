/**
 * パフォーマンス測定ユーティリティのテスト
 */

import { vi } from 'vitest';

import {
  PerformanceMonitor,
  globalPerformanceMonitor,
  measureApiCall,
  measureHealthCheck,
} from '@/lib/performance';

// fetchのモック
global.fetch = vi.fn();

// performanceのモック
const mockPerformance = {
  now: vi.fn(),
};
global.performance = mockPerformance as any;

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor(100); // テスト用に小さな値
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(0);
  });

  describe('measure', () => {
    it('正常な操作の実行時間を測定すべき', async () => {
      mockPerformance.now
        .mockReturnValueOnce(0) // 開始時刻
        .mockReturnValueOnce(100); // 終了時刻

      const testFn = vi.fn().mockResolvedValue('test result');

      const { result, metrics } = await monitor.measure(
        'test-operation',
        testFn
      );

      expect(result).toBe('test result');
      expect(metrics).toEqual({
        duration: 100,
        startTime: 0,
        endTime: 100,
        operation: 'test-operation',
        metadata: undefined,
      });
      expect(testFn).toHaveBeenCalledTimes(1);
    });

    it('メタデータ付きで測定すべき', async () => {
      mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(150);

      const testFn = vi.fn().mockResolvedValue('result');
      const metadata = { userId: '123', action: 'test' };

      const { result, metrics } = await monitor.measure(
        'test-op',
        testFn,
        metadata
      );

      expect(metrics.metadata).toEqual(metadata);
    });

    it('エラーが発生した場合でも実行時間を記録すべき', async () => {
      mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(200);

      const testError = new Error('Test error');
      const testFn = vi.fn().mockRejectedValue(testError);

      await expect(monitor.measure('error-operation', testFn)).rejects.toThrow(
        'Test error'
      );

      // エラー操作の統計が記録されているか確認
      const stats = monitor.getStats('error-operation_error');
      expect(stats).toBeTruthy();
      expect(stats!.count).toBe(1);
      expect(stats!.values[0]).toBe(200);
    });
  });

  describe('getStats', () => {
    it('統計情報を正しく計算すべき', async () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(100) // 1回目: 100ms
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(200) // 2回目: 200ms
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(150); // 3回目: 150ms

      const testFn = vi.fn().mockResolvedValue('result');

      await monitor.measure('test-stats', testFn);
      await monitor.measure('test-stats', testFn);
      await monitor.measure('test-stats', testFn);

      const stats = monitor.getStats('test-stats');

      expect(stats).toEqual({
        count: 3,
        average: 150, // (100 + 200 + 150) / 3
        min: 100,
        max: 200,
        p50: 150,
        p95: 195, // 実際の計算結果
        p99: 199, // 実際の計算結果
        values: [100, 200, 150],
      });
    });

    it('存在しない操作に対してnullを返すべき', () => {
      const stats = monitor.getStats('non-existent');
      expect(stats).toBeNull();
    });
  });

  describe('isP95WithinTarget', () => {
    it('p95が目標値以下の場合trueを返すべき', async () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(200);

      const testFn = vi.fn().mockResolvedValue('result');

      await monitor.measure('target-test', testFn);
      await monitor.measure('target-test', testFn);

      expect(monitor.isP95WithinTarget('target-test', 300)).toBe(true);
      expect(monitor.isP95WithinTarget('target-test', 150)).toBe(false);
    });
  });

  describe('clear', () => {
    it('特定の操作の測定データをクリアすべき', async () => {
      mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(100);

      const testFn = vi.fn().mockResolvedValue('result');
      await monitor.measure('clear-test', testFn);

      expect(monitor.getStats('clear-test')).toBeTruthy();

      monitor.clear('clear-test');

      expect(monitor.getStats('clear-test')).toBeNull();
    });

    it('全ての測定データをクリアすべき', async () => {
      mockPerformance.now
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(200);

      const testFn = vi.fn().mockResolvedValue('result');
      await monitor.measure('clear-all-1', testFn);
      await monitor.measure('clear-all-2', testFn);

      expect(monitor.getStats('clear-all-1')).toBeTruthy();
      expect(monitor.getStats('clear-all-2')).toBeTruthy();

      monitor.clear();

      expect(monitor.getStats('clear-all-1')).toBeNull();
      expect(monitor.getStats('clear-all-2')).toBeNull();
    });
  });
});

describe('measureApiCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(0);
    globalPerformanceMonitor.clear();
  });

  it('API呼び出しを測定すべき', async () => {
    const mockResponse = {
      json: vi.fn().mockResolvedValue({ status: 'ok' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(250);

    const { response, data, metrics } = await measureApiCall('/api/test');

    expect(global.fetch).toHaveBeenCalledWith('/api/test', undefined);
    expect(data).toEqual({ status: 'ok' });
    expect(metrics.duration).toBe(250);
    expect(metrics.operation).toBe('api__api_test');
  });

  it('POSTリクエストを測定すべき', async () => {
    const mockResponse = {
      json: vi.fn().mockResolvedValue({ result: 'created' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(300);

    const options = { method: 'POST', body: JSON.stringify({ data: 'test' }) };
    const { data, metrics } = await measureApiCall('/api/create', options);

    expect(global.fetch).toHaveBeenCalledWith('/api/create', options);
    expect(data).toEqual({ result: 'created' });
    expect(metrics.metadata).toEqual({ url: '/api/create', method: 'POST' });
  });
});

describe('measureHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(0);
    globalPerformanceMonitor.clear();
  });

  it('ヘルスチェックを測定し、目標値内かチェックすべき', async () => {
    const mockResponse = {
      json: vi.fn().mockResolvedValue({ status: 'healthy' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(250); // 250ms（目標300ms以内）

    const { data, metrics, isWithinTarget } = await measureHealthCheck();

    expect(data).toEqual({ status: 'healthy' });
    expect(metrics.duration).toBe(250);
    expect(isWithinTarget).toBe(true);
  });

  it('目標値を超えた場合、isWithinTargetがfalseになるべき', async () => {
    const mockResponse = {
      json: vi.fn().mockResolvedValue({ status: 'healthy' }),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    // 複数回実行してp95を計算
    mockPerformance.now
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(400) // 1回目: 400ms
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(350); // 2回目: 350ms

    await measureHealthCheck();
    const { isWithinTarget } = await measureHealthCheck();

    expect(isWithinTarget).toBe(false); // p95が300msを超える
  });
});
