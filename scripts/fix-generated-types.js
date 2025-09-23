#!/usr/bin/env node

/**
 * 生成されたAPIクライアントファイルの型安全性を修正するスクリプト
 * orvalで生成されたファイルに型アサーションを追加する
 */

const fs = require('fs');
const path = require('path');

const CLIENT_FILE_PATH = path.join(
  __dirname,
  '../packages/generated/src/client.ts'
);

function fixGeneratedTypes() {
  if (!fs.existsSync(CLIENT_FILE_PATH)) {
    console.log('Generated client file not found, skipping type fixes');
    return;
  }

  let content = fs.readFileSync(CLIENT_FILE_PATH, 'utf8');

  // 型アサーションを追加（HealthResponseの場合）
  content = content.replace(
    /const data = await res\.json\(\)/g,
    'const data = await res.json() as HealthResponse'
  );

  // 他のレスポンス型についても同様の処理を追加可能
  // 将来的に他のAPIエンドポイントが追加された場合の拡張ポイント

  fs.writeFileSync(CLIENT_FILE_PATH, content, 'utf8');
  console.log('✅ Generated types fixed successfully');
}

if (require.main === module) {
  fixGeneratedTypes();
}

module.exports = { fixGeneratedTypes };
