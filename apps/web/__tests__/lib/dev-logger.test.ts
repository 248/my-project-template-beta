import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { DevLogger, type DevLoggerConfig } from '@/lib/utils/dev-logger';

describe('DevLogger', () => {
  let originalNodeEnv: string | undefined;
  let consoleSpy: {
    error: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;

    // コンソールメソッドをスパイ
    consoleSpy = {
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  describe('認証関連エラーの判定', () => {
    it('認証関連エラーメッセージを正しく識別する', () => {
      const logger = new DevLogger();

      const authErrors = [
        'Auth session missing',
        'session_not_found',
        'Invalid JWT',
        'refresh_token_not_found',
        'No session found',
        'JWT expired',
      ];

      authErrors.forEach(errorMessage => {
        // プライベートメソッドのテストのため、リフレクションを使用
        const isAuthError = (
          logger as { isAuthRelatedError: (message: string) => boolean }
        ).isAuthRelatedError(errorMessage);
        expect(isAuthError).toBe(true);
      });
    });

    it('非認証関連エラーメッセージを正しく識別する', () => {
      const logger = new DevLogger();

      const nonAuthErrors = [
        'Network error',
        'Database connection failed',
        'Internal server error',
        'Validation failed',
      ];

      nonAuthErrors.forEach(errorMessage => {
        const isAuthError = (
          logger as { isAuthRelatedError: (message: string) => boolean }
        ).isAuthRelatedError(errorMessage);
        expect(isAuthError).toBe(false);
      });
    });
  });

  describe('開発環境でのログ抑制', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('開発環境で認証エラーのログを抑制する', () => {
      const logger = new DevLogger({
        suppressAuthErrors: true,
      });

      logger.logMiddlewareError('Auth session missing', {
        path: '/home',
        isProtectedPath: true,
        isAuthPath: false,
      });

      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('開発環境で非保護パスのミドルウェアエラーを抑制する', () => {
      const logger = new DevLogger({
        suppressMiddlewareErrors: true,
      });

      logger.logMiddlewareError('Some error', {
        path: '/',
        isProtectedPath: false,
        isAuthPath: false,
      });

      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('開発環境で保護パスの非認証エラーはログ出力する', () => {
      const logger = new DevLogger({
        suppressAuthErrors: true,
        suppressMiddlewareErrors: false,
      });

      logger.logMiddlewareError('Database error', {
        path: '/home',
        isProtectedPath: true,
        isAuthPath: false,
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[MIDDLEWARE_SESSION_ERROR]',
        expect.objectContaining({
          error: 'Database error',
          path: '/home',
          isProtectedPath: true,
          isAuthPath: false,
        })
      );
    });
  });

  describe('本番環境でのログ出力', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('本番環境では全てのエラーをログ出力する', () => {
      const logger = new DevLogger();

      logger.logMiddlewareError('Auth session missing', {
        path: '/home',
        isProtectedPath: true,
        isAuthPath: false,
      });

      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[MIDDLEWARE_SESSION_ERROR]',
        expect.objectContaining({
          error: 'Auth session missing',
          environment: 'production',
        })
      );
    });
  });

  describe('開発情報ログ', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('開発環境で情報ログを出力する', () => {
      const logger = new DevLogger({ logLevel: 'info' });

      logger.logDevInfo('テスト情報', { test: 'data' });

      expect(consoleSpy.info).toHaveBeenCalledWith('[DEV_INFO]', 'テスト情報', {
        test: 'data',
      });
    });

    it('ログレベルがsilentの場合は情報ログを出力しない', () => {
      const logger = new DevLogger({ logLevel: 'silent' });

      logger.logDevInfo('テスト情報');

      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it('本番環境では情報ログを出力しない', () => {
      process.env.NODE_ENV = 'production';
      const logger = new DevLogger({ logLevel: 'info' });

      logger.logDevInfo('テスト情報');

      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });

  describe('開発警告ログ', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('開発環境で警告ログを出力する', () => {
      const logger = new DevLogger({ logLevel: 'warn' });

      logger.logDevWarning('テスト警告', { warning: 'data' });

      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[DEV_WARNING]',
        'テスト警告',
        { warning: 'data' }
      );
    });

    it('ログレベルがerrorの場合は警告ログを出力しない', () => {
      const logger = new DevLogger({ logLevel: 'error' });

      logger.logDevWarning('テスト警告');

      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });
  });

  describe('開発デバッグログ', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('ログレベルがdebugの場合はデバッグログを出力する', () => {
      const logger = new DevLogger({ logLevel: 'debug' });

      logger.logDevDebug('テストデバッグ', { debug: 'data' });

      expect(consoleSpy.debug).toHaveBeenCalledWith(
        '[DEV_DEBUG]',
        'テストデバッグ',
        { debug: 'data' }
      );
    });

    it('ログレベルがinfo以下の場合はデバッグログを出力しない', () => {
      const logger = new DevLogger({ logLevel: 'info' });

      logger.logDevDebug('テストデバッグ');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  describe('設定のカスタマイズ', () => {
    it('デフォルト設定が正しく適用される', () => {
      const logger = new DevLogger();

      expect((logger as { config: DevLoggerConfig }).config).toEqual({
        suppressAuthErrors: true,
        suppressMiddlewareErrors: true,
        logLevel: 'info',
      });
    });

    it('カスタム設定が正しく適用される', () => {
      const customConfig = {
        suppressAuthErrors: false,
        suppressMiddlewareErrors: false,
        logLevel: 'debug' as const,
      };

      const logger = new DevLogger(customConfig);

      expect((logger as { config: DevLoggerConfig }).config).toEqual(
        customConfig
      );
    });
  });
});
