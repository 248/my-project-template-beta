/**
 * BFF層の認証関連スキーマ定義
 */

import { z } from 'zod';

/**
 * OAuth認証プロバイダーのスキーマ
 */
export const AuthProviderSchema = z.enum(['google', 'github', 'discord']);

/**
 * ログインリクエストのスキーマ
 */
export const LoginRequestSchema = z.object({
  provider: AuthProviderSchema,
  redirectTo: z.string().url().optional(),
});

/**
 * 認証レスポンスのスキーマ
 */
export const AuthResponseSchema = z.object({
  data: z.object({
    url: z.string().url(),
  }),
  traceId: z.string(),
});

/**
 * コールバックリクエストのスキーマ
 */
export const CallbackRequestSchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
});

/**
 * ログアウトレスポンスのスキーマ
 */
export const LogoutResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  traceId: z.string(),
});

/**
 * セッション情報のスキーマ
 */
export const SessionSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email().optional(),
    user_metadata: z.record(z.any()).optional(),
  }),
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_at: z.number().optional(),
});

// 型エクスポート
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type AuthResponseData = z.infer<typeof AuthResponseSchema>;
export type CallbackRequest = z.infer<typeof CallbackRequestSchema>;
export type LogoutResponseData = z.infer<typeof LogoutResponseSchema>;
export type SessionData = z.infer<typeof SessionSchema>;
