import { describe, it, expect, vi } from 'vitest';

import { AdapterFactory } from '../adapter-factory';
import { ConfigAdapter } from '../config/config-adapter';
import { LoggerAdapter } from '../logger/logger-adapter';
import { SupabaseAdapter } from '../supabase/supabase-adapter';

// 依存関係をモック
vi.mock('../config/config-adapter');
vi.mock('../logger/logger-adapter');
vi.mock('../supabase/supabase-adapter');

describe('AdapterFactory', () => {
  const mockEnv = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    LOG_LEVEL: 'info',
    NODE_ENV: 'development',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize all adapters', () => {
      const factory = new AdapterFactory(mockEnv);

      expect(ConfigAdapter).toHaveBeenCalledWith(mockEnv);
      expect(LoggerAdapter).toHaveBeenCalled();
      expect(SupabaseAdapter).toHaveBeenCalled();
    });

    it('should use process.env when no env provided', () => {
      const factory = new AdapterFactory();

      expect(ConfigAdapter).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getter methods', () => {
    let factory: AdapterFactory;
    let mockConfigAdapter: any;
    let mockLoggerAdapter: any;
    let mockSupabaseAdapter: any;

    beforeEach(() => {
      mockConfigAdapter = {
        getLoggerConfig: vi
          .fn()
          .mockReturnValue({ level: 'info', isDevelopment: true }),
        getSupabaseConfig: vi
          .fn()
          .mockReturnValue({ url: 'test', anonKey: 'test' }),
      };
      mockLoggerAdapter = {
        withTraceId: vi.fn().mockReturnValue('child-logger'),
      };
      mockSupabaseAdapter = {};

      (ConfigAdapter as any).mockImplementation(() => mockConfigAdapter);
      (LoggerAdapter as any).mockImplementation(() => mockLoggerAdapter);
      (SupabaseAdapter as any).mockImplementation(() => mockSupabaseAdapter);

      factory = new AdapterFactory(mockEnv);
    });

    it('should return config adapter', () => {
      const config = factory.getConfigAdapter();
      expect(config).toBe(mockConfigAdapter);
    });

    it('should return logger adapter', () => {
      const logger = factory.getLoggerAdapter();
      expect(logger).toBe(mockLoggerAdapter);
    });

    it('should return supabase adapter', () => {
      const supabase = factory.getSupabaseAdapter();
      expect(supabase).toBe(mockSupabaseAdapter);
    });

    it('should return logger with trace ID', () => {
      const traceId = 'test-trace-id';
      const loggerWithTrace = factory.getLoggerWithTraceId(traceId);

      expect(mockLoggerAdapter.withTraceId).toHaveBeenCalledWith(traceId);
      expect(loggerWithTrace).toBe('child-logger');
    });

    it('should return all adapters', () => {
      const adapters = factory.getAllAdapters();

      expect(adapters).toEqual({
        config: mockConfigAdapter,
        logger: mockLoggerAdapter,
        supabase: mockSupabaseAdapter,
      });
    });
  });
});
