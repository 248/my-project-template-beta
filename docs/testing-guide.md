# テストガイド

## 概要

このドキュメントでは、プロジェクトで使用するテスト戦略、テストの種類、実装方法について説明します。

## テスト戦略

### テストピラミッド

```
        /\
       /  \
      / E2E \     少数・高価値・遅い
     /______\
    /        \
   / 統合テスト \   中程度・中価値・中速
  /____________\
 /              \
/   単体テスト    \  多数・高速・安価
/________________\
```

### テストの種類と目的

| テスト種別           | 目的                  | 実行頻度       | 実行時間 |
| -------------------- | --------------------- | -------------- | -------- |
| 単体テスト           | 個別機能の動作確認    | 毎回           | 高速     |
| 統合テスト           | モジュール間連携確認  | 毎回           | 中速     |
| 契約テスト           | API仕様との整合性確認 | 毎回           | 高速     |
| E2Eテスト            | ユーザーフロー確認    | PR・デプロイ時 | 低速     |
| パフォーマンステスト | 性能要件確認          | 定期実行       | 中速     |

## 単体テスト

### Core層のテスト

```typescript
// packages/core/__tests__/services/health-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoreHealthService } from '../src/services/health-service';
import type { SupabaseAdapter, Logger } from '@adapters/types';

describe('CoreHealthService', () => {
  let healthService: CoreHealthService;
  let mockSupabaseAdapter: SupabaseAdapter;
  let mockLogger: Logger;

  beforeEach(() => {
    mockSupabaseAdapter = {
      checkConnection: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    };

    healthService = new CoreHealthService({
      supabase: mockSupabaseAdapter,
      logger: mockLogger,
    });
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all services are up', async () => {
      // Arrange
      mockSupabaseAdapter.checkConnection.mockResolvedValue(true);

      // Act
      const result = await healthService.performHealthCheck();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.services).toHaveLength(1);
      expect(result.services[0]).toMatchObject({
        name: 'supabase',
        status: 'up',
      });
    });

    it('should return degraded status when some services are down', async () => {
      // Arrange
      mockSupabaseAdapter.checkConnection.mockResolvedValue(false);

      // Act
      const result = await healthService.performHealthCheck();

      // Assert
      expect(result.status).toBe('degraded');
      expect(result.services[0]).toMatchObject({
        name: 'supabase',
        status: 'down',
      });
    });

    it('should handle connection errors gracefully', async () => {
      // Arrange
      const error = new Error('Connection timeout');
      mockSupabaseAdapter.checkConnection.mockRejectedValue(error);

      // Act
      const result = await healthService.performHealthCheck();

      // Assert
      expect(result.status).toBe('degraded');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error }),
        'Supabase health check failed'
      );
    });
  });
});
```

### BFF層のテスト

```typescript
// packages/bff/__tests__/services/health-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../src/services/health-service';
import type { CoreHealthService } from '@core/services';
import type { Logger } from '@adapters/types';

describe('HealthService', () => {
  let healthService: HealthService;
  let mockCoreHealthService: CoreHealthService;
  let mockLogger: Logger;

  beforeEach(() => {
    mockCoreHealthService = {
      performHealthCheck: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    healthService = new HealthService(mockCoreHealthService, mockLogger);
  });

  describe('checkHealth', () => {
    it('should return formatted health response', async () => {
      // Arrange
      const coreResult = {
        status: 'healthy' as const,
        timestamp: new Date('2024-01-01T00:00:00Z'),
        services: [
          { name: 'supabase', status: 'up' as const, responseTime: 150 },
        ],
      };
      mockCoreHealthService.performHealthCheck.mockResolvedValue(coreResult);

      // Act
      const result = await healthService.checkHealth();

      // Assert
      expect(result).toMatchObject({
        status: 'healthy',
        timestamp: '2024-01-01T00:00:00.000Z',
        services: [{ name: 'supabase', status: 'up', responseTime: 150 }],
        traceId: expect.any(String),
      });
    });

    it('should log health check execution', async () => {
      // Arrange
      const coreResult = {
        status: 'healthy' as const,
        timestamp: new Date(),
        services: [],
      };
      mockCoreHealthService.performHealthCheck.mockResolvedValue(coreResult);

      // Act
      await healthService.checkHealth();

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: expect.any(String) }),
        'Health check started'
      );
    });
  });
});
```

### Adapter層のテスト

