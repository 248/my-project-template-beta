# 実装計画

- [x] 1. プロジェクト基盤とモノレポ構成の設定
  - pnpm ワークスペース構成でモノレポを初期化
  - 層分離に基づくディレクトリ構造を作成（apps/web, packages/{core,bff,adapters,generated}）
  - Node 22 固定、基本的な package.json 設定
  - タスク共通テンプレート配布（DoR: 仕様リンク・受入観点・ENV 準備、DoD: テスト・Lint・CI 緑・ドキュメント更新・traceId 確認）
  - _要件: 1.3, 1.4_

- [x] 2. 開発環境とコード品質ツールの設定
  - .gitattributes で LF 改行コード強制設定
  - ESLint + Prettier + import 整形の設定
  - lint-staged + pre-commit フックの設定
  - 依存方向リンターで層違反検出の設定
  - _要件: 1.4_

- [x] 3. OpenAPI 契約定義とコード生成の基盤構築
  - openapi/openapi.yaml でヘルスチェック API の契約定義
  - openapi-typescript による TypeScript 型生成設定
  - orval による API クライアント生成設定
  - @redocly/cli による Lint と Breaking Change 検知設定
  - 生成コマンドと package.json スクリプトの設定
  - .eslintignore で生成ファイルを除外設定
  - **注意: orval の型アサーション問題により、現在 pre-commit フックは一時的に無効化**
  - _要件: 6.1, 6.2, 6.3_

- [x] 4. Core 層のヘルスチェックドメインロジック実装
  - HealthStatus, ServiceHealth ドメインモデルの定義
  - CoreHealthService クラスの実装
  - Supabase 接続チェックロジックの実装
  - 全体ステータス判定ロジックの実装
  - _要件: 2.1, 2.2, 2.3_

- [x] 5. Adapter 層の基盤実装
  - SupabaseAdapter クラスの実装（接続チェック機能）
  - LoggerAdapter クラスの実装（pino 設定、redact 機能）
  - child logger で traceId を bindings 固定、全 HTTP レスポンスに traceId を含める仕組み
  - 環境変数による設定管理の実装
  - DEFAULT_TIMEOUT_MS と RETRY_POLICY（指数バックオフ+ジッタ、最大 2 回）の設定
  - _要件: 2.3_

- [x] 6. BFF 層のヘルスチェックサービス実装
  - HealthService クラスの実装
  - Core 層との連携と API 応答形式への変換
  - Zod バリデーションスキーマの実装
  - BFF 統一エラー封筒形式の確定と実装（{ error: { code, message, details? }, traceId }）
  - エラーハンドリングとログ出力の実装
  - _要件: 2.1, 2.2, 8.1_

- [x] 7. Next.js 基盤と OpenNext 設定
  - Next.js App Router プロジェクトの初期化
  - OpenNext 設定ファイルの作成
  - Tailwind CSS 設定と Atlassian Design 参考のベーススタイル
  - 基本的なレイアウトコンポーネントの作成
  - _要件: 1.1, 1.2_

- [x] 8. ヘルスチェック Route Handlers の実装
  - /api/health/route.ts の実装
  - BFF 層との連携と OpenAPI 契約準拠
  - Zod バリデーションによる入出力検証
  - エラーハンドリングと HTTP ステータス管理
  - _要件: 2.2, 6.5, 8.1_

- [x] 8.1. 基本エラーハンドリングとパフォーマンス監視（軽量版）
  - ErrorBoundary コンポーネントの基本実装
  - /api/health の初期パフォーマンス測定（p95 < 300ms 目標）
  - 基本的なエラー状態表示の実装
  - _要件: 5.3, 非機能要件（性能）_

- [x] 9. SSR ヘルスチェックページの実装
  - /health/page.tsx の実装
  - サーバーサイドでのヘルスチェック実行
  - ヘルスチェック結果の表示 UI
  - エラー状態の適切な表示
  - **発見した問題**:
    - BFF層のhealth-serviceモジュールが見つからないエラー（テスト実行時）
    - ErrorBoundaryコンポーネントのリセット機能が正常に動作しない（テスト失敗）
    - 既存テストの一部が失敗状態（6件のテスト失敗）
  - **先送り問題**: テスト修正は後続のテストフェーズ（タスク12）で対応
  - _要件: 2.1_

- [x] 10. Cloudflare Workers 設定とローカル開発環境
  - wrangler.toml の設定
  - .dev.vars でローカル環境変数管理と .dev.vars.example の配布
  - BACKEND_MODE 環境変数による切替機能（service モードで/api/health のみ外部呼び先接続の最小疎通含む）
  - ENV 優先順位の明文化（CI→wrangler secret→.dev.vars→process.env）
  - pnpm dev コマンドで wrangler dev + OpenAPI 生成チェック
  - _要件: 1.1, 9.1, 9.2_

