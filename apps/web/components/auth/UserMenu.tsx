'use client';

import React, { useState } from 'react';

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

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
      });

      if (response.ok) {
        // ログアウト成功時はページをリロードして状態を更新
        window.location.reload();
      } else {
        throw new Error('ログアウトに失敗しました');
      }
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
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
          onClick={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? 'ログアウト中...' : 'ログアウト'}
        </Button>
      </div>
    </div>
  );
}
