module.exports = {
  extends: ['../../.eslintrc.js'],
  rules: {
    // Generated層では他の内部パッケージへの依存を禁止
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['apps/web/**', 'packages/bff/**', 'packages/core/**', 'packages/adapters/**'],
            message: 'Generated layer should not import from other internal packages',
          },
        ],
      },
    ],
    
    // 生成ファイルなので一部のルールを緩和
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
  },
};