import { describe, it, expect } from 'vitest';

import { LoggerAdapter, LoggerConfig } from '../logger/logger-adapter';

describe('LoggerAdapter', () => {
  describe('constructor', () => {
    it('should create adapter with default config', () => {
      const adapter = new LoggerAdapter();
      expect(adapter).toBeInstanceOf(LoggerAdapter);
    });

    it('should create adapter with custom config', () => {
      const config: LoggerConfig = {
        level: 'debug',
        isDevelopment: false,
        redactFields: ['password', 'token'],
      };

      const customAdapter = new LoggerAdapter(config);
      expect(customAdapter).toBeInstanceOf(LoggerAdapter);
    });

    it('should create adapter with development config', () => {
      const config: LoggerConfig = {
        level: 'debug',
        isDevelopment: true, // 開発環境設定もテスト
        redactFields: ['password', 'token'],
      };

      const customAdapter = new LoggerAdapter(config);
      expect(customAdapter).toBeInstanceOf(LoggerAdapter);
    });
  });

  describe('logging methods', () => {
    it('should have all logging methods', () => {
      const adapter = new LoggerAdapter();

      expect(typeof adapter.trace).toBe('function');
      expect(typeof adapter.debug).toBe('function');
      expect(typeof adapter.info).toBe('function');
      expect(typeof adapter.warn).toBe('function');
      expect(typeof adapter.error).toBe('function');
      expect(typeof adapter.fatal).toBe('function');
    });

    it('should not throw when calling logging methods', () => {
      const adapter = new LoggerAdapter();

      expect(() => adapter.trace('test message')).not.toThrow();
      expect(() => adapter.debug('debug message')).not.toThrow();
      expect(() => adapter.info('info message')).not.toThrow();
      expect(() => adapter.warn('warn message')).not.toThrow();
      expect(() => adapter.error('error message')).not.toThrow();
      expect(() => adapter.fatal('fatal message')).not.toThrow();
    });

    it('should handle object and message parameters', () => {
      const adapter = new LoggerAdapter();
      const obj = { traceId: '123' };

      expect(() => adapter.trace(obj, 'test message')).not.toThrow();
      expect(() => adapter.info(obj, 'info message')).not.toThrow();
    });
  });

  describe('child logger', () => {
    it('should create child logger with bindings', () => {
      const adapter = new LoggerAdapter();
      const bindings = { traceId: '123', userId: 'user1' };
      const childLogger = adapter.child(bindings);

      expect(childLogger).toBeInstanceOf(LoggerAdapter);
    });

    it('should create child logger with traceId', () => {
      const adapter = new LoggerAdapter();
      const traceId = 'abc123def456';
      const childLogger = adapter.withTraceId(traceId);

      expect(childLogger).toBeInstanceOf(LoggerAdapter);
    });
  });

  describe('getPinoInstance', () => {
    it('should return pino instance', () => {
      const adapter = new LoggerAdapter();
      const pinoInstance = adapter.getPinoInstance();

      expect(pinoInstance).toBeDefined();
      expect(typeof pinoInstance.info).toBe('function');
    });
  });
});