```typescript
// packages/adapters/__tests__/supabase/supabase-adapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseAdapter } from '../src/supabase/supabase-adapter';

// Supabaseクライアントのモック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          then: vi.fn(),
        })),
      })),
    })),
  })),
}));

describe('SupabaseAdapter', () => {
  let adapter: SupabaseAdapter;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    };

    adapter = new SupabaseAdapter({
      url: 'https://test.supabase.co',
      anonKey: 'test-key',
      serviceRoleKey: 'test-service-key',
    });

    // プライベートプロパティのモック
    (adapter as any).client = mockSupabaseClient;
  });

  describe('checkConnection', () => {
    it('should return true when connection is successful', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      // Act
      const result = await adapter.checkConnection();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue({ error: new Error('Connection failed') }),
        }),
      });

      // Act
      const result = await adapter.checkConnection();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      // Arrange
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Act
      const result = await adapter.checkConnection();

      // Assert
      expect(result).toBe(false);
    });
  });
});
```

## 統合テスト

### API統合テスト

```typescript
// apps/web/__tests__/integration/health-api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/health/route';

describe('Health API Integration', () => {
  describe('GET /api/health', () => {
    it('should return health status with valid schema', async () => {
      // Act
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        timestamp: expect.any(String),
        services: expect.any(Array),
        traceId: expect.any(String),
      });

      // サービス配列の検証
      data.services.forEach((service: any) => {
        expect(service).toMatchObject({
          name: expect.any(String),
          status: expect.stringMatching(/^(up|down)$/),
        });
      });
    });

    it('should include trace ID in response', async () => {
      // Act
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.traceId).toMatch(/^trace-[a-f0-9-]+$/);
    });

    it('should complete within performance target', async () => {
      // Act
      const startTime = Date.now();
      const request = new NextRequest('http://localhost:3000/api/health');
      await GET(request);
      const duration = Date.now() - startTime;

      // Assert - p95 < 300ms target
      expect(duration).toBeLessThan(300);
    });
  });
});
```

### 認証統合テスト

```typescript
// apps/web/__tests__/integration/auth-flow.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as loginPost } from '../../app/auth/login/route';
import { GET as callbackGet } from '../../app/auth/callback/route';

describe('Authentication Flow Integration', () => {
  describe('OAuth Flow', () => {
    it('should handle complete OAuth flow', async () => {
      // 1. Login request
      const loginRequest = new NextRequest(
        'http://localhost:3000/auth/login?provider=google'
      );
      const loginResponse = await loginPost(loginRequest);
      const loginData = await loginResponse.json();

      expect(loginResponse.status).toBe(200);
      expect(loginData).toMatchObject({
        data: {
          url: expect.stringContaining('oauth'),
        },
        traceId: expect.any(String),
      });

      // 2. Callback handling (mocked)
      const callbackRequest = new NextRequest(
        'http://localhost:3000/auth/callback?code=test-code&state=test-state'
      );
      const callbackResponse = await callbackGet(callbackRequest);

      expect([200, 302]).toContain(callbackResponse.status);
    });
  });
});
```

## 契約テスト

### OpenAPI契約テスト

```typescript
// apps/web/__tests__/contract/openapi-contract.test.ts
import { describe, it, expect } from 'vitest';
import { HealthResponseSchema } from '@bff/schemas';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/health/route';

describe('OpenAPI Contract Tests', () => {
  describe('/api/health', () => {
    it('should conform to OpenAPI schema', async () => {
      // Act
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);
      const data = await response.json();

      // Assert - Zodスキーマでの検証
      expect(() => HealthResponseSchema.parse(data)).not.toThrow();
    });

    it('should return correct content type', async () => {
      // Act
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      // Assert
      expect(response.headers.get('content-type')).toContain(
        'application/json'
      );
    });
  });
});
```

## E2Eテスト

### 認証フローE2E

```typescript
// apps/web/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should complete full authentication flow', async ({ page }) => {
    // 1. トップページにアクセス
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Template Beta');

    // 2. ログインボタンをクリック
    await page.click('[data-testid="login-button"]');

    // 3. OAuth認証（モック環境では自動的に成功）
    await page.waitForURL('/home');

    // 4. ホームページの確認
    await expect(page.locator('h1')).toContainText('ホーム');
    await expect(page.locator('[data-testid="user-info"]')).toBeVisible();

    // 5. ヘルスチェック機能のテスト
    await page.click('[data-testid="health-check-button"]');
    await page.waitForSelector('[data-testid="health-result"]');

    const healthResult = await page.textContent(
      '[data-testid="health-result"]'
    );
    expect(healthResult).toMatch(/healthy|degraded|unhealthy/);

    // 6. ログアウト
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('/');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    // OAuth拒否のシミュレーション
    await page.goto('/auth/callback?error=access_denied');

    // エラーページまたはトップページにリダイレクト
    await expect(page.url()).toMatch(/(\/|\/error)/);
  });
});
```

### ヘルスチェックE2E

