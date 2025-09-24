'use client';

import { getHealth } from '@generated/client';
import type { HealthResponse, HealthResponseStatus } from '@generated/models';
import React, { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

interface HealthCheckerProps {
  className?: string;
}

interface HealthCheckState {
  isLoading: boolean;
  result: HealthResponse | null;
  error: string | null;
  lastChecked: Date | null;
}

export function HealthChecker({ className = '' }: HealthCheckerProps) {
  const [state, setState] = useState<HealthCheckState>({
    isLoading: false,
    result: null,
    error: null,
    lastChecked: null,
  });

  const executeHealthCheck = async () => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await getHealth();
      setState({
        isLoading: false,
        result: response.data,
        error: null,
        lastChecked: new Date(),
      });
    } catch (error) {
      console.error('ヘルスチェックエラー:', error);
      setState({
        isLoading: false,
        result: null,
        error:
          error instanceof Error ? error.message : '不明なエラーが発生しました',
        lastChecked: new Date(),
      });
    }
  };

  const getStatusDisplay = (status: HealthResponseStatus) => {
    switch (status) {
      case 'healthy':
        return {
          text: 'OK',
          color: 'text-success-600',
          bgColor: 'bg-success-100',
          icon: 'check',
        };
      case 'degraded':
        return {
          text: 'Degraded',
          color: 'text-warning-600',
          bgColor: 'bg-warning-100',
          icon: 'warning',
        };
      case 'unhealthy':
        return {
          text: 'Down',
          color: 'text-danger-600',
          bgColor: 'bg-danger-100',
          icon: 'x',
        };
      default:
        return {
          text: 'Unknown',
          color: 'text-neutral-600',
          bgColor: 'bg-neutral-100',
          icon: 'help',
        };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className={className}>
      <CardBody>
        <div className="flex items-center mb-4">
          <Icon name="health" size={24} className="text-success-500 mr-3" />
          <h3 className="text-lg font-semibold text-neutral-900">
            システムヘルスチェック
          </h3>
        </div>

        <p className="text-neutral-600 mb-6">
          システムの稼働状況をリアルタイムで確認できます
        </p>

        {/* ヘルスチェック実行ボタン */}
        <div className="mb-6">
          <Button
            onClick={executeHealthCheck}
            loading={state.isLoading}
            className="w-full flex items-center justify-center space-x-2"
            data-testid="health-check-button"
          >
            <Icon name="health" size={18} className="text-white" />
            <span>
              {state.isLoading
                ? 'ヘルスチェック実行中...'
                : 'ヘルスチェック実行'}
            </span>
          </Button>
        </div>

        {/* 結果表示エリア */}
        {state.error && (
          <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-lg">
            <div className="flex items-center mb-2">
              <Icon name="x" size={20} className="text-danger-600 mr-2" />
              <span className="font-medium text-danger-800">
                エラーが発生しました
              </span>
            </div>
            <p className="text-danger-700 text-sm">{state.error}</p>
            <Button
              variant="danger"
              size="sm"
              onClick={executeHealthCheck}
              className="mt-3"
            >
              再試行
            </Button>
          </div>
        )}

        {state.result && (
          <div data-testid="health-result">
            {/* 全体ステータス */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-neutral-700">
                  全体ステータス:
                </span>
                <div className="flex items-center">
                  {(() => {
                    const statusDisplay = getStatusDisplay(state.result.status);
                    return (
                      <>
                        <div
                          className={`p-2 rounded-full ${statusDisplay.bgColor} mr-2`}
                        >
                          <Icon
                            name={
                              statusDisplay.icon as
                                | 'check'
                                | 'warning'
                                | 'x'
                                | 'help'
                            }
                            size={16}
                            className={statusDisplay.color}
                          />
                        </div>
                        <span
                          className={`font-semibold ${statusDisplay.color}`}
                        >
                          {statusDisplay.text}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="text-xs text-neutral-500">
                最終チェック: {formatTimestamp(state.result.timestamp)}
              </div>

              {state.result.traceId && (
                <div className="text-xs text-neutral-400 font-mono mt-1">
                  Trace ID: {state.result.traceId}
                </div>
              )}
            </div>

            {/* サービス詳細 */}
            {state.result.services && state.result.services.length > 0 && (
              <div>
                <h4 className="font-medium text-neutral-700 mb-3">
                  サービス詳細:
                </h4>
                <div className="space-y-2">
                  {state.result.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                    >
                      <div className="flex items-center">
                        <Icon
                          name={service.status === 'up' ? 'check' : 'x'}
                          size={16}
                          className={
                            service.status === 'up'
                              ? 'text-success-600 mr-2'
                              : 'text-danger-600 mr-2'
                          }
                        />
                        <span className="font-medium text-neutral-800">
                          {service.name}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {service.responseTime && (
                          <span className="text-xs text-neutral-500">
                            {service.responseTime}ms
                          </span>
                        )}
                        <span
                          className={`text-sm font-medium ${
                            service.status === 'up'
                              ? 'text-success-600'
                              : 'text-danger-600'
                          }`}
                        >
                          {service.status === 'up' ? 'UP' : 'DOWN'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 最終チェック時刻表示（結果がない場合） */}
        {!state.result && state.lastChecked && (
          <div className="text-xs text-neutral-500 text-center">
            最終実行: {state.lastChecked.toLocaleString('ja-JP')}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
