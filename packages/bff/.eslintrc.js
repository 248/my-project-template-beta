module.exports = {
  extends: ['../../.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-unused-vars': 'off', // Turn off base rule as it can report incorrect errors

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
