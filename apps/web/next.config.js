/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // OpenNext用の設定
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/**/*'],
    },
  },
  // Cloudflare Workers用の設定
  output: 'standalone',
  // 静的ファイルの最適化
  images: {
    unoptimized: true,
  },
  // トレーリングスラッシュの設定
  trailingSlash: false,
  // 環境変数の設定
  env: {
    BACKEND_MODE: process.env.BACKEND_MODE || 'monolith',
  },
};

module.exports = nextConfig;
