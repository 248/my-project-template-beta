import { describe, it, expect } from 'vitest';
import { ConfigAdapter } from '../config/config-adapter';

describe('ConfigAdapter', () => {
  const validEnv = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    LOG_LEVEL: 'debug',
    NODE_ENV: 'development',
    DEFAULT_TIMEOUT_MS: '3000',
    MAX_RETRY_ATTEMPTS: '3',
    RETRY_BASE_DELAY_MS: '500',
    RETRY_MAX_DELAY_MS: '5000',
    BACKEND_MODE: 'monolith',
  };

  describe('constructor', () => {
    it('should create adapter with valid environment', () => {
      const adapter = new ConfigAdapter(validEnv);
      expect(adapter).toBeInstanceOf(ConfigAdapter);
    });

    it('should throw error with invalid SUPABASE_URL', () => {
      const invalidEnv = { ...validEnv, SUPABASE_URL: 'invalid-url' };
      expect(() => new ConfigAdapter(invalidEnv)).toThrow();
    });

    it('should use default values for optional fields', () => {
      const minimalEnv = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
      };
      const adapter = new ConfigAdapter(minimalEnv);
      expect(adapter.getTimeoutMs()).toBe(5000); // default
    });
  });

  describe('getSupabaseConfig', () => {
    it('should return Supabase configuration', () => {
      const adapter = new ConfigAdapter(validEnv);
      const config = adapter.getSupabaseConfig();

      expect(config).toEqual({
        url: 'https://test.supabase.co',
        anonKey: 'test-anon-key',
        serviceRoleKey: 'test-service-role-key',
      });
    });
  });

  describe('getLoggerConfig', () => {
    it('should return Logger configuration', () => {
      const adapter = new ConfigAdapter(validEnv);
      const config = adapter.getLoggerConfig();

      expect(config).toEqual({
        level: 'debug',
        isDevelopment: true,
      });
    });

    it('should detect production environment', () => {
      const prodEnv = { ...validEnv, NODE_ENV: 'production' };
      const adapter = new ConfigAdapter(prodEnv);
      const config = adapter.getLoggerConfig();

      expect(config.isDevelopment).toBe(false);
    });
  });

  describe('getTimeoutMs', () => {
    it('should return configured timeout', () => {
      const adapter = new ConfigAdapter(validEnv);
      expect(adapter.getTimeoutMs()).toBe(3000);
    });

    it('should parse string timeout to number', () => {
      const envWithStringTimeout = { ...validEnv, DEFAULT_TIMEOUT_MS: '7500' };
      const adapter = new ConfigAdapter(envWithStringTimeout);
      expect(adapter.getTimeoutMs()).toBe(7500);
    });
  });

  describe('getRetryPolicy', () => {
    it('should return retry policy configuration', () => {
      const adapter = new ConfigAdapter(validEnv);
      const policy = adapter.getRetryPolicy();

      expect(policy).toEqual({
        maxAttempts: 3,
        baseDelayMs: 500,
        maxDelayMs: 5000,
        jitterFactor: 0.1,
      });
    });
  });

  describe('getBackendMode', () => {
    it('should return monolith mode', () => {
      const adapter = new ConfigAdapter(validEnv);
      expect(adapter.getBackendMode()).toBe('monolith');
    });

    it('should return service mode', () => {
      const serviceEnv = { ...validEnv, BACKEND_MODE: 'service' };
      const adapter = new ConfigAdapter(serviceEnv);
      expect(adapter.getBackendMode()).toBe('service');
    });
  });

  describe('environment detection', () => {
    it('should detect development environment', () => {
      const adapter = new ConfigAdapter(validEnv);
      expect(adapter.isDevelopment()).toBe(true);
      expect(adapter.isProduction()).toBe(false);
      expect(adapter.isTest()).toBe(false);
    });

    it('should detect production environment', () => {
      const prodEnv = { ...validEnv, NODE_ENV: 'production' };
      const adapter = new ConfigAdapter(prodEnv);
      expect(adapter.isDevelopment()).toBe(false);
      expect(adapter.isProduction()).toBe(true);
      expect(adapter.isTest()).toBe(false);
    });

    it('should detect test environment', () => {
      const testEnv = { ...validEnv, NODE_ENV: 'test' };
      const adapter = new ConfigAdapter(testEnv);
      expect(adapter.isDevelopment()).toBe(false);
      expect(adapter.isProduction()).toBe(false);
      expect(adapter.isTest()).toBe(true);
    });
  });

  describe('getAllConfig', () => {
    it('should return all configuration', () => {
      const adapter = new ConfigAdapter(validEnv);
      const config = adapter.getAllConfig();

      expect(config.SUPABASE_URL).toBe('https://test.supabase.co');
      expect(config.LOG_LEVEL).toBe('debug');
      expect(config.DEFAULT_TIMEOUT_MS).toBe(3000);
    });
  });
});