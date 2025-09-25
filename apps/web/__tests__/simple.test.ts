/**
 * 簡単なテスト（動作確認用）
 */

describe('Simple Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have correct environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
