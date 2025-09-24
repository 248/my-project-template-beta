'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import {
  AuthErrorDisplay,
  type AuthError,
} from '@/components/auth/AuthErrorDisplay';
import { getAuthErrorMessage } from '@/lib/auth/redirect-utils';

interface AuthErrorHandlerProps {
  errorCode: string;
  className?: string;
}

export function AuthErrorHandler({
  errorCode,
  className,
}: AuthErrorHandlerProps) {
  const router = useRouter();
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    if (errorCode) {
      setError({
        code: errorCode.toUpperCase(),
        message: getAuthErrorMessage(errorCode),
      });
    }
  }, [errorCode]);

  const handleRetry = () => {
    // エラーをクリアしてページをリロード
    setError(null);
    router.refresh();
  };

  const handleDismiss = () => {
    // URLからエラーパラメータを削除
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    router.replace(url.pathname + url.search);
    setError(null);
  };

  if (!error) return null;

  return (
    <AuthErrorDisplay
      error={error}
      onRetry={
        ['NETWORK_ERROR', 'AUTH_PROVIDER_ERROR'].includes(error.code)
          ? handleRetry
          : undefined
      }
      onDismiss={handleDismiss}
      className={className}
    />
  );
}
