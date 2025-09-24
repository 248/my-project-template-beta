/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    css: false, // CSSファイルの処理を無効化（テスト高速化）
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**', // E2Eテストを除外
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
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
      '@generated': path.resolve(__dirname, '../../packages/generated/src'),
    },
  },
});
