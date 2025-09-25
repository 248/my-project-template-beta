import Link from 'next/link';
import React from 'react';

import { AuthErrorHandler } from '@/components/auth/AuthErrorHandler';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/server';

interface HomePageProps {
  searchParams: {
    error?: string;
    redirect_to?: string;
  };
}

export default async function HomePage({ searchParams = {} }: HomePageProps) {
  // サーバーサイドで認証状態を取得
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  const { error: errorCode, redirect_to: redirectTo } = searchParams;

  return (
    <Container className="py-12">
      <div className="text-center">
        {/* ヘッダー部分 */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-1000 sm:text-6xl mb-6">
            Template Beta
          </h1>
          <p className="text-lg leading-8 text-neutral-700 mb-8 max-w-2xl mx-auto">
            Next.js template with Cloudflare Workers and Supabase
          </p>

          {/* エラー表示 */}
          {errorCode && (
            <div className="max-w-md mx-auto mb-6">
              <AuthErrorHandler errorCode={errorCode} />
            </div>
          )}

          {/* 認証状態による表示切替 */}
          {user ? (
            <div className="max-w-md mx-auto">
              <div className="alert alert-success mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Icon
                    name="check"
                    size={20}
                    className="mr-2 text-success-600"
                  />
                  <p className="font-medium">ログイン済み</p>
                </div>
                <UserMenu user={user} />
              </div>
              <Link href={redirectTo || '/home'}>
                <Button
                  size="lg"
                  className="flex items-center justify-center space-x-2"
                >
                  <Icon name="home" size={20} className="text-white" />
                  <span>
                    {redirectTo ? '元のページへ戻る' : 'ホームページへ'}
                  </span>
                </Button>
              </Link>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="alert alert-info mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Icon
                    name="user"
                    size={20}
                    className="mr-2 text-primary-600"
                  />
                  <p className="font-medium">ログインしてください</p>
                </div>
                <p className="text-sm">
                  認証後、すべての機能をご利用いただけます
                </p>
                {redirectTo && (
                  <p className="text-xs text-primary-600 mt-2">
                    ログイン後、元のページに戻ります
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 機能カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <Card>
            <CardBody>
              <div className="flex items-center justify-center mb-4">
                <Icon name="user" size={32} className="text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                認証機能
              </h3>
              <p className="text-neutral-600 mb-6">
                Supabase Authを使用した安全な認証システム
              </p>
              {user ? (
                <Link href="/home" className="block">
                  <Button className="w-full flex items-center justify-center space-x-2">
                    <Icon name="home" size={18} className="text-white" />
                    <span>ホームページへ</span>
                  </Button>
                </Link>
              ) : (
                <LoginButton redirectTo={redirectTo} />
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-center mb-4">
                <Icon name="health" size={32} className="text-success-500" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                ヘルスチェック
              </h3>
              <p className="text-neutral-600 mb-6">システムの稼働状況を確認</p>
              <Link href="/health" className="block">
                <Button
                  variant="secondary"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <Icon name="health" size={18} className="text-neutral-700" />
                  <span>ヘルスチェック</span>
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>

        {/* 技術スタック */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-neutral-900 mb-6">
            技術スタック
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
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
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200"
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
