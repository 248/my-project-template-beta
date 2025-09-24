import Link from 'next/link';
import { redirect } from 'next/navigation';

import { UserMenu } from '@/components/auth/UserMenu';
import { HealthChecker } from '@/components/health/HealthChecker';
import { Container } from '@/components/layout/Container';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  // サーバーサイドで認証状態を確認
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 未認証の場合はトップページにリダイレクト
  if (!session?.user) {
    redirect('/');
  }

  const user = session.user;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ヘッダー */}
      <Header showAuthButton={true} isAuthenticated={true} />

      {/* メインコンテンツ */}
      <Container className="py-8">
        <div className="max-w-4xl mx-auto">
          {/* ウェルカムセクション */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-neutral-1000 mb-2">
                  ホーム
                </h1>
                <p className="text-neutral-700">
                  ようこそ、{user.user_metadata?.full_name || user.email}さん
                </p>
              </div>

              {/* ユーザーメニュー */}
              <Card className="bg-white">
                <CardBody className="p-4">
                  <UserMenu user={user} />
                </CardBody>
              </Card>
            </div>

            {/* ユーザー情報カード */}
            <Card className="mb-8">
              <CardBody>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                      <Icon
                        name="user"
                        size={32}
                        className="text-primary-600"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                      アカウント情報
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className="font-medium text-neutral-700 w-20">
                          名前:
                        </span>
                        <span className="text-neutral-900">
                          {user.user_metadata?.full_name || '未設定'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-neutral-700 w-20">
                          メール:
                        </span>
                        <span className="text-neutral-900">{user.email}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-medium text-neutral-700 w-20">
                          ID:
                        </span>
                        <span className="text-neutral-600 font-mono text-xs">
                          {user.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* 機能セクション */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* ヘルスチェック機能 */}
            <HealthChecker />

            {/* システム情報 */}
            <Card>
              <CardBody>
                <div className="flex items-center mb-4">
                  <Icon
                    name="info"
                    size={24}
                    className="text-primary-500 mr-3"
                  />
                  <h3 className="text-lg font-semibold text-neutral-900">
                    システム情報
                  </h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">プラットフォーム:</span>
                    <span className="text-neutral-900">Cloudflare Workers</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">フレームワーク:</span>
                    <span className="text-neutral-900">Next.js App Router</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">認証:</span>
                    <span className="text-neutral-900">Supabase Auth</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">ステータス:</span>
                    <span className="flex items-center text-success-600">
                      <Icon name="check" size={16} className="mr-1" />
                      稼働中
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* ナビゲーションセクション */}
          <Card>
            <CardBody>
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                クイックナビゲーション
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/health" className="block">
                  <Button
                    variant="secondary"
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Icon
                      name="health"
                      size={18}
                      className="text-neutral-700"
                    />
                    <span>ヘルスチェック</span>
                  </Button>
                </Link>

                <Link href="/" className="block">
                  <Button
                    variant="secondary"
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Icon name="home" size={18} className="text-neutral-700" />
                    <span>トップページ</span>
                  </Button>
                </Link>

                <Button
                  variant="secondary"
                  className="w-full flex items-center justify-center space-x-2"
                  disabled
                >
                  <Icon
                    name="settings"
                    size={18}
                    className="text-neutral-400"
                  />
                  <span>設定</span>
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </Container>
    </div>
  );
}
