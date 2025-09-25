'use client';

import React, { useState } from 'react';

import {
  AuthErrorDisplay,
  type AuthError,
} from '@/components/auth/AuthErrorDisplay';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface LoginButtonProps {
  className?: string;
  redirectTo?: string;
}

export function LoginButton({ className, redirectTo }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleLogin = async (
    provider: 'google' | 'github' | 'discord',
    isRetry = false
  ) => {
    setIsLoading(true);
    if (!isRetry) {
      setError(null);
      setRetryCount(0);
    }

    try {
      const url = new URL('/auth/login', window.location.origin);
      url.searchParams.set('provider', provider);
      if (redirectTo) {
        url.searchParams.set('redirectTo', redirectTo);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

      const response = await fetch(url.toString(), {
        method: 'POST',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'ログインに失敗しました');
      }

      const data = await response.json();

      // OAuth認証URLにリダイレクト
      if (data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('認証URLの取得に失敗しました');
      }
    } catch (err) {
      console.error('Login error:', err);

      let errorCode = 'AUTH_PROVIDER_ERROR';
      let errorMessage = 'ログインに失敗しました';

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorCode = 'NETWORK_ERROR';
          errorMessage = 'ネットワークタイムアウトが発生しました';
        } else if (err.message.includes('fetch')) {
          errorCode = 'NETWORK_ERROR';
          errorMessage = 'ネットワークエラーが発生しました';
        } else {
          errorMessage = err.message;
        }
      }

      setError({
        code: errorCode,
        message: errorMessage,
      });

      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }

      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      // 最大3回まで再試行
      const lastProvider = 'google'; // デフォルトでGoogleを再試行
      handleLogin(lastProvider, true);
    }
  };

  const handleDismissError = () => {
    setError(null);
    setRetryCount(0);
  };

  const providers = [
    {
      id: 'google' as const,
      name: 'Google',
      icon: 'google',
      variant: 'primary' as const,
    },
    {
      id: 'github' as const,
      name: 'GitHub',
      icon: 'github',
      variant: 'secondary' as const,
    },
    {
      id: 'discord' as const,
      name: 'Discord',
      icon: 'discord',
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className={className}>
      <AuthErrorDisplay
        error={error}
        onRetry={retryCount < 3 ? handleRetry : undefined}
        onDismiss={handleDismissError}
        className="mb-4"
      />

      <div className="space-y-3">
        {providers.map(provider => (
          <Button
            key={provider.id}
            data-testid={
              provider.id === 'google'
                ? 'login-button'
                : `login-${provider.id}-button`
            }
            variant={provider.variant}
            className="w-full flex items-center justify-center space-x-2"
            loading={isLoading}
            onClick={() => handleLogin(provider.id)}
            disabled={isLoading}
          >
            {!isLoading && (
              <Icon
                name={provider.icon}
                size={18}
                className={
                  provider.variant === 'primary'
                    ? 'text-white'
                    : 'text-neutral-700'
                }
              />
            )}
            <span>
              {isLoading ? 'ログイン中...' : `${provider.name}でログイン`}
            </span>
          </Button>
        ))}
      </div>

      {retryCount > 0 && (
        <p className="text-xs text-neutral-600 mt-2 text-center">
          再試行回数: {retryCount}/3
        </p>
      )}

      <p className="text-xs text-neutral-600 mt-4 text-center">
        ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
      </p>
    </div>
  );
}
