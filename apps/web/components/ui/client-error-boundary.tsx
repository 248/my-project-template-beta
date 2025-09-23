'use client';

/**
 * クライアントサイド専用ErrorBoundary
 * SSR対応のため、クライアントサイドでのみ有効化される
 */

import React, { ReactNode } from 'react';

import { ErrorBoundary } from './error-boundary';

interface ClientErrorBoundaryProps {
  children: ReactNode;
}

/**
 * クライアントサイドでのみErrorBoundaryを有効化するラッパー
 */
export function ClientErrorBoundary({ children }: ClientErrorBoundaryProps) {
  // サーバーサイドでは何もしない
  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  // クライアントサイドでのみErrorBoundaryを適用
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // エラー報告（将来的にはSentryなどに送信）
        console.error('Client Error Boundary caught an error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });

        // 開発環境では詳細ログを出力
        if (process.env.NODE_ENV === 'development') {
          console.group('🚨 Error Boundary Details');
          console.error('Error:', error);
          console.error('Error Info:', errorInfo);
          console.groupEnd();
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
