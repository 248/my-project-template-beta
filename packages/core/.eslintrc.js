module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
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
};
