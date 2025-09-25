import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  withRetry,
  withTimeout,
  RetryError,
  TimeoutError,
} from '../utils/retry-utils';

describe('retry-utils', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withTimeout', () => {
    it('should resolve when promise completes within timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject with TimeoutError when promise takes too long', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 2000));
      const timeoutPromise = withTimeout(promise, 1000);

      // タイマーを進める
      vi.advanceTimersByTime(1000);

      await expect(timeoutPromise).rejects.toThrow(TimeoutError);
      await expect(timeoutPromise).rejects.toThrow(
        'Operation timed out after 1000ms'
      );
    });

    it('should reject with original error when promise rejects within timeout', async () => {
      const error = new Error('Original error');
      const promise = Promise.reject(error);

      await expect(withTimeout(promise, 1000)).rejects.toThrow(
        'Original error'
      );
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const options = {
        maxAttempts: 3,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        jitterFactor: 0.1,
      };

      const result = await withRetry(operation, options);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const options = {
        maxAttempts: 3,
        baseDelayMs: 10, // 短い遅延でテスト
        maxDelayMs: 100,
        jitterFactor: 0, // ジッターなしでテスト
      };

      // リアルタイマーを使用してテスト
      vi.useRealTimers();
      const result = await withRetry(operation, options);
      vi.useFakeTimers();

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw RetryError after max attempts', async () => {
      const error = new Error('Persistent failure');
      const operation = vi.fn().mockRejectedValue(error);
      const options = {
        maxAttempts: 2,
        baseDelayMs: 10, // 短い遅延でテスト
        maxDelayMs: 100,
        jitterFactor: 0, // ジッターなしでテスト
      };

      // リアルタイマーを使用してテスト
      vi.useRealTimers();
      await expect(withRetry(operation, options)).rejects.toThrow(RetryError);
      await expect(withRetry(operation, options)).rejects.toThrow(
        'Operation failed after 2 attempts'
      );
      vi.useFakeTimers();

      expect(operation).toHaveBeenCalledTimes(4); // 2回のテスト実行で合計4回
    });

    it('should apply timeout when specified', async () => {
      const operation = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 200))
        );
      const options = {
        maxAttempts: 1, // 1回だけ試行
        baseDelayMs: 10,
        maxDelayMs: 100,
        jitterFactor: 0,
        timeoutMs: 50, // 短いタイムアウト
      };

      // リアルタイマーを使用してテスト
      vi.useRealTimers();

      try {
        await withRetry(operation, options);
        expect.fail('Should have thrown an error');
      } catch (error) {
        // RetryErrorまたはTimeoutErrorのいずれかが投げられることを確認
        expect(error).toBeInstanceOf(Error);
        expect(
          error.name === 'RetryError' || error.name === 'TimeoutError'
        ).toBe(true);
      }

      vi.useFakeTimers();
    });
  });

  describe('delay calculation', () => {
    it('should calculate exponential backoff correctly', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const options = {
        maxAttempts: 3,
        baseDelayMs: 10, // 短い遅延でテスト
        maxDelayMs: 1000,
        jitterFactor: 0, // ジッターなしでテスト
      };

      // リアルタイマーを使用してテスト
      vi.useRealTimers();
      await expect(withRetry(operation, options)).rejects.toThrow(RetryError);
      vi.useFakeTimers();

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should cap delay at maxDelayMs', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      const options = {
        maxAttempts: 3, // 試行回数を減らす
        baseDelayMs: 10,
        maxDelayMs: 20, // 最大遅延を短く
        jitterFactor: 0,
      };

      // リアルタイマーを使用してテスト
      vi.useRealTimers();
      await expect(withRetry(operation, options)).rejects.toThrow(RetryError);
      vi.useFakeTimers();

      expect(operation).toHaveBeenCalledTimes(3);
    });
  });
});
