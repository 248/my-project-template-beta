/**
 * /api/health Route Handlerのテスト
 */

import { NextRequest } from 'next/server';
import { vi } from 'vitest';

import { GET } from '@/app/api/health/route';

// モック設定
vi.mock('@template/bff', () => {
  const mockHealthService = {
    checkHealth: vi.fn(),
  };
  
  return {
    HealthService: vi.fn().mockImplementation(() => mockHealthService),
    ApiClientAdapter: vi.fn().mockImplementation(() => ({
      getHealth: vi.fn(),
    })),
  };
});

vi.mock('@template/core', () => ({
  CoreHealthService: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@template/adapters', () => ({
  AdapterFactory: {
    createAdapters: vi.fn().mockReturnValue({
      logger: {
        withTraceId: vi.fn().mockReturnValue({
          info: vi.fn(),
          error: vi.fn(),
        }),
        info: vi.fn(),
        error: vi.fn(),
      },
      supabase: {},
      config: {},
    }),
  },
  generateTraceId: vi.fn().mockReturnValue('test-trace-id'),
  extractTraceIdFromHeaders: vi.fn().mockReturnValue('header-trace-id'),
  isMonolithMode: vi.fn().mockReturnValue(true),
  validateEnvConfig: vi.fn(),
}));

describe('/api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // パフォーマンス測定のモック
    global.performance = {
      now: vi.fn().mockReturnValue(100),
    } as any;
  });

  describe('GET', () => {
    it('正常なヘルスチェック結果を返すべき', async () => {
      // モックの設定
      const { HealthService } = await import('@template/bff');
      const mockInstance = new HealthService({} as any, {} as any);
      (mockInstance.checkHealth as any).mockResolvedValue({
        success: true,
        data: {
          status: 'healthy',
          timestamp: '2024-01-01T00:00:00.000Z',
          services: [
            {
              name: 'supabase',
              status: 'up',
              responseTime: 150,
            },
          ],
          traceId: 'header-trace-id',
        },
      });

      // リクエストの作成
      const request = new NextRequest('http://localhost:8787/api/health', {
        method: 'GET',
      });

      // APIを実行
      const response = await GET(request);
      const data = await response.json();

      // レスポンスの検証
      expect(response.status).toBe(200);
      expect(data).toEqual({
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00.000Z',
        services: [
          {
            name: 'supabase',
            status: 'up',
            responseTime: 150,
          },
        ],
        traceId: 'header-trace-id',
      });

      // ヘッダーの検証
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Trace-Id')).toBe('header-trace-id');
      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate'
      );
    });

    it('BFF層でエラーが発生した場合、適切なエラーレスポンスを返すべき', async () => {
      // モックの設定
      const { HealthService } = await import('@template/bff');
      const mockInstance = new HealthService({} as any, {} as any);
      (mockInstance.checkHealth as any).mockResolvedValue({
        success: false,
        error: {
          error: {
            code: 'HEALTH_CHECK_FAILED',
            message: 'Health check failed',
          },
          traceId: 'test-trace-id',
        },
        statusCode: 503,
      });

      // リクエストの作成
      const request = new NextRequest('http://localhost:8787/api/health', {
        method: 'GET',
      });

      // APIを実行
      const response = await GET(request);
      const data = await response.json();

      // レスポンスの検証
      expect(response.status).toBe(503);
      expect(data).toEqual({
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'Health check failed',
        },
        traceId: 'test-trace-id',
      });
    });

    it('予期しないエラーが発生した場合、500エラーを返すべき', async () => {
      // モックの設定
      const { HealthService } = await import('@template/bff');
      const mockInstance = new HealthService({} as any, {} as any);
      (mockInstance.checkHealth as any).mockRejectedValue(new Error('Unexpected error'));

      // リクエストの作成
      const request = new NextRequest('http://localhost:8787/api/health', {
        method: 'GET',
      });

      // APIを実行
      const response = await GET(request);
      const data = await response.json();

      // レスポンスの検証
      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(data.error.message).toBe('Internal server error occurred');
      expect(data.traceId).toBeDefined();
    });

    it('カスタムtraceIdがヘッダーに含まれている場合、それを使用すべき', async () => {
      // モックの設定
      const { HealthService } = await import('@template/bff');
      const mockInstance = new HealthService({} as any, {} as any);
      (mockInstance.checkHealth as any).mockResolvedValue({
        success: true,
        data: {
          status: 'healthy',
          timestamp: '2024-01-01T00:00:00.000Z',
          services: [],
          traceId: 'header-trace-id',
        },
      });

      // リクエストの作成（カスタムtraceIdヘッダー付き）
      const request = new NextRequest('http://localhost:8787/api/health', {
        method: 'GET',
        headers: {
          'X-Trace-Id': 'custom-trace-id',
        },
      });

      // APIを実行
      const response = await GET(request);

      // traceIdが正しく使用されているか確認
      expect(mockInstance.checkHealth).toHaveBeenCalledWith('header-trace-id');
    });
  });

  describe('その他のHTTPメソッド', () => {
    it('POSTリクエストに対して405エラーを返すべき', async () => {
      const { POST } = await import('@/app/api/health/route');
      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
      expect(data.error.message).toBe('Method not allowed');
    });

    it('PUTリクエストに対して405エラーを返すべき', async () => {
      const { PUT } = await import('@/app/api/health/route');
      const response = await PUT();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
    });

    it('DELETEリクエストに対して405エラーを返すべき', async () => {
      const { DELETE } = await import('@/app/api/health/route');
      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });
});
