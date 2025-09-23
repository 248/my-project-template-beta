import { randomBytes } from 'crypto';

/**
 * traceIdを生成
 * 16バイトのランダムな値を32文字の16進数文字列として生成
 */
export function generateTraceId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * traceIdの形式を検証
 */
export function isValidTraceId(traceId: string): boolean {
  return /^[a-f0-9]{32}$/.test(traceId);
}

/**
 * HTTPヘッダーからtraceIdを抽出
 */
export function extractTraceIdFromHeaders(
  headers: Record<string, string | undefined>
): string | undefined {
  // X-Trace-Id ヘッダーから取得を試行
  const traceId = headers['x-trace-id'] || headers['X-Trace-Id'];

  if (traceId && isValidTraceId(traceId)) {
    return traceId;
  }

  return undefined;
}

/**
 * traceIdをHTTPヘッダーに設定するためのオブジェクトを生成
 */
export function createTraceHeaders(traceId: string): Record<string, string> {
  return {
    'X-Trace-Id': traceId,
  };
}
