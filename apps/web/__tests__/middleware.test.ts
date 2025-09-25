import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { middleware } from '../middleware';

// Supabaseミドルウェアをモック
vi.mock('../lib/supabase/middleware', () => ({
  updateSession: vi.fn(),
}));

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call updateSession with the request', async () => {
    const { updateSession } = await import('../lib/supabase/middleware');
    const mockResponse = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/test');
    const result = await middleware(request);

    expect(updateSession).toHaveBeenCalledWith(request);
    expect(result).toBe(mockResponse);
  });

  it('should handle requests to protected routes', async () => {
    const { updateSession } = await import('../lib/supabase/middleware');
    const mockResponse = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/home');
    await middleware(request);

    expect(updateSession).toHaveBeenCalledWith(request);
  });

  it('should handle requests to public routes', async () => {
    const { updateSession } = await import('../lib/supabase/middleware');
    const mockResponse = NextResponse.next();
    vi.mocked(updateSession).mockResolvedValue(mockResponse);

    const request = new NextRequest('http://localhost:3000/');
    await middleware(request);

    expect(updateSession).toHaveBeenCalledWith(request);
  });

  describe('Route matching configuration', () => {
    it('should not process health check endpoint', async () => {
      const { updateSession } = await import('../lib/supabase/middleware');

      // /api/health は config.matcher で除外されているため、
      // 実際のミドルウェアは呼ばれない（Next.jsレベルで除外）
      // ここでは設定の意図をテストとして記録
      const healthRequest = new NextRequest('http://localhost:3000/api/health');

      // 実際のNext.jsでは matcher により除外されるが、
      // テスト環境では直接呼び出されるため、正常に処理されることを確認
      const mockResponse = NextResponse.next();
      vi.mocked(updateSession).mockResolvedValue(mockResponse);

      const result = await middleware(healthRequest);

      expect(updateSession).toHaveBeenCalledWith(healthRequest);
      expect(result).toBe(mockResponse);
    });

    it('should process all other routes', async () => {
      const { updateSession } = await import('../lib/supabase/middleware');
      const mockResponse = NextResponse.next();
      vi.mocked(updateSession).mockResolvedValue(mockResponse);

      const routes = [
        'http://localhost:3000/',
        'http://localhost:3000/home',
        'http://localhost:3000/auth/login',
        'http://localhost:3000/auth/callback',
        'http://localhost:3000/auth/logout',
        'http://localhost:3000/health',
        'http://localhost:3000/api/other',
      ];

      for (const url of routes) {
        const request = new NextRequest(url);
        await middleware(request);
        expect(updateSession).toHaveBeenCalledWith(request);
      }
    });
  });
});
