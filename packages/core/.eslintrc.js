module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['prettier'],
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    // Prettier統合
    'prettier/prettier': 'error',

    // 基本的なルール
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // Core層では外部I/Oライブラリの直接利用を禁止
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['next', 'next/*'],
            message: 'Core layer should not import Next.js modules',
          },
          {
            group: ['@supabase/*'],
            message:
              'Core layer should not directly import Supabase. Use adapters instead.',
          },
          {
            group: ['node:http', 'node:https', 'fetch', 'axios', 'got'],
            message:
              'Core layer should not directly make HTTP requests. Use adapters instead.',
          },
          {
            group: ['packages/bff/**', 'packages/generated/**', 'apps/web/**'],
            message: 'Core layer should not import from upper layers',
          },
        ],
      },
    ],
  },
  env: {
    node: true,
    es2022: true,
  },
};
