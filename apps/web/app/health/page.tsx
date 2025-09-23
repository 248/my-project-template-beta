import { Container } from '@/components/layout/Container';
import { Alert } from '@/components/ui/Alert';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';

// 仮のヘルスチェック結果（後でBFF層と連携）
async function getHealthStatus() {
  // TODO: BFF層のHealthServiceと連携
  return {
    status: 'healthy' as const,
    timestamp: new Date().toISOString(),
    services: [
      {
        name: 'Supabase',
        status: 'up' as const,
        responseTime: 150,
      },
      {
        name: 'Database',
        status: 'up' as const,
        responseTime: 85,
      },
    ],
  };
}

export default async function HealthPage() {
  const healthStatus = await getHealthStatus();

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

        <div className="space-y-6">
          {/* 全体ステータス */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">
                  全体ステータス
                </h2>
                <StatusBadge status={healthStatus.status} />
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-1">
                    最終チェック時刻
                  </p>
                  <p className="text-sm text-neutral-600">
                    {new Date(healthStatus.timestamp).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-1">
                    稼働サービス数
                  </p>
                  <p className="text-sm text-neutral-600">
                    {
                      healthStatus.services.filter(s => s.status === 'up')
                        .length
                    }{' '}
                    / {healthStatus.services.length}
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
                {healthStatus.services.map(service => (
                  <div
                    key={service.name}
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
      </div>
    </Container>
  );
}
