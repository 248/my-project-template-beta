module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    // Adapter層では他の内部パッケージへの依存を禁止
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              'apps/web/**',
              'packages/bff/**',
              'packages/core/**',
              'packages/generated/**',
            ],
            message:
              'Adapter layer should not import from other internal packages',
          },
        ],
      },
    ],
  },
};
