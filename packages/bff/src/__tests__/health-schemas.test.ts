/**
 * ヘルスチェックスキーマのテスト
 */

import { describe, it, expect } from 'vitest';

import {
  ServiceHealthSchema,
  HealthResponseSchema,
  ErrorResponseSchema,
  ServiceHealthStatusSchema,
  SystemStatusSchema,
} from '../schemas/health-schemas';

describe('Health Schemas', () => {
  describe('ServiceHealthStatusSchema', () => {
    it('有効なステータスを受け入れるべき', () => {
      expect(() => ServiceHealthStatusSchema.parse('up')).not.toThrow();
      expect(() => ServiceHealthStatusSchema.parse('down')).not.toThrow();
    });

    it('無効なステータスを拒否すべき', () => {
      expect(() => ServiceHealthStatusSchema.parse('invalid')).toThrow();
      expect(() => ServiceHealthStatusSchema.parse('')).toThrow();
      expect(() => ServiceHealthStatusSchema.parse(null)).toThrow();
    });
  });

  describe('SystemStatusSchema', () => {
    it('有効なシステムステータスを受け入れるべき', () => {
      expect(() => SystemStatusSchema.parse('healthy')).not.toThrow();
      expect(() => SystemStatusSchema.parse('degraded')).not.toThrow();
      expect(() => SystemStatusSchema.parse('unhealthy')).not.toThrow();
    });

    it('無効なシステムステータスを拒否すべき', () => {
      expect(() => SystemStatusSchema.parse('invalid')).toThrow();
      expect(() => SystemStatusSchema.parse('')).toThrow();
    });
  });

  describe('ServiceHealthSchema', () => {
    it('有効なサービスヘルス情報を受け入れるべき', () => {
      const validServiceHealth = {
        name: 'supabase',
        status: 'up' as const,
        responseTime: 150,
        error: undefined,
      };

      expect(() => ServiceHealthSchema.parse(validServiceHealth)).not.toThrow();
    });

    it('必須フィールドが欠けている場合に拒否すべき', () => {
      expect(() => ServiceHealthSchema.parse({ status: 'up' })).toThrow();
      expect(() => ServiceHealthSchema.parse({ name: 'supabase' })).toThrow();
    });

    it('空のサービス名を拒否すべき', () => {
      const invalidServiceHealth = {
        name: '',
        status: 'up' as const,
      };

      expect(() => ServiceHealthSchema.parse(invalidServiceHealth)).toThrow();
    });

    it('負のレスポンス時間を拒否すべき', () => {
      const invalidServiceHealth = {
        name: 'supabase',
        status: 'up' as const,
        responseTime: -1,
      };

      expect(() => ServiceHealthSchema.parse(invalidServiceHealth)).toThrow();
    });

    it('オプションフィールドが省略されても受け入れるべき', () => {
      const minimalServiceHealth = {
        name: 'supabase',
        status: 'up' as const,
      };

      expect(() =>
        ServiceHealthSchema.parse(minimalServiceHealth)
      ).not.toThrow();
    });
  });

  describe('HealthResponseSchema', () => {
    it('有効なヘルスレスポンスを受け入れるべき', () => {
      const validHealthResponse = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00.000Z',
        services: [
          {
            name: 'supabase',
            status: 'up' as const,
            responseTime: 150,
          },
        ],
        traceId: 'test-trace-id',
      };

      expect(() =>
        HealthResponseSchema.parse(validHealthResponse)
      ).not.toThrow();
    });

    it('必須フィールドが欠けている場合に拒否すべき', () => {
      const incompleteResponse = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00.000Z',
        // services と traceId が欠けている
      };

      expect(() => HealthResponseSchema.parse(incompleteResponse)).toThrow();
    });

    it('無効な日時形式を拒否すべき', () => {
      const invalidTimestampResponse = {
        status: 'healthy' as const,
        timestamp: 'invalid-date',
        services: [],
        traceId: 'test-trace-id',
      };

      expect(() =>
        HealthResponseSchema.parse(invalidTimestampResponse)
      ).toThrow();
    });

    it('空のtraceIdを拒否すべき', () => {
      const emptyTraceIdResponse = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00.000Z',
        services: [],
        traceId: '',
      };

      expect(() => HealthResponseSchema.parse(emptyTraceIdResponse)).toThrow();
    });

    it('空のservices配列を受け入れるべき', () => {
      const emptyServicesResponse = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00.000Z',
        services: [],
        traceId: 'test-trace-id',
      };

      expect(() =>
        HealthResponseSchema.parse(emptyServicesResponse)
      ).not.toThrow();
    });
  });

  describe('ErrorResponseSchema', () => {
    it('有効なエラーレスポンスを受け入れるべき', () => {
      const validErrorResponse = {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error occurred',
          details: { reason: 'Database connection failed' },
        },
        traceId: 'test-trace-id',
      };

      expect(() => ErrorResponseSchema.parse(validErrorResponse)).not.toThrow();
    });

    it('detailsが省略されても受け入れるべき', () => {
      const minimalErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        },
        traceId: 'test-trace-id',
      };

      expect(() =>
        ErrorResponseSchema.parse(minimalErrorResponse)
      ).not.toThrow();
    });

    it('必須フィールドが欠けている場合に拒否すべき', () => {
      const incompleteErrorResponse = {
        error: {
          code: 'ERROR_CODE',
          // message が欠けている
        },
        traceId: 'test-trace-id',
      };

      expect(() =>
        ErrorResponseSchema.parse(incompleteErrorResponse)
      ).toThrow();
    });

    it('空のエラーコードを拒否すべき', () => {
      const emptyCodeResponse = {
        error: {
          code: '',
          message: 'Error message',
        },
        traceId: 'test-trace-id',
      };

      expect(() => ErrorResponseSchema.parse(emptyCodeResponse)).toThrow();
    });

    it('空のエラーメッセージを拒否すべき', () => {
      const emptyMessageResponse = {
        error: {
          code: 'ERROR_CODE',
          message: '',
        },
        traceId: 'test-trace-id',
      };

      expect(() => ErrorResponseSchema.parse(emptyMessageResponse)).toThrow();
    });
  });
});
