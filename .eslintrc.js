module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'prettier'],

  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['import', 'prettier', 'boundaries'],
  rules: {
    // Prettier統合
    'prettier/prettier': 'error',

    // Import整形
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',

    // 基本的なJavaScript/TypeScriptルール
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    // 依存方向チェック（boundaries）
    'boundaries/element-types': [
      'error',
      {
        default: 'disallow',
        rules: [
          {
            from: 'web',
            allow: ['bff', 'generated', 'adapters'],
          },
          {
            from: 'bff',
            allow: ['core', 'generated', 'adapters'],
          },
          {
            from: 'core',
            allow: ['adapters'],
          },
          {
            from: 'adapters',
            allow: [],
          },
          {
            from: 'generated',
            allow: [],
          },
        ],
      },
    ],

    // 制限されたimportのチェック
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['next', 'next/*'],
            message: 'Next.js imports are only allowed in apps/web layer',
          },
          {
            group: ['@supabase/*'],
            message: 'Supabase imports should go through adapters layer',
          },
        ],
      },
    ],
  },
  settings: {
    'boundaries/elements': [
      {
        type: 'web',
        pattern: 'apps/web/**',
      },
      {
        type: 'bff',
        pattern: 'packages/bff/**',
      },
      {
        type: 'core',
        pattern: 'packages/core/**',
      },
      {
        type: 'adapters',
        pattern: 'packages/adapters/**',
      },
      {
        type: 'generated',
        pattern: 'packages/generated/**',
      },
    ],
    'boundaries/ignore': [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.config.js',
      '**/*.config.ts',
    ],
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      env: {
        jest: true,
      },
      rules: {
        'no-unused-vars': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '.next/',
    'packages/generated/',
    '*.config.js',
    '*.config.ts',
  ],
};
