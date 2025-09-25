module.exports = {
  // TypeScript/JavaScript ファイル
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],

  // JSON, YAML, Markdown ファイル
  '*.{json,yaml,yml,md}': ['prettier --write'],

  // CSS, SCSS ファイル
  '*.{css,scss}': ['prettier --write'],

  // OpenAPI 仕様ファイル
  'openapi/**/*.{yaml,yml}': ['redocly lint'],

  // 型チェック（変更されたTypeScriptファイルがある場合）
  '*.{ts,tsx}': () => ['pnpm type-check'],
};
