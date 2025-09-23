import React from 'react';

interface StatusBadgeProps {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'up' | 'down';
  children?: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return 'status-healthy';
      case 'degraded':
        return 'status-degraded';
      case 'unhealthy':
      case 'down':
        return 'status-unhealthy';
      default:
        return 'status-degraded';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return '正常';
      case 'degraded':
        return '劣化';
      case 'unhealthy':
        return '異常';
      case 'up':
        return '稼働中';
      case 'down':
        return '停止中';
      default:
        return '不明';
    }
  };

  return (
    <span className={getStatusClasses(status)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {children || getStatusText(status)}
    </span>
  );
}
