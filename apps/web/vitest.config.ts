/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    css: false, // CSSファイルの処理を無効化（テスト高速化）
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@template/bff': path.resolve(__dirname, '../../packages/bff/src'),
      '@template/core': path.resolve(__dirname, '../../packages/core/src'),
      '@template/adapters': path.resolve(
        __dirname,
        '../../packages/adapters/src'
      ),
      '@template/generated': path.resolve(
        __dirname,
        '../../packages/generated/src'
      ),
    },
  },
});
