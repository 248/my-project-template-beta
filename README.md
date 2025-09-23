# Template Beta: Cloudflare + Supabase

Next.js（App Router）+ OpenNext + Cloudflare Workers + Supabase を使用したWebアプリケーション開発テンプレート

## 概要

このテンプレートは、モダンなWebアプリケーション開発のためのベストプラクティスを実装したプロジェクト構成です。

### 主要技術スタック

- **フロントエンド**: Next.js 14 (App Router)
- **デプロイ**: OpenNext + Cloudflare Workers
- **バックエンド**: Supabase (Auth + PostgreSQL + Storage)
- **API**: OpenAPI契約駆動開発
- **型安全性**: TypeScript + Zod
- **モノレポ**: pnpm workspaces

## プロジェクト構成

```
├── apps/
│   └── web/                 # Next.js アプリケーション（UI層）
├── packages/
│   ├── core/               # ドメインロジック・ユースケース層
│   ├── bff/                # BFF（Backend for Frontend）層
│   ├── adapters/           # 外部依存アダプター層
│   └── generated/          # OpenAPIから生成される型・クライアント
├── openapi/                # OpenAPI契約定義
└── docs/                   # ドキュメント
```

## 開発環境セットアップ

### 前提条件

- Node.js 22
- pnpm 9.0.0以上

### セットアップ手順

1. 依存関係のインストール

```bash
pnpm install
```

2. 環境変数の設定

```bash
cp .dev.vars.example .dev.vars
# .dev.varsファイルを編集して必要な環境変数を設定
```

3. 開発サーバーの起動

```bash
pnpm dev
```

## 利用可能なコマンド

### 開発

- `pnpm dev` - 開発サーバー起動（wrangler dev + OpenAPI生成チェック）
- `pnpm build` - 本番ビルド
- `pnpm generate` - OpenAPIから型・クライアント生成
- `pnpm generate:check` - 生成物の同期チェック

### 品質管理

- `pnpm lint` - 全パッケージのLint実行
- `pnpm lint:fix` - Lint自動修正
- `pnpm test` - 全パッケージのテスト実行
- `pnpm test:e2e` - E2Eテスト実行
- `pnpm type-check` - 型チェック

### ユーティリティ

- `pnpm clean` - ビルド成果物の削除

## 開発フロー

1. **要件定義**: `.kiro/specs/`で要件・設計・タスクを管理
2. **契約定義**: `openapi/`でAPI契約を定義
3. **型生成**: `pnpm generate`で型安全なクライアント生成
4. **実装**: 層分離に従った実装
5. **テスト**: 単体・統合・E2Eテストの実装
6. **デプロイ**: GitHub ActionsによるCI/CD

## 層分離ルール

### 依存方向

```
UI層（apps/web） → BFF層 → Core層
                    ↓
                Adapter層
```

### 禁止事項

- UI層からCore層の直接呼び出し
- Core層からNext.jsやfetch等のimport
- Route Handlers内のビジネスロジック記述

## 環境変数管理

### 優先順位

1. CI環境変数
2. wrangler secret
3. .dev.vars（ローカル開発用）
4. process.env

### モード切替

- `BACKEND_MODE=monolith`: 同一Worker内でBFF呼び出し
- `BACKEND_MODE=service`: 外部サービス呼び出し

## ライセンス

MIT
