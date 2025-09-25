'use client';

import React from 'react';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export interface AuthError {
  code: string;
  message: string;
  details?: unknown;
}

interface AuthErrorDisplayProps {
  error: AuthError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function AuthErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className,
}: AuthErrorDisplayProps) {
  if (!error) return null;

  const getErrorIcon = (code: string) => {
    switch (code) {
      case 'AUTH_PROVIDER_ERROR':
      case 'OAUTH_CANCELLED':
      case 'OAUTH_DENIED':
        return 'x';
      case 'NETWORK_ERROR':
        return 'wifi-off';
      case 'SESSION_EXPIRED':
        return 'clock';
      default:
        return 'alert-triangle';
    }
  };

  const getErrorTitle = (code: string) => {
    switch (code) {
      case 'AUTH_PROVIDER_ERROR':
        return '認証エラー';
      case 'OAUTH_CANCELLED':
        return 'ログインがキャンセルされました';
      case 'OAUTH_DENIED':
        return 'ログインが拒否されました';
      case 'NETWORK_ERROR':
        return 'ネットワークエラー';
      case 'SESSION_EXPIRED':
        return 'セッションが期限切れです';
      case 'VALIDATION_ERROR':
        return '入力エラー';
      default:
        return 'エラーが発生しました';
    }
  };

  const shouldShowRetry = (code: string) => {
    return ['NETWORK_ERROR', 'AUTH_PROVIDER_ERROR', 'SESSION_EXPIRED'].includes(
      code
    );
  };

  return (
    <div className={`alert alert-danger ${className || ''}`}>
      <div className="flex items-start space-x-3">
        <Icon
          name={getErrorIcon(error.code)}
          size={20}
          className="text-danger-600 flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-danger-800 mb-1">
            {getErrorTitle(error.code)}
          </h4>
          <p className="text-sm text-danger-700">{error.message}</p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {shouldShowRetry(error.code) && onRetry && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRetry}
              className="text-xs"
            >
              再試行
            </Button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-danger-600 hover:text-danger-800 transition-colors"
              aria-label="エラーを閉じる"
            >
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
