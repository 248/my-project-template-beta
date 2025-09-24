'use client';

import React, { useState } from 'react';

import {
  AuthErrorDisplay,
  type AuthError,
} from '@/components/auth/AuthErrorDisplay';
import { Button } from '@/components/ui/Button';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    [key: string]: unknown;
  };
}

interface UserMenuProps {
  user: User;
  className?: string;
}

export function UserMenu({ user, className }: UserMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleLogout = async (isRetry = false) => {
    setIsLoading(true);
    if (!isRetry) {
      setError(null);
      setRetryCount(0);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

      const response = await fetch('/auth/logout', {
        method: 'POST',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // ログアウト成功時はページをリロードして状態を更新
        window.location.reload();
      } else {
        throw new Error('ログアウトに失敗しました');
      }
    } catch (err) {
      console.error('Logout error:', err);

      let errorCode = 'AUTH_PROVIDER_ERROR';
      let errorMessage = 'ログアウトに失敗しました';

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
      handleLogout(true);
    }
  };

  const handleDismissError = () => {
    setError(null);
    setRetryCount(0);
  };

  return (
    <div className={className}>
      {error && (
        <AuthErrorDisplay
          error={error}
          onRetry={retryCount < 3 ? handleRetry : undefined}
          onDismiss={handleDismissError}
          className="mb-4"
        />
      )}

      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-900">
            {user.user_metadata?.full_name || user.email}
          </p>
          <p className="text-xs text-neutral-600">{user.email}</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          loading={isLoading}
          onClick={() => handleLogout()}
          disabled={isLoading}
        >
          {isLoading ? 'ログアウト中...' : 'ログアウト'}
        </Button>
      </div>

      {retryCount > 0 && (
        <p className="text-xs text-neutral-600 mt-2 text-center">
          再試行回数: {retryCount}/3
        </p>
      )}
    </div>
  );
}
