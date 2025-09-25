import { RetryPolicy } from '../config/config-adapter';

export interface RetryOptions extends RetryPolicy {
  timeoutMs?: number;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * 指数バックオフ + ジッターでリトライを実行
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, jitterFactor, timeoutMs } =
    options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (timeoutMs) {
        return await withTimeout(operation(), timeoutMs);
      } else {
        return await operation();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 最後の試行の場合はエラーを投げる
      if (attempt === maxAttempts) {
        throw new RetryError(
          `Operation failed after ${maxAttempts} attempts`,
          attempt,
          lastError
        );
      }

      // 次の試行まで待機（指数バックオフ + ジッター）
      const delay = calculateDelay(
        attempt,
        baseDelayMs,
        maxDelayMs,
        jitterFactor
      );
      await sleep(delay);
    }
  }

  // この行には到達しないはずだが、TypeScriptの型チェックのため
  throw lastError!;
}

/**
 * タイムアウト付きでPromiseを実行
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * 指数バックオフ + ジッターで遅延時間を計算
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number
): number {
  // 指数バックオフ: baseDelay * 2^(attempt-1)
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);

  // 最大遅延時間でキャップ
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // ジッター追加: ±jitterFactor の範囲でランダム調整
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);

  return Math.max(0, cappedDelay + jitter);
}

/**
 * 指定時間待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
