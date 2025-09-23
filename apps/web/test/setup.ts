/**
 * Vitestテストセットアップファイル
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Next.jsのモック
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// 環境変数のモック
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:8787';

// コンソールの警告を抑制（テスト中の不要なログを減らす）
const originalWarn = console.warn;
const originalError = console.error;

// eslint-disable-next-line no-undef
beforeAll(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
});

// eslint-disable-next-line no-undef
afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// グローバルなfetchのモック（必要に応じて）
global.fetch = vi.fn();

// ResizeObserverのモック（一部のUIコンポーネントで必要）
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// IntersectionObserverのモック
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
