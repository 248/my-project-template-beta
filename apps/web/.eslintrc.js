module.exports = {
  extends: ['../../.eslintrc.js', 'next/core-web-vitals'],
  rules: {
    // Next.js特有のルール
    '@next/next/no-html-link-for-pages': 'off',

    // Web層では外部ライブラリの直接利用を許可
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['packages/core/**'],
            message:
              'Web layer should not directly import from core layer. Use BFF layer instead.',
          },
        ],
      },
    ],
  },
};