```typescript
// apps/web/e2e/health-check.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Health Check', () => {
  test('should display health status on SSR page', async ({ page }) => {
    await page.goto('/health');

    // ヘルスチェック結果の表示確認
    await expect(page.locator('[data-testid="health-status"]')).toBeVisible();

    const status = await page.textContent('[data-testid="health-status"]');
    expect(status).toMatch(/healthy|degraded|unhealthy/);

    // サービス詳細の表示確認
    await expect(page.locator('[data-testid="service-list"]')).toBeVisible();
  });

  test('should handle API health check from home page', async ({
    page,
    context,
  }) => {
    // 認証状態をモック
    await context.addCookies([
      {
        name: 'sb-access-token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/home');

    // ヘルスチェックボタンをクリック
    await page.click('[data-testid="health-check-button"]');

    // Loading状態の確認
    await expect(page.locator('[data-testid="health-loading"]')).toBeVisible();

    // 結果の表示確認
    await page.waitForSelector('[data-testid="health-result"]');
    await expect(
      page.locator('[data-testid="health-loading"]')
    ).not.toBeVisible();

    const result = await page.textContent('[data-testid="health-result"]');
    expect(result).toMatch(/healthy|degraded|unhealthy/);
  });
});
```

## パフォーマンステスト

### API パフォーマンステスト

```typescript
// apps/web/__tests__/performance/health-performance.test.ts
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../../app/api/health/route';

describe('Health API Performance', () => {
  it('should meet p95 response time target', async () => {
    const measurements: number[] = [];
    const iterations = 100;

    // 100回実行して測定
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      const request = new NextRequest('http://localhost:3000/api/health');
      await GET(request);

      const duration = performance.now() - startTime;
      measurements.push(duration);
    }

    // p95の計算
    measurements.sort((a, b) => a - b);
    const p95Index = Math.floor(measurements.length * 0.95);
    const p95 = measurements[p95Index];

    // p95 < 300ms の目標
    expect(p95).toBeLessThan(300);

    console.log(`Performance metrics:
      Min: ${Math.min(...measurements).toFixed(2)}ms
      Max: ${Math.max(...measurements).toFixed(2)}ms
      Avg: ${(measurements.reduce((a, b) => a + b) / measurements.length).toFixed(2)}ms
      p95: ${p95.toFixed(2)}ms
    `);
  });
});
```

## テスト実行

### ローカル実行

```bash
# 全テスト実行
pnpm test

# 単体テストのみ
pnpm test --run packages/

# 統合テストのみ
pnpm test --run apps/web/__tests__/integration/

# E2Eテスト
pnpm test:e2e

# パフォーマンステスト
pnpm test:perf

# カバレッジ付きテスト
pnpm test --coverage

# ウォッチモード
pnpm test --watch
```

### CI/CD実行

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        backend-mode: [monolith, service]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm generate
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test --run
        env:
          BACKEND_MODE: ${{ matrix.backend-mode }}

      - run: pnpm build
      - run: pnpm test:e2e
        env:
          BACKEND_MODE: ${{ matrix.backend-mode }}
```

## テストのベストプラクティス

### 1. テスト構造

```typescript
describe('Component/Function Name', () => {
  // セットアップ
  beforeEach(() => {
    // 共通セットアップ
  });

  describe('specific method/scenario', () => {
    it('should do something when condition', async () => {
      // Arrange - テストデータの準備
      const input = {
        /* test data */
      };

      // Act - テスト対象の実行
      const result = await targetFunction(input);

      // Assert - 結果の検証
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

### 2. モックの使用

```typescript
// 外部依存のモック
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockClient),
}));

// 部分的なモック
vi.mock('../src/utils/logger', async () => {
  const actual = await vi.importActual('../src/utils/logger');
  return {
    ...actual,
    logger: mockLogger,
  };
});
```

### 3. テストデータ管理

```typescript
// テストデータファクトリー
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

// 使用例
const user = createMockUser({ name: 'Custom Name' });
```

### 4. 非同期テスト

```typescript
// Promise のテスト
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// エラーのテスト
it('should throw error for invalid input', async () => {
  await expect(asyncFunction('invalid')).rejects.toThrow('Invalid input');
});
```

## トラブルシューティング

### よくある問題

1. **テストが不安定**: モックの状態管理を確認
2. **E2Eテストが失敗**: 環境変数とサーバー起動を確認
3. **パフォーマンステストが遅い**: 並列実行数を調整
4. **カバレッジが低い**: 未テストのパスを特定

### デバッグ方法

```bash
# 詳細ログ付きテスト実行
pnpm test --reporter=verbose

# 特定のテストファイルのみ実行
pnpm test health-service.test.ts

# デバッグモードでテスト実行
pnpm test --inspect-brk
```

## 参考リンク

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