- [x] 10.1. orval 型問題の解決と pre-commit フック有効化
  - orval の customFetch mutator 設定を修正して型安全性を確保
  - 生成されたクライアントの型アサーション問題を暫定回避（詳細は Task26 の恒久対応を参照）
  - .husky/pre-commit で generate:check を再有効化
  - lint-staged の全チェック（ESLint, Prettier, TypeScript, OpenAPI）を有効化
  - **フォローアップ**: Task26 で手動型アサーションを排除済み
  - \_要件: 6

- [x] 10.2. Kiro IDE自動修正後の問題修正
  - Windows環境でのpackage.jsonコマンド互換性修正（cross-env使用）
  - health/page.tsxのSSR問題修正（絶対URLでのAPI呼び出し）
  - 型チェックとビルドの動作確認
  - 開発環境での動作テスト
  - _要件: 1.1, 9.1_

- [x] 11. CI/CD 基盤の構築
  - GitHub Actions ワークフローの作成
  - BACKEND_MODE=monolith|service の両方でのビルド・テスト
  - @redocly/cli による OpenAPI Lint と Breaking Change 検知
  - 生成後 git diff --exit-code 失敗による契約 → 生成物ズレの自動検知
  - Wrangler によるデプロイ設定と wrangler secret 投入手順
  - PR 環境（preview）/本番（production）の切替基準とロールバック手順（直前タグ再デプロイ）
  - **TODO: orval の型問題解決後、.husky/pre-commit の lint-staged を再有効化**
  - **解決済み**: Windows環境でのシンボリックリンク権限エラー（`pnpm build:dev`で回避可能）
  - _要件: 3.1, 3.2, 3.3_

- [x] 12. フェーズ 1 テストの実装
  - Core 層ヘルスチェックサービスの単体テスト
  - BFF 層ヘルスチェックサービスの単体テスト
  - /api/health の API 契約テスト
  - /health ページの SSR テスト
  - Vitest テスト環境の設定
  - **修正完了**:
    - BFF層health-serviceモジュールのパス解決問題を修正 ✅
    - ErrorBoundaryのリセット機能テストを修正 ✅
    - 既存の失敗テスト6件を修正 ✅
  - _要件: 10.1_

- [x] 12.1. Service モード最小疎通テスト
  - BACKEND_MODE=service でヘルスチェックの外部呼び出し実装
  - 将来分離の土台を MVP で検証
  - monolith/service 両モードでの動作確認
  - _要件: 境界設計ポリシー（2 モード切替）_

- [x] 12.2. コード生成とプレコミットフックの修正
  - orval設定でTypeScript型アサーションを自動生成するよう修正
  - 生成されたファイルの型安全性を保証
  - プレコミットフック（generate:check）を再有効化
  - 継続的インテグレーションでの型チェック確保
  - **問題**: 現在orvalが型アサーションを削除してしまうため、pre-commitフックが失敗
  - **解決策**: orval設定の調整またはpost-generation処理の追加
  - _要件: 6.1, 6.2_

- [x] 13. Supabase 認証基盤の設定
  - Supabase プロジェクトの設定と OAuth 設定
  - @supabase/ssr パッケージの設定
  - SupabaseAdapter に認証機能を追加
  - 認証関連の環境変数設定
  - _要件: 4.2, 7.1_

- [x] 14. Next.js 認証ミドルウェアの実装
  - middleware.ts の実装
  - Supabase Auth Cookie によるセッション管理
  - /home ルートの認証保護
  - 未認証時のリダイレクト処理
  - _要件: 4.3, 4.4, 7.1_

- [x] 14.1 TypeScript型エラーの修正
  - client-error-boundary.tsx の window 型エラー修正
  - performance-monitor.ts の window 型エラー修正
  - tsconfig.json の DOM ライブラリ設定追加
  - 型チェック通過の確認
  - _要件: 技術的品質保証_

- [x] 14.2 Health API Route の型エラー修正
  - app/api/health/route.ts の result 型エラー修正
  - BFF層からの戻り値の型定義を明確化
  - result.success, result.data, result.error の型安全性確保
  - 型チェック通過の確認
  - _要件: 技術的品質保証_

- [x] 14.3 ESLint エラーの修正
  - middleware.test.ts の any 型警告修正（3箇所）
  - supabase-adapter.ts の any 型エラー修正（2箇所）
  - 適切な型定義の追加
  - lint-staged 通過の確認
  - _要件: 技術的品質保証_

- [x] 15. 認証 Route Handlers の実装
  - /auth/login/route.ts の実装
  - /auth/callback/route.ts の実装
  - /auth/logout/route.ts の実装
  - OpenAPI 契約への認証エンドポイント追加
  - _要件: 4.2, 4.5, 6.1_

- [x] 16. BFF 層認証サービスの実装
  - AuthService クラスの実装
  - OAuth 認証フローの処理
  - セッション管理とコールバック処理
  - 認証エラーハンドリング
  - _要件: 4.2, 4.5_

