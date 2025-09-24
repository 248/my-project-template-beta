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
});
