import { getHealth } from '@generated/client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { HealthChecker } from '@/components/health/HealthChecker';

// APIクライアントをモック
vi.mock('@generated/client', () => ({
  getHealth: vi.fn(),
}));

const mockGetHealth = vi.mocked(getHealth);

describe('HealthChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初期状態で正しく表示される', () => {
    render(<HealthChecker />);

    expect(screen.getByText('システムヘルスチェック')).toBeInTheDocument();
    expect(
      screen.getByText('システムの稼働状況をリアルタイムで確認できます')
    ).toBeInTheDocument();
    expect(screen.getByTestId('health-check-button')).toBeInTheDocument();
    expect(screen.getByText('ヘルスチェック実行')).toBeInTheDocument();
  });

  it('ヘルスチェックボタンをクリックするとAPIが呼び出される', async () => {
    const mockResponse = {
      data: {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00Z',
        traceId: 'test-trace-id',
        services: [
          {
            name: 'Supabase',
            status: 'up' as const,
            responseTime: 150,
          },
        ],
      },
      status: 200,
    };

    mockGetHealth.mockResolvedValue(mockResponse);

    render(<HealthChecker />);

    const button = screen.getByTestId('health-check-button');
    fireEvent.click(button);

    // ローディング状態の確認
    expect(screen.getByText('ヘルスチェック実行中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetHealth).toHaveBeenCalledTimes(1);
    });

    // 結果の表示確認
    await waitFor(() => {
      expect(screen.getByTestId('health-result')).toBeInTheDocument();
    });

    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Supabase')).toBeInTheDocument();
    expect(screen.getByText('UP')).toBeInTheDocument();
    expect(screen.getByText('150ms')).toBeInTheDocument();
  });

  it('degradedステータスが正しく表示される', async () => {
    const mockResponse = {
      data: {
        status: 'degraded' as const,
        timestamp: '2024-01-01T00:00:00Z',
        traceId: 'test-trace-id',
        services: [
          {
            name: 'Supabase',
            status: 'up' as const,
            responseTime: 500,
          },
        ],
      },
      status: 200,
    };

    mockGetHealth.mockResolvedValue(mockResponse);

    render(<HealthChecker />);

    const button = screen.getByTestId('health-check-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Degraded')).toBeInTheDocument();
    });
  });

  it('unhealthyステータスが正しく表示される', async () => {
    const mockResponse = {
      data: {
        status: 'unhealthy' as const,
        timestamp: '2024-01-01T00:00:00Z',
        traceId: 'test-trace-id',
        services: [
          {
            name: 'Supabase',
            status: 'down' as const,
          },
        ],
      },
      status: 200,
    };

    mockGetHealth.mockResolvedValue(mockResponse);

    render(<HealthChecker />);

    const button = screen.getByTestId('health-check-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Down')).toBeInTheDocument();
    });

    expect(screen.getByText('DOWN')).toBeInTheDocument();
  });

  it('APIエラー時にエラーメッセージと再試行ボタンが表示される', async () => {
    const mockError = new Error('ネットワークエラー');
    mockGetHealth.mockRejectedValue(mockError);

    render(<HealthChecker />);

    const button = screen.getByTestId('health-check-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
    });

    expect(screen.getByText('ネットワークエラー')).toBeInTheDocument();
    expect(screen.getByText('再試行')).toBeInTheDocument();
  });

  it('再試行ボタンをクリックすると再度APIが呼び出される', async () => {
    const mockError = new Error('ネットワークエラー');
    mockGetHealth.mockRejectedValueOnce(mockError);

    const mockResponse = {
      data: {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00Z',
        traceId: 'test-trace-id',
        services: [],
      },
      status: 200,
    };
    mockGetHealth.mockResolvedValueOnce(mockResponse);

    render(<HealthChecker />);

    // 最初のAPIコール（エラー）
    const button = screen.getByTestId('health-check-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    // 再試行ボタンをクリック
    const retryButton = screen.getByText('再試行');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockGetHealth).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(screen.getByText('OK')).toBeInTheDocument();
    });
  });

  it('複数のサービスが正しく表示される', async () => {
    const mockResponse = {
      data: {
        status: 'degraded' as const,
        timestamp: '2024-01-01T00:00:00Z',
        traceId: 'test-trace-id',
        services: [
          {
            name: 'Supabase',
            status: 'up' as const,
            responseTime: 150,
          },
          {
            name: 'Cache',
            status: 'down' as const,
          },
        ],
      },
      status: 200,
    };

    mockGetHealth.mockResolvedValue(mockResponse);

    render(<HealthChecker />);

    const button = screen.getByTestId('health-check-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Supabase')).toBeInTheDocument();
      expect(screen.getByText('Cache')).toBeInTheDocument();
    });

    // Supabaseは正常
    expect(screen.getByText('150ms')).toBeInTheDocument();

    // 各サービスのステータス確認
    const upStatuses = screen.getAllByText('UP');
    const downStatuses = screen.getAllByText('DOWN');
    expect(upStatuses).toHaveLength(1);
    expect(downStatuses).toHaveLength(1);
  });

  it('traceIdが表示される', async () => {
    const mockResponse = {
      data: {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00Z',
        traceId: 'test-trace-12345',
        services: [],
      },
      status: 200,
    };

    mockGetHealth.mockResolvedValue(mockResponse);

    render(<HealthChecker />);

    const button = screen.getByTestId('health-check-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText('Trace ID: test-trace-12345')
      ).toBeInTheDocument();
    });
  });
});
