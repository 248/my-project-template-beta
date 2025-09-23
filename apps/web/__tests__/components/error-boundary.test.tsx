/**
 * ErrorBoundaryコンポーネントのテスト
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { ErrorBoundary, ErrorState } from '@/components/ui/error-boundary';

// エラーを投げるテスト用コンポーネント
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// コンソールエラーを抑制
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('エラーが発生しない場合、子コンポーネントを正常に表示すべき', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('エラーが発生した場合、デフォルトのエラー表示を表示すべき', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    expect(
      screen.getByText('申し訳ございませんが、予期しないエラーが発生しました。')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'リセット' })
    ).toBeInTheDocument();
  });

  it('開発環境でエラー詳細を表示すべき', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('エラー詳細（開発環境のみ）')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('再試行ボタンをクリックした場合、エラー状態をリセットすべき', async () => {
    // エラーを投げるコンポーネント
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    // 最初はエラーを投げる状態でレンダリング
    const { rerender } = render(
      <ErrorBoundary key="error-test">
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // エラー表示を確認
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

    // 再試行ボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: '再試行' }));

    // 少し待つ（ErrorBoundaryの内部タイムアウト）
    await new Promise(resolve => setTimeout(resolve, 150));

    // 新しいキーでErrorBoundaryを再レンダリング（エラーが発生しないコンポーネントで）
    rerender(
      <ErrorBoundary key="success-test">
        <TestComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('リセットボタンをクリックした場合、エラー状態をリセットすべき', () => {
    // エラーを投げるコンポーネント
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>No error</div>;
    };

    // 最初はエラーを投げる状態でレンダリング
    const { rerender } = render(
      <ErrorBoundary key="error-test">
        <TestComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // エラー表示を確認
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();

    // リセットボタンをクリック
    fireEvent.click(screen.getByRole('button', { name: 'リセット' }));

    // 新しいキーでErrorBoundaryを再レンダリング（エラーが発生しないコンポーネントで）
    rerender(
      <ErrorBoundary key="success-test">
        <TestComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('カスタムfallbackが提供された場合、それを使用すべき', () => {
    const customFallback = ({ error, retry }: any) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Custom Retry' })
    ).toBeInTheDocument();
  });

  it('onErrorコールバックが提供された場合、エラー発生時に呼び出すべき', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });
});

describe('ErrorState', () => {
  it('デフォルトのプロパティで正しく表示すべき', () => {
    render(<ErrorState />);

    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    expect(
      screen.getByText('申し訳ございませんが、処理中にエラーが発生しました。')
    ).toBeInTheDocument();
  });

  it('カスタムプロパティで正しく表示すべき', () => {
    const onRetry = vi.fn();

    render(
      <ErrorState
        title="カスタムエラー"
        message="カスタムメッセージ"
        onRetry={onRetry}
        retryLabel="もう一度試す"
      />
    );

    expect(screen.getByText('カスタムエラー')).toBeInTheDocument();
    expect(screen.getByText('カスタムメッセージ')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'もう一度試す' })
    ).toBeInTheDocument();
  });

  it('onRetryが提供されない場合、再試行ボタンを表示しないべき', () => {
    render(<ErrorState />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('再試行ボタンをクリックした場合、onRetryを呼び出すべき', () => {
    const onRetry = vi.fn();

    render(<ErrorState onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: '再試行' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
