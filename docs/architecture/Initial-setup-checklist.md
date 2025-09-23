# 立ち上げ初期チェックリスト（Template Beta / OpenNext × Cloudflare × Supabase）

## 1. ガバナンス／変更管理

* [ ] main ブランチ直コミット禁止、レビュー2件必須、CI必須パス、強制プッシュ禁止
* [ ] Conventional Commits + changesets を導入
* [ ] OpenAPI の breaking-change チェックを CI に組み込み

## 2. セキュリティ初期設定

* [ ] Wrangler Secrets による一元管理（prod/preview 用途別キー）
* [ ] gitleaks/trufflehog による Secret スキャン
* [ ] CSP (Report-Only), HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy を有効化
* [ ] /auth, /api に IP+ユーザ単位のレート制限（KV ベースで最小限）
* [ ] 認証・管理操作は pino の別ストリームに監査ログ

## 3. 信頼性／運用

* [ ] SLO 定義: /api/health p95<300ms、エラー率<1%
* [ ] アラート: SLO逸脱、5xx急増、Auth失敗率、Queue滞留
* [ ] trace\_id を全リクエストに発行し、レスポンスヘッダへ返却
* [ ] インシデント板テンプレを docs に配置
* [ ] Supabase バックアップとリストア手順を検証

## 4. DX（開発体験）

* [ ] Node 22、Wrangler compatibility\_date 固定
* [ ] ESLint + Prettier + import整形、lint-staged+pre-commit
* [ ] Renovate 導入（minor 自動、major は PR）
* [ ] `pnpm dev` で wrangler dev + OpenAPI 生成チェック
* [ ] CI matrix で BACKEND\_MODE=monolith|service を両方検証

## 5. データ／プライバシ

* [ ] RLS ポリシー: deny-all → public/owner の2本を最初に用意
* [ ] PII/秘匿情報のログ禁止項目を docs に明記（pino redact）
* [ ] DDL マイグレーション方針: 追加系優先、削除は deprecate 後

## 6. パフォーマンス初期値

* [ ] TTFB p95 < 300ms / HTML重量上限 / APIレスポンス256KB上限
* [ ] KV/HTTP キャッシュ鍵の設計ルールを明記
* [ ] 画像は署名URL直アップロードを基本とする

## 7. 観測の初手

* [ ] Workers Logs → Logpush を有効化
* [ ] ダッシュボード雛形（p95/p99, RPS, 5xx, Auth失敗率）を準備

## 8. ドキュメント／オンボーディング

* [ ] 5分セットアップガイドを docs/architecture に作成
* [ ] 運用Runbook（デプロイ・ロールバック手順）を作成
* [ ] ADR（OpenNext, Supabase, pino, OpenAPI-First）を docs/adr に1件ずつ作成

## 9. 将来分離に効く“いまやる”小技

* [ ] apiClient adapter を direct/http で先行作成
* [ ] Route Handler にロジックを入れないルールを lint/PRテンプレに明記
* [ ] OpenAPI の契約→生成→実装を /health, /session/me から徹底
