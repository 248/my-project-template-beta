import Link from 'next/link';

import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';

export default function HomePage() {
  return (
    <Container className="py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-1000 sm:text-6xl mb-6">
          Template Beta
        </h1>
        <p className="text-lg leading-8 text-neutral-700 mb-12 max-w-2xl mx-auto">
          Next.js template with Cloudflare Workers and Supabase
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                認証機能
              </h3>
              <p className="text-neutral-600 mb-4">
                Supabase Authを使用した安全な認証システム
              </p>
              <Button data-testid="login-button" className="w-full">
                ログイン
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                ヘルスチェック
              </h3>
              <p className="text-neutral-600 mb-4">システムの稼働状況を確認</p>
              <Link href="/health" className="block">
                <Button variant="secondary" className="w-full">
                  ヘルスチェック
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-4">
            技術スタック
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              'Next.js App Router',
              'Cloudflare Workers',
              'Supabase',
              'Tailwind CSS',
              'TypeScript',
              'OpenAPI',
            ].map(tech => (
              <span
                key={tech}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
