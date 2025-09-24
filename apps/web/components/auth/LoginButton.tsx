'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className }: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (provider: 'google' | 'github' | 'discord') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/auth/login?provider=${provider}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'ログインに失敗しました');
      }

      // OAuth認証URLにリダイレクト
      if (data.data?.url) {
        window.location.href = data.data.url;
      } else {
        throw new Error('認証URLの取得に失敗しました');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
      setIsLoading(false);
    }
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
      {error && (
        <div className="alert alert-danger mb-4">
          <Icon name="x" size={16} className="mr-2 text-danger-600" />
          <p className="text-sm">{error}</p>
        </div>
      )}

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

      <p className="text-xs text-neutral-600 mt-4 text-center">
        ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
      </p>
    </div>
  );
}
