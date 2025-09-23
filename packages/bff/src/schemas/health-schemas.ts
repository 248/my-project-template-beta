/**
 * ヘルスチェック関連のZodバリデーションスキーマ
 */

import { z } from 'zod';

/**
 * サービスヘルス状態のスキーマ
 */
export const ServiceHealthStatusSchema = z.enum(['up', 'down']);

/**
 * システム全体ヘルス状態のスキーマ
 */
export const SystemStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);

/**
 * 個別サービスヘルス情報のスキーマ
 */
export const ServiceHealthSchema = z.object({
  name: z.string().min(1, 'サービス名は必須です'),
  status: ServiceHealthStatusSchema,
  responseTime: z
    .number()
    .min(0, 'レスポンス時間は0以上である必要があります')
    .optional(),
  error: z.string().optional(),
});

/**
 * ヘルスチェック応答のスキーマ
 */
export const HealthResponseSchema = z.object({
  status: SystemStatusSchema,
  timestamp: z.string().datetime('無効な日時形式です'),
  services: z.array(ServiceHealthSchema),
  traceId: z.string().min(1, 'traceIdは必須です'),
});

/**
 * エラー詳細のスキーマ
 */
export const ErrorDetailSchema = z.object({
  code: z.string().min(1, 'エラーコードは必須です'),
  message: z.string().min(1, 'エラーメッセージは必須です'),
  details: z.record(z.any()).optional(),
});

/**
 * エラー応答のスキーマ
 */
export const ErrorResponseSchema = z.object({
  error: ErrorDetailSchema,
  traceId: z.string().min(1, 'traceIdは必須です'),
});

/**
 * 型推論用のエクスポート
 */
export type ServiceHealthStatus = z.infer<typeof ServiceHealthStatusSchema>;
export type SystemStatus = z.infer<typeof SystemStatusSchema>;
export type ServiceHealthData = z.infer<typeof ServiceHealthSchema>;
export type HealthResponseData = z.infer<typeof HealthResponseSchema>;
export type ErrorDetailData = z.infer<typeof ErrorDetailSchema>;
export type ErrorResponseData = z.infer<typeof ErrorResponseSchema>;
