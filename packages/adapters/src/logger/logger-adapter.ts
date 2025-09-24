import pino from 'pino';
import { z } from 'zod';

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
  redactFields: z
    .array(z.string())
    .default([
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'apiKey',
      'serviceRoleKey',
    ]),
});

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;

// ログコンテキスト
export interface LogContext {
  traceId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export class LoggerAdapter {
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
