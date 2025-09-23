import type { HealthResponse } from '@template/generated';

import { Container } from '@/components/layout/Container';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/error-boundary';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * サーバーサイドでヘルスチェックAPIを呼び出し
 */
async function getHealthStatus(): Promise<{
  data?: HealthResponse;
  error?: string;
  performanceMs?: number;
}> {
  const startTime = performance.now();

  try {
    // サーバーサイドでの内部API呼び出し
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8787';
    const response = await fetch(`${baseUrl}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NextJS-SSR/1.0',
      },
      // SSRでは短めのタイムアウト
      signal: AbortSignal.timeout(3000),
    });

    const performanceMs = performance.now() - startTime;

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as any;
      return {
        error: `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`,
        performanceMs,
      };
    }

    const data = (await response.json()) as HealthResponse;

    // 開発環境でのパフォーマンスログ
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[SSR Health Check] Completed in ${performanceMs.toFixed(2)}ms`,
        {
          status: data.status,
          servicesCount: data.services.length,
          traceId: data.traceId,
        }
      );
    }

    return { data, performanceMs };
  } catch (error) {
    const performanceMs = performance.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    console.error(
      `[SSR Health Check] Failed in ${performanceMs.toFixed(2)}ms:`,
      errorMessage
    );

    return {
      error: errorMessage,
      performanceMs,
    };
  }
}

export default async function HealthPage() {
  const result = await getHealthStatus();

  return (
    <Container className="py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-1000 mb-2">
            システムヘルスチェック
          </h1>
          <p className="text-neutral-600">
            システムの稼働状況とサービスの健全性を確認できます
          </p>
        </div>

        {result.error ? (
          // エラー状態の表示
          <ErrorState
            title="ヘルスチェックに失敗しました"
            message={`エラー: ${result.error}`}
            retryLabel="ページを再読み込み"
            className="my-8"
          />
        ) : result.data ? (
          <div className="space-y-6">
            {/* パフォーマンス情報（開発環境のみ） */}
            {process.env.NODE_ENV === 'development' && result.performanceMs && (
              <Alert variant={result.performanceMs > 300 ? 'warning' : 'info'}>
                <p className="text-sm">
                  <strong>パフォーマンス:</strong> SSR実行時間{' '}
                  {result.performanceMs.toFixed(2)}ms
                  {result.performanceMs > 300 && ' (目標300ms超過)'}
                  {result.data.traceId && ` | Trace ID: ${result.data.traceId}`}
                </p>
              </Alert>
            )}

            {/* 全体ステータス */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-neutral-900">
                    全体ステータス
                  </h2>
                  <StatusBadge status={result.data.status} />
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-1">
                      最終チェック時刻
                    </p>
                    <p className="text-sm text-neutral-600">
                      {new Date(result.data.timestamp).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-700 mb-1">
                      稼働サービス数
                    </p>
                    <p className="text-sm text-neutral-600">
                      {
                        result.data.services.filter(s => s.status === 'up')
                          .length
                      }{' '}
                      / {result.data.services.length}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* サービス詳細 */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold text-neutral-900">
                  サービス詳細
                </h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {result.data.services.map((service, index) => (
                    <div
                      key={`${service.name}-${index}`}
                      className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <StatusBadge status={service.status} />
                        <div>
                          <p className="font-medium text-neutral-900">
                            {service.name}
                          </p>
                          {service.responseTime && (
                            <p className="text-sm text-neutral-600">
                              応答時間: {service.responseTime}ms
                            </p>
                          )}
                          {service.error && (
                            <p className="text-sm text-red-600">
                              エラー: {service.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* 情報メッセージ */}
            <Alert variant="info">
              <p className="text-sm">
                <strong>注意:</strong>{' '}
                このページはサーバーサイドレンダリング（SSR）で生成されています。
                リアルタイムの状況を確認するには、ページを再読み込みしてください。
              </p>
            </Alert>
          </div>
        ) : (
          // データが取得できない場合
          <ErrorState
            title="データを取得できませんでした"
            message="ヘルスチェックデータの取得に失敗しました。"
            retryLabel="ページを再読み込み"
            className="my-8"
          />
        )}
      </div>
    </Container>
  );
}