- [x] 16.1. ESLint エラーの修正とコミット準備
  - 未使用インポートの削除（AuthError, AuthProviderError等）
  - any型の適切な型定義への置換
  - Core層インターフェースの未使用パラメータ修正
  - lint-staged通過の確認
  - _要件: 技術的品質保証_

- [x] 17. トップページとログイン機能の実装
  - /page.tsx の実装（トップページ）
  - ログインボタンの実装
  - 認証状態による表示切替
  - Atlassian Design 参考の UI コンポーネント
  - _要件: 4.1_

- [x] 18. 認証必須ホームページの実装
  - /home/page.tsx の実装
  - 認証状態の確認とユーザー情報表示
  - ログアウト機能の実装
  - ベースレイアウトとナビゲーション
  - _要件: 4.4, 4.5_

- [ ] 19. ホームページのヘルスチェック機能実装
  - ヘルスチェック実行ボタンの実装
  - 生成 API クライアントを使用した/api/health 呼び出し
  - Loading 状態と再試行制御の実装
  - ヘルスチェック結果の表示（OK/Degraded/Down）
  - _要件: 5.1, 5.2, 5.3, 6.4_

- [ ] 20. 認証エラーハンドリングとユーザー体験の向上
  - 認証関連エラー状態の適切な表示
  - OAuth 拒否・中断時の戻り先処理
  - 期限切れ Cookie（部分セッション）の処理
  - /home 直リンク → ログイン → 元 URL 復帰（state/redirect 保持）
  - ネットワークエラー時の再試行機能
  - _要件: 5.3, 4.3_

- [ ] 21. フェーズ 2 認証機能のテスト実装
  - 認証フローの統合テスト（トップ → ログイン → ホーム → ログアウト）
  - 認証エッジケースの E2E テスト（OAuth 拒否・中断時の戻り先、期限切れ Cookie（部分セッション）、/home 直リンク → ログイン → 元 URL 復帰）
  - ホームページヘルスチェック機能の E2E テスト
  - 認証ミドルウェアのテスト
  - OpenAPI 契約テスト（認証エンドポイント）
  - _要件: 10.2, 10.3, 10.4_

- [ ] 22. パフォーマンス最適化と監視
  - /api/health の p95 < 300ms 目標達成のための最適化
  - p95 測定手順の確定（autocannon/k6 で/api/health の p95<300ms を CI or ローカルで検証）
  - ログ出力の構造化と trace_id 付与
  - PII とシークレットの redact 設定
  - パフォーマンス監視の実装
  - _要件: 非機能要件（性能、セキュリティ）_

- [ ] 23. 最終統合テストとデプロイ準備
  - 全機能の統合テスト実行
  - monolith/service モード両方での動作確認
  - Cloudflare Workers 環境での動作テスト
  - 本番デプロイ用の Secrets 設定
  - ロールバック手順の確認（直前タグへの再デプロイ）
  - _要件: 3.2, 3.3_

- [ ] 24. ドキュメント整備と Renovate 設定
  - README.md の作成（開発手順、デプロイ手順）
  - API 仕様書の生成とホスティング設定
  - Renovate 設定（minor 自動、major PR）
  - 開発者向けドキュメントの整備
  - _要件: 3.4_

- [x] 25. 先送り問題の解決とクリーンアップ
  - **ErrorBoundary の SSR 対応**: レイアウトから一時的に削除したErrorBoundaryをクライアントサイドで有効化
  - **型安全性の向上**: BFF層とCore層のインターフェース統一（現在は互換性のためラッパーを使用）
  - **ESLint設定の厳格化**: 現在`any`の使用を全面許可しているが、テストファイルのみに制限し、適切な型定義を追加
  - **テスト型定義の改善**: モックオブジェクトに適切な型定義を追加（現在は`any`で妥協）
  - **パフォーマンス測定の本格化**: 現在は基本実装のみ、本格的な監視とアラート機能の追加
  - **Windows開発環境の改善**: ~~シンボリックリンク権限問題の解決またはワークアラウンド~~ ✅ 解決済み
  - **テストカバレッジの向上**: 現在は基本的なテストのみ、エッジケースとエラーハンドリングの網羅
  - **テスト修正**: タスク9で発見したBFF層モジュール解決問題とErrorBoundaryリセット機能の修正
  - **実施タイミング**: フェーズ1完了後（タスク12.1後）またはフェーズ2完了後（タスク21後）の品質向上フェーズ
  - _要件: 品質向上、開発体験向上_

- [x] 26. orval 生成クライアントの型アサーション問題の修正
  - packages/generated/src/orval-fetcher.ts を追加し、共通 mutator で JSON を `{ status, data }` 形式に正規化
  - orval.config.ts に mutator / clean 設定と Prettier・ESLint フックを追加し、生成物の整形と検証を自動化
  - scripts/fix-generated-types.js を撤廃し、`pnpm generate` 後の手動修正フローを解消
  - 生成クライアントを利用する既存コード（BFF/フロント）で追従動作を確認し、追加の型アサーションが不要なことを検証
  - _要件: 6.2, 6.3_
