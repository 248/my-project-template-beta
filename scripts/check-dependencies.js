#!/usr/bin/env node

/**
 * 依存方向チェックスクリプト
 * 層違反を検出してCIで失敗させる
 */

const { execSync } = require('child_process');

/**
 * 依存方向の定義（参考）:
 * apps/web → packages/{bff,generated,adapters}
 * packages/bff → packages/{core,generated,adapters}
 * packages/core → packages/adapters
 * packages/adapters → (外部ライブラリのみ)
 * packages/generated → (外部ライブラリのみ)
 */

function checkDependencies() {
  console.log('🔍 依存方向チェックを実行中...');

  let hasViolations = false;

  try {
    // ESLintで依存方向チェックを実行
    execSync('pnpm lint', { stdio: 'inherit' });
    console.log('✅ ESLintによる依存方向チェック: 合格');
  } catch (error) {
    console.error('❌ ESLintによる依存方向チェック: 失敗');
    hasViolations = true;
  }

  try {
    // TypeScriptコンパイラで型チェックを実行
    execSync('pnpm type-check', { stdio: 'inherit' });
    console.log('✅ TypeScriptによる型チェック: 合格');
  } catch (error) {
    console.error('❌ TypeScriptによる型チェック: 失敗');
    hasViolations = true;
  }

  if (hasViolations) {
    console.error('\n❌ 依存方向違反が検出されました。');
    console.error('以下の層構造ルールを確認してください:');
    console.error('');
    console.error('apps/web → packages/{bff,generated,adapters}');
    console.error('packages/bff → packages/{core,generated,adapters}');
    console.error('packages/core → packages/adapters');
    console.error('packages/adapters → (外部ライブラリのみ)');
    console.error('packages/generated → (外部ライブラリのみ)');
    console.error('');
    process.exit(1);
  }

  console.log('\n✅ すべての依存方向チェックが合格しました！');
}

if (require.main === module) {
  checkDependencies();
}

module.exports = { checkDependencies };
