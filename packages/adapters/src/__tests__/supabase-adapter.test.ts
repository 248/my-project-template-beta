import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SupabaseAdapter, SupabaseConfig } from '../supabase/supabase-adapter';

// Supabaseクライアントをモック
const mockClient = {
  rpc: vi.fn(),
  auth: {
    signInWithOAuth: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    getSession: vi.fn(),
    signOut: vi.fn(),
  },
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockClient),
}));

describe('SupabaseAdapter', () => {
  let adapter: SupabaseAdapter;
  let mockConfig: SupabaseConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      serviceRoleKey: 'test-service-role-key',
    };

    adapter = new SupabaseAdapter(mockConfig);
  });

  describe('constructor', () => {
    it('should create adapter with valid config', () => {
      expect(adapter).toBeInstanceOf(SupabaseAdapter);
    });

    it('should throw error with invalid config', () => {
      expect(() => {
        new SupabaseAdapter({
          url: 'invalid-url',
          anonKey: '',
        } as SupabaseConfig);
      }).toThrow();
    });
  });

  describe('checkConnection', () => {
    it('should return connected status when RPC succeeds', async () => {
      mockClient.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await adapter.checkConnection();

      expect(result.isConnected).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return disconnected status when RPC fails', async () => {
      const mockError = new Error('Connection failed');
      mockClient.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({ error: mockError }),
      });

      const result = await adapter.checkConnection();

      expect(result.isConnected).toBe(false);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBe(mockError.message);
    });

    it('should handle exceptions during connection check', async () => {
      mockClient.rpc.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await adapter.checkConnection();

      expect(result.isConnected).toBe(false);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBe('Network error');
    });
  });

  describe('authentication methods', () => {
    it('should call signInWithOAuth with correct parameters', async () => {
      const mockResponse = { data: { url: 'https://oauth.url' }, error: null };
      mockClient.auth.signInWithOAuth.mockResolvedValue(mockResponse);

      const result = await adapter.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://app.com/callback' },
      });

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'https://app.com/callback' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should exchange code for session', async () => {
      const mockResponse = { data: { session: {} }, error: null };
      mockClient.auth.exchangeCodeForSession.mockResolvedValue(mockResponse);

      const result = await adapter.exchangeCodeForSession('auth-code');

      expect(mockClient.auth.exchangeCodeForSession).toHaveBeenCalledWith(
        'auth-code'
      );
      expect(result).toEqual(mockResponse);
    });

    it('should get current session', async () => {
      const mockResponse = { data: { session: {} }, error: null };
      mockClient.auth.getSession.mockResolvedValue(mockResponse);

      const result = await adapter.getSession();

      expect(mockClient.auth.getSession).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should sign out user', async () => {
      const mockResponse = { error: null };
      mockClient.auth.signOut.mockResolvedValue(mockResponse);

      const result = await adapter.signOut();

      expect(mockClient.auth.signOut).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getClient', () => {
    it('should return Supabase client instance', () => {
      const client = adapter.getClient();
      expect(client).toBe(mockClient);
    });
  });
});
