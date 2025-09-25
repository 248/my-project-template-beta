#!/usr/bin/env node

/**
 * パフォーマンステストスクリプト
 * /api/health エンドポイントのp95レスポンス時間を測定
 * 目標: p95 < 300ms
 */

const { spawn } = require('child_process');
const { setTimeout } = require('timers/promises');

const autocannon = require('autocannon');

// 設定
const CONFIG = {
  // テスト対象URL
  url: 'http://localhost:3000/api/health',

  // テスト設定
  connections: 10, // 同時接続数
  duration: 30, // テスト時間（秒）
  pipelining: 1, // パイプライニング数

  // パフォーマンス目標
  p95Target: 300, // p95目標値（ミリ秒）

  // CI設定
  ciConnections: 5, // CI環境での同時接続数
  ciDuration: 15, // CI環境でのテスト時間（秒）
};

/**
 * 開発サーバーが起動しているかチェック
 */
async function checkServerHealth() {
  try {
    const response = await fetch(CONFIG.url);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * 開発サーバーを起動
 */
async function startDevServer() {
  console.log('🚀 開発サーバーを起動中...');

  const devProcess = spawn('pnpm', ['dev'], {
    stdio: 'pipe',
    shell: true,
  });

  // サーバー起動を待機
  let attempts = 0;
  const maxAttempts = 30; // 30秒待機

  while (attempts < maxAttempts) {
    await setTimeout(1000);

    if (await checkServerHealth()) {
      console.log('✅ 開発サーバーが起動しました');
      return devProcess;
    }

    attempts++;
    process.stdout.write('.');
  }

  console.log('\n❌ 開発サーバーの起動に失敗しました');
  devProcess.kill();
  throw new Error('Development server failed to start');
}

/**
 * パフォーマンステストを実行
 */
async function runPerformanceTest(isCI = false) {
  const testConfig = {
    url: CONFIG.url,
    connections: isCI ? CONFIG.ciConnections : CONFIG.connections,
    duration: isCI ? CONFIG.ciDuration : CONFIG.duration,
    pipelining: CONFIG.pipelining,
    headers: {
      'User-Agent': 'performance-test/1.0.0',
      Accept: 'application/json',
    },
  };

  console.log('📊 パフォーマンステストを開始...');
  console.log(`   URL: ${testConfig.url}`);
  console.log(`   接続数: ${testConfig.connections}`);
  console.log(`   時間: ${testConfig.duration}秒`);
  console.log(`   目標p95: ${CONFIG.p95Target}ms`);
  console.log('');

  return new Promise((resolve, reject) => {
    const instance = autocannon(testConfig, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });

    // プログレス表示
    autocannon.track(instance, {
      renderProgressBar: !isCI,
      renderResultsTable: false,
    });
  });
}

/**
 * テスト結果を分析
 */
function analyzeResults(result) {
  const stats = {
    totalRequests: result.requests.total,
    avgLatency: Math.round(result.latency.mean),
    p50: Math.round(result.latency.p50),
    p95: Math.round(result.latency.p95),
    p99: Math.round(result.latency.p99),
    maxLatency: Math.round(result.latency.max),
    throughput: Math.round(result.throughput.mean),
    errors: result.errors,
    timeouts: result.timeouts,
    duration: result.duration,
  };

  return stats;
}

/**
 * 結果を表示
 */
function displayResults(stats) {
  console.log('📈 パフォーマンステスト結果:');
  console.log('');
  console.log(`   総リクエスト数: ${stats.totalRequests.toLocaleString()}`);
  console.log(`   平均レスポンス時間: ${stats.avgLatency}ms`);
  console.log(`   p50 (中央値): ${stats.p50}ms`);
  console.log(`   p95: ${stats.p95}ms`);
  console.log(`   p99: ${stats.p99}ms`);
  console.log(`   最大レスポンス時間: ${stats.maxLatency}ms`);
  console.log(`   スループット: ${stats.throughput.toLocaleString()} req/sec`);
  console.log(`   エラー数: ${stats.errors}`);
  console.log(`   タイムアウト数: ${stats.timeouts}`);
  console.log(`   テスト時間: ${stats.duration}秒`);
  console.log('');

  // p95目標達成チェック
  const p95Passed = stats.p95 <= CONFIG.p95Target;
  const p95Status = p95Passed ? '✅' : '❌';

  console.log(
    `${p95Status} p95目標: ${stats.p95}ms <= ${CONFIG.p95Target}ms (${p95Passed ? 'PASS' : 'FAIL'})`
  );

  if (!p95Passed) {
    console.log('');
    console.log('⚠️  パフォーマンス改善の提案:');
    console.log('   - Supabase接続プールの最適化');
    console.log('   - レスポンスキャッシュの実装');
    console.log('   - 不要なログ出力の削減');
    console.log('   - データベースクエリの最適化');
  }

  return p95Passed;
}

/**
 * CI環境での結果出力
 */
function outputCIResults(stats, passed, isCI) {
  // GitHub Actions用の出力
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::set-output name=p95::${stats.p95}`);
    console.log(`::set-output name=throughput::${stats.throughput}`);
    console.log(`::set-output name=passed::${passed}`);

    if (!passed) {
      console.log(
        `::error::Performance test failed: p95 ${stats.p95}ms > ${CONFIG.p95Target}ms`
      );
    }
  }

  // JSON形式での結果出力
  const jsonResult = {
    timestamp: new Date().toISOString(),
    target: CONFIG.p95Target,
    results: stats,
    passed,
  };

  // CI環境では結果をファイルに保存
  if (isCI) {
    const fs = require('fs');
    fs.writeFileSync(
      'performance-results.json',
      JSON.stringify(jsonResult, null, 2)
    );
    console.log('');
    console.log(
      '✅ パフォーマンス結果をperformance-results.jsonに保存しました'
    );
  }

  console.log('');
  console.log('JSON結果:');
  console.log(JSON.stringify(jsonResult, null, 2));
}

/**
 * メイン処理
 */
async function main() {
  const isCI = process.argv.includes('--ci');
  let devProcess = null;
  let exitCode = 0;

  try {
    // サーバーが起動していない場合は起動
    if (!(await checkServerHealth())) {
      if (isCI) {
        console.log('❌ CI環境でサーバーが起動していません');
        process.exit(1);
      }
      devProcess = await startDevServer();
    } else {
      console.log('✅ サーバーは既に起動しています');
    }

    // パフォーマンステスト実行
    const result = await runPerformanceTest(isCI);
    const stats = analyzeResults(result);
    const passed = displayResults(stats);

    if (isCI) {
      outputCIResults(stats, passed, isCI);
    }

    if (!passed) {
      exitCode = 1;
    }
  } catch (error) {
    console.error(
      '❌ パフォーマンステストでエラーが発生しました:',
      error.message
    );
    exitCode = 1;
  } finally {
    // 開発サーバーを停止
    if (devProcess) {
      console.log('');
      console.log('🛑 開発サーバーを停止中...');
      devProcess.kill();

      // プロセス終了を待機
      await setTimeout(2000);
    }
  }

  process.exit(exitCode);
}

// スクリプト実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 予期しないエラー:', error);
    process.exit(1);
  });
}

module.exports = {
  runPerformanceTest,
  analyzeResults,
  CONFIG,
};
