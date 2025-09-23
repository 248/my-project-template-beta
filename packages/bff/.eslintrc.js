module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    // BFF層では上位層への依存を禁止
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['next', 'next/*'],
            message: 'BFF layer should not import Next.js modules',
          },
          {
            group: ['apps/web/**'],
            message: 'BFF layer should not import from web layer',
          },
        ],
      },
    ],
  },
};
