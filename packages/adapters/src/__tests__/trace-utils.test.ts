import { describe, it, expect } from 'vitest';

import {
  generateTraceId,
  isValidTraceId,
  extractTraceIdFromHeaders,
  createTraceHeaders,
} from '../utils/trace-utils';

describe('trace-utils', () => {
  describe('generateTraceId', () => {
    it('should generate a 32-character hex string', () => {
      const traceId = generateTraceId();
      expect(traceId).toMatch(/^[a-f0-9]{32}$/);
      expect(traceId).toHaveLength(32);
    });

    it('should generate unique trace IDs', () => {
      const traceId1 = generateTraceId();
      const traceId2 = generateTraceId();
      expect(traceId1).not.toBe(traceId2);
    });
  });

  describe('isValidTraceId', () => {
    it('should return true for valid trace ID', () => {
      const validTraceId = 'a1b2c3d4e5f6789012345678901234ab';
      expect(isValidTraceId(validTraceId)).toBe(true);
    });

    it('should return false for invalid trace ID - wrong length', () => {
      const shortTraceId = 'a1b2c3d4e5f6789012345678901234a';
      const longTraceId = 'a1b2c3d4e5f6789012345678901234abc';

      expect(isValidTraceId(shortTraceId)).toBe(false);
      expect(isValidTraceId(longTraceId)).toBe(false);
    });

    it('should return false for invalid trace ID - invalid characters', () => {
      const invalidTraceId = 'g1b2c3d4e5f6789012345678901234ab'; // 'g' is not hex
      expect(isValidTraceId(invalidTraceId)).toBe(false);
    });

    it('should return false for uppercase hex characters', () => {
      const uppercaseTraceId = 'A1B2C3D4E5F6789012345678901234AB';
      expect(isValidTraceId(uppercaseTraceId)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidTraceId('')).toBe(false);
    });
  });

  describe('extractTraceIdFromHeaders', () => {
    it('should extract trace ID from X-Trace-Id header', () => {
      const traceId = 'a1b2c3d4e5f6789012345678901234ab';
      const headers = {
        'X-Trace-Id': traceId,
        'Content-Type': 'application/json',
      };

      const extracted = extractTraceIdFromHeaders(headers);
      expect(extracted).toBe(traceId);
    });

    it('should extract trace ID from lowercase x-trace-id header', () => {
      const traceId = 'a1b2c3d4e5f6789012345678901234ab';
      const headers = {
        'x-trace-id': traceId,
        'content-type': 'application/json',
      };

      const extracted = extractTraceIdFromHeaders(headers);
      expect(extracted).toBe(traceId);
    });

    it('should return undefined when header is missing', () => {
      const headers = {
        'Content-Type': 'application/json',
      };

      const extracted = extractTraceIdFromHeaders(headers);
      expect(extracted).toBeUndefined();
    });

    it('should return undefined when trace ID is invalid', () => {
      const headers = {
        'X-Trace-Id': 'invalid-trace-id',
      };

      const extracted = extractTraceIdFromHeaders(headers);
      expect(extracted).toBeUndefined();
    });

    it('should return undefined when header value is undefined', () => {
      const headers = {
        'X-Trace-Id': undefined,
      };

      const extracted = extractTraceIdFromHeaders(headers);
      expect(extracted).toBeUndefined();
    });
  });

  describe('createTraceHeaders', () => {
    it('should create headers object with trace ID', () => {
      const traceId = 'a1b2c3d4e5f6789012345678901234ab';
      const headers = createTraceHeaders(traceId);

      expect(headers).toEqual({
        'X-Trace-Id': traceId,
      });
    });

    it('should work with any string (validation is caller responsibility)', () => {
      const invalidTraceId = 'invalid-trace-id';
      const headers = createTraceHeaders(invalidTraceId);

      expect(headers).toEqual({
        'X-Trace-Id': invalidTraceId,
      });
    });
  });
});
