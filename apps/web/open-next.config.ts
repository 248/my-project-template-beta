// OpenNext設定ファイル
const config = {
  default: {
    // Cloudflare Workers用の設定
    override: {
      wrapper: 'cloudflare',
      converter: 'edge',
      // 静的ファイルの処理
      generateDockerfile: false,
    },
  },
  // 関数の設定
  functions: {
    // API Routes用の設定
    api: {
      patterns: ['api/**'],
      runtime: 'edge',
    },
  },
  // 静的ファイルの設定
  buildCommand: 'npm run build',
  // 環境変数の設定
  env: {
    BACKEND_MODE: process.env.BACKEND_MODE || 'monolith',
  },
};

export default config;
