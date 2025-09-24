import pino from 'pino';
import { z } from 'zod';

import { LoggerInterface, LogContext } from '../interfaces/logger-interface';

// ログレベル設定
export const LogLevelSchema = z.enum([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

// Logger設定スキーマ
export const LoggerConfigSchema = z.object({
  level: LogLevelSchema.default('info'),
  isDevelopment: z.boolean().default(false),
  redactFields: z.array(z.string()).default([
    // 認証・認可関連
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'apiKey',
    'serviceRoleKey',
    'accessToken',
    'refreshToken',
    'jwt',
    'bearer',

    // PII (個人識別情報)
    'email',
    'phone',
    'phoneNumber',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'cardNumber',
    'cvv',
    'address',
    'zipCode',
    'postalCode',

    // Supabase関連
    'supabaseKey',
    'supabaseSecret',
    'databaseUrl',
    'connectionString',

    // その他のセンシティブ情報
    'privateKey',
    'publicKey',
    'signature',
    'hash',
    'salt',
  ]),
});

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;

export class LoggerAdapter implements LoggerInterface {
  private pino: pino.Logger;
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = LoggerConfigSchema.parse(config);
    this.pino = this.createLogger();
  }

  private createLogger(): pino.Logger {
    const pinoConfig: pino.LoggerOptions = {
      level: this.config.level,
      redact: {
        paths: this.config.redactFields,
        censor: '[REDACTED]',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: label => ({ level: label }),
        log: object => {
          // 構造化ログのためのフォーマット
          const formatted = { ...object };

          // traceIdを最上位に移動
          if (formatted.traceId) {
            const traceId = formatted.traceId;
            delete formatted.traceId;
            return { traceId, ...formatted };
          }

          return formatted;
        },
      },
      base: {
        // 基本情報を追加
        service: 'template-beta-cloudflare-supabase',
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    // 開発環境では pretty print を使用
    if (this.config.isDevelopment) {
      pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      };
    }

    return pino(pinoConfig);
  }

  /**
   * traceIdを含むchild loggerを作成
   */
  child(bindings: LogContext): LoggerAdapter {
    const childLogger = new LoggerAdapter(this.config);
    childLogger.pino = this.pino.child(bindings);
    return childLogger;
  }

  /**
   * traceIdを固定したchild loggerを作成
   */
  withTraceId(traceId: string): LoggerAdapter {
    return this.child({ traceId });
  }

  /**
   * ログレベル別のメソッド
   */
  trace(obj: LogContext | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.trace(obj);
    } else {
      this.pino.trace(obj, msg);
    }
  }

  debug(obj: LogContext | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.debug(obj);
    } else {
      this.pino.debug(obj, msg);
    }
  }

  info(obj: LogContext | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.info(obj);
    } else {
      this.pino.info(obj, msg);
    }
  }

  warn(obj: LogContext | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.warn(obj);
    } else {
      this.pino.warn(obj, msg);
    }
  }

  error(obj: LogContext | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.error(obj);
    } else {
      this.pino.error(obj, msg);
    }
  }

  fatal(obj: LogContext | string, msg?: string): void {
    if (typeof obj === 'string') {
      this.pino.fatal(obj);
    } else {
      this.pino.fatal(obj, msg);
    }
  }

  /**
   * 生のpinoインスタンスを取得（必要に応じて）
   */
  getPinoInstance(): pino.Logger {
    return this.pino;
  }
}
