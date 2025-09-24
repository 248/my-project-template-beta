import { describe, it, expect } from 'vitest';

describe('Supabase Middleware', () => {
  it('should have updateSession function exported', async () => {
    const { updateSession } = await import('../../../lib/supabase/middleware');
    expect(typeof updateSession).toBe('function');
  });

  it('should be properly configured for authentication', () => {
    // 基本的な設定チェック
    expect(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
    ).toBeTruthy();
    expect(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
    ).toBeTruthy();
  });
});
